/**
 * SQLite 到 PostgreSQL 数据迁移脚本 (CommonJS 版本)
 *
 * 使用方法:
 *   node scripts/migrate-to-postgres.cjs
 */

const Database = require("better-sqlite3");
const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

// 由于 ES 模块导出问题，我们需要使用动态导入
async function main() {
  // 动态导入 schema
  const schemaModule = await import("../lib/db/schema/index.js");
  const {
    usersPg,
    semestersPg,
    gradesPg,
    classesPg,
    studentsPg,
    leaveRecordsPg,
    systemConfigPg,
    operationLogsPg,
    feeConfigsPg,
    backupRecordsPg,
    backupConfigPg,
  } = schemaModule;

  // Schema 对象
  const schema = {
    users: usersPg,
    semesters: semestersPg,
    grades: gradesPg,
    classes: classesPg,
    students: studentsPg,
    leaveRecords: leaveRecordsPg,
    systemConfig: systemConfigPg,
    operationLogs: operationLogsPg,
    feeConfigs: feeConfigsPg,
    backupRecords: backupRecordsPg,
    backupConfig: backupConfigPg,
  };

  // 表名映射（snake_case -> camelCase）
  const tableMapping = {
    users: "users",
    semesters: "semesters",
    grades: "grades",
    classes: "classes",
    students: "students",
    leave_records: "leaveRecords",
    system_config: "systemConfig",
    operation_logs: "operationLogs",
    fee_configs: "feeConfigs",
    backup_records: "backupRecords",
    backup_config: "backupConfig",
  };

  // 按依赖顺序迁移表
  const tables = [
    "users",
    "semesters",
    "grades",
    "classes",
    "students",
    "leave_records",
    "system_config",
    "operation_logs",
    "fee_configs",
    "backup_records",
    "backup_config",
  ];

  // 类型转换函数
  const transformers = {
    users: (row) => ({
      ...row,
      isActive: Boolean(row.is_active),
      passwordHash: row.password_hash,
      realName: row.real_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }),
    semesters: (row) => ({
      ...row,
      startDate: row.start_date,
      endDate: row.end_date,
      schoolDays: row.school_days,
      isCurrent: Boolean(row.is_current),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }),
    grades: (row) => ({
      ...row,
      semesterId: row.semester_id,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
    }),
    classes: (row) => ({
      ...row,
      semesterId: row.semester_id,
      gradeId: row.grade_id,
      classTeacherId: row.class_teacher_id,
      mealFee: String(row.meal_fee),
      studentCount: row.student_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }),
    students: (row) => ({
      ...row,
      studentNo: row.student_no,
      classId: row.class_id,
      birthDate: row.birth_date,
      parentName: row.parent_name,
      parentPhone: row.parent_phone,
      isNutritionMeal: Boolean(row.is_nutrition_meal),
      enrollmentDate: row.enrollment_date,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }),
    leave_records: (row) => ({
      ...row,
      studentId: row.student_id,
      semesterId: row.semester_id,
      applicantId: row.applicant_id,
      startDate: row.start_date,
      endDate: row.end_date,
      leaveDays: row.leave_days,
      reviewerId: row.reviewer_id,
      reviewTime: row.review_time ? new Date(row.review_time) : null,
      reviewRemark: row.review_remark,
      isRefund: Boolean(row.is_refund),
      refundAmount: row.refund_amount ? String(row.refund_amount) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }),
    system_config: (row) => ({
      ...row,
      configKey: row.config_key,
      configValue: row.config_value,
      updatedAt: new Date(row.updated_at),
    }),
    operation_logs: (row) => ({
      ...row,
      userId: row.user_id,
      ipAddress: row.ip_address,
      createdAt: new Date(row.created_at),
    }),
    fee_configs: (row) => ({
      ...row,
      classId: row.class_id,
      semesterId: row.semester_id,
      mealFeeStandard: String(row.meal_fee_standard),
      prepaidDays: row.prepaid_days,
      actualDays: row.actual_days,
      suspensionDays: row.suspension_days,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }),
    backup_records: (row) => ({
      ...row,
      filePath: row.file_path,
      fileSize: row.file_size,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
    }),
    backup_config: (row) => ({
      ...row,
      scheduleType: row.schedule_type,
      scheduleTime: row.schedule_time,
      backupType: row.backup_type,
      retentionDays: row.retention_days,
      updatedAt: new Date(row.updated_at),
    }),
  };

  /**
   * 创建备份
   */
  function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(process.cwd(), "data", "backups");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dbPath = path.join(process.cwd(), "data", "student_leave.db");
    const backupPath = path.join(backupDir, `pre-migration-${timestamp}.db`);

    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ 备份已创建: ${backupPath}`);

    return backupPath;
  }

  /**
   * 迁移单个表
   */
  async function migrateTable(sqliteDb, pgDrizzle, pgClient, tableName) {
    const errors = [];
    let migrated = 0;

    try {
      // 读取 SQLite 数据
      const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();

      if (rows.length === 0) {
        console.log(`  ⚠️  表 ${tableName} 没有数据`);
        return { table: tableName, rowsMigrated: 0, errors: [] };
      }

      // 获取对应的 schema 表名
      const schemaTableName = tableMapping[tableName];
      if (!schemaTableName) {
        throw new Error(`未找到表 ${tableName} 的 schema 映射`);
      }

      const pgTable = schema[schemaTableName];

      // 批量插入（每批 100 条）
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        for (const row of batch) {
          try {
            // 转换数据格式
            const transformer = transformers[tableName];
            const data = transformer ? transformer(row) : row;

            // 插入到 PostgreSQL
            await pgDrizzle.insert(pgTable).values(data);
            migrated++;
          } catch (error) {
            errors.push(`ID ${row.id}: ${error.message}`);
          }
        }

        // 显示进度
        const progress = Math.min(i + batchSize, rows.length);
        console.log(`  进度: ${progress}/${rows.length}`);
      }

      if (errors.length > 0) {
        console.error(`  ❌ 表 ${tableName} 迁移完成，但有 ${errors.length} 个错误`);
      } else {
        console.log(`  ✅ 表 ${tableName} 迁移完成: ${migrated} 行`);
      }
    } catch (error) {
      errors.push(`表级别错误: ${error.message}`);
      console.error(`  ❌ 表 ${tableName} 迁移失败: ${error.message}`);
    }

    return { table: tableName, rowsMigrated: migrated, errors };
  }

  /**
   * 重建班级学生数统计
   */
  async function rebuildStudentCounts(pgClient) {
    console.log("📊 重建班级学生数统计...");

    await pgClient.unsafe(`
      UPDATE classes
      SET student_count = (
        SELECT COUNT(*)
        FROM students
        WHERE students.class_id = classes.id AND students.is_active = true
      ),
      updated_at = CURRENT_TIMESTAMP
    `);

    console.log("✅ 班级学生数统计重建完成");
  }

  /**
   * 运行迁移
   */
  async function runMigration() {
    console.log("🚀 开始迁移 SQLite -> PostgreSQL");
    console.log("=".repeat(50));

    // 1. 创建备份
    createBackup();

    // 2. 连接 SQLite
    console.log("📂 连接 SQLite 数据库...");
    const dbPath = path.join(process.cwd(), "data", "student_leave.db");
    if (!fs.existsSync(dbPath)) {
      throw new Error(`SQLite 数据库不存在: ${dbPath}`);
    }
    const sqliteDb = new Database(dbPath);

    // 3. 连接 PostgreSQL
    console.log("🐘 连接 PostgreSQL 数据库...");
    const pgUrl = process.env.POSTGRES_URL;
    if (!pgUrl) {
      throw new Error("POSTGRES_URL 环境变量未设置");
    }
    const pgClient = postgres(pgUrl, { max: 1 });
    const pgDrizzleInstance = drizzle(pgClient, { schema });

    // 4. 开始迁移
    console.log("\n📋 开始迁移数据...\n");

    const results = [];
    let totalRows = 0;
    let totalErrors = 0;

    for (const table of tables) {
      console.log(`\n📦 迁移表: ${table}`);
      const result = await migrateTable(sqliteDb, pgDrizzleInstance, pgClient, table);
      results.push(result);
      totalRows += result.rowsMigrated;
      totalErrors += result.errors.length;
    }

    // 5. 重建学生数统计
    await rebuildStudentCounts(pgClient);

    // 6. 关闭连接
    sqliteDb.close();
    await pgClient.end();

    // 7. 打印迁移摘要
    console.log("\n" + "=".repeat(50));
    console.log("📊 迁移摘要");
    console.log("=".repeat(50));
    console.log(`总迁移行数: ${totalRows}`);
    console.log(`总错误数: ${totalErrors}`);

    if (totalErrors > 0) {
      console.log("\n❌ 迁移完成，但有错误:");
      for (const result of results) {
        if (result.errors.length > 0) {
          console.log(`  表 ${result.table}:`);
          result.errors.forEach((err) => console.log(`    - ${err}`));
        }
      }
    } else {
      console.log("\n✅ 迁移成功完成！");
    }

    console.log("=".repeat(50));
  }

  // 运行迁移
  await runMigration().catch(console.error);
}

main().catch(console.error);
