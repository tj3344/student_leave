/**
 * SQLite 到 PostgreSQL 数据迁移脚本（纯 SQL 版本）
 *
 * 使用方法:
 *   node scripts/migrate-to-postgres-sql.cjs
 */

const Database = require("better-sqlite3");
const postgres = require("postgres");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env" });

// 表名列表（按依赖顺序）
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

// 字段名映射（snake_case -> camelCase）
const columnMappings = {
  users: {
    password_hash: "passwordHash",
    real_name: "realName",
    is_active: "isActive",
    created_at: "createdAt",
    updated_at: "updatedAt",
  },
  semesters: {
    start_date: "startDate",
    end_date: "endDate",
    school_days: "schoolDays",
    is_current: "isCurrent",
    created_at: "createdAt",
    updated_at: "updatedAt",
  },
  grades: {
    semester_id: "semesterId",
    sort_order: "sortOrder",
    created_at: "createdAt",
  },
  classes: {
    semester_id: "semesterId",
    grade_id: "gradeId",
    class_teacher_id: "classTeacherId",
    meal_fee: "mealFee",
    student_count: "studentCount",
    created_at: "createdAt",
    updated_at: "updatedAt",
  },
  students: {
    student_no: "studentNo",
    class_id: "classId",
    birth_date: "birthDate",
    parent_name: "parentName",
    parent_phone: "parentPhone",
    is_nutrition_meal: "isNutritionMeal",
    enrollment_date: "enrollmentDate",
    is_active: "isActive",
    created_at: "createdAt",
    updated_at: "updatedAt",
  },
  leave_records: {
    student_id: "studentId",
    semester_id: "semesterId",
    applicant_id: "applicantId",
    start_date: "startDate",
    end_date: "endDate",
    leave_days: "leaveDays",
    reviewer_id: "reviewerId",
    review_time: "reviewTime",
    review_remark: "reviewRemark",
    is_refund: "isRefund",
    refund_amount: "refundAmount",
    created_at: "createdAt",
    updated_at: "updatedAt",
  },
  system_config: {
    config_key: "configKey",
    config_value: "configValue",
    updated_at: "updatedAt",
  },
  operation_logs: {
    user_id: "userId",
    ip_address: "ipAddress",
    created_at: "createdAt",
  },
  fee_configs: {
    class_id: "classId",
    semester_id: "semesterId",
    meal_fee_standard: "mealFeeStandard",
    prepaid_days: "prepaidDays",
    actual_days: "actualDays",
    suspension_days: "suspensionDays",
    created_at: "createdAt",
    updated_at: "updatedAt",
  },
  backup_records: {
    file_path: "filePath",
    file_size: "fileSize",
    created_by: "createdBy",
    created_at: "createdAt",
  },
  backup_config: {
    schedule_type: "scheduleType",
    schedule_time: "scheduleTime",
    backup_type: "backupType",
    retention_days: "retentionDays",
    updated_at: "updatedAt",
  },
};

/**
 * 转换行数据格式
 * 注意：PostgreSQL 表使用 snake_case 列名，与 SQLite 相同
 */
function transformRow(tableName, row) {
  const transformed = { ...row };

  // 转换布尔值（SQLite 的 0/1 -> PostgreSQL boolean）
  if (transformed.is_active !== undefined) {
    transformed.is_active = Boolean(transformed.is_active);
  }
  if (transformed.is_current !== undefined) {
    transformed.is_current = Boolean(transformed.is_current);
  }
  if (transformed.is_nutrition_meal !== undefined) {
    transformed.is_nutrition_meal = Boolean(transformed.is_nutrition_meal);
  }
  if (transformed.is_refund !== undefined) {
    transformed.is_refund = Boolean(transformed.is_refund);
  }
  if (transformed.enabled !== undefined) {
    transformed.enabled = Boolean(transformed.enabled);
  }

  // 转换时间戳（SQLite 整数 -> PostgreSQL timestamp）
  if (transformed.created_at) {
    transformed.created_at = new Date(transformed.created_at);
  }
  if (transformed.updated_at) {
    transformed.updated_at = new Date(transformed.updated_at);
  }
  if (transformed.review_time) {
    transformed.review_time = new Date(transformed.review_time);
  }

  return transformed;
}

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
async function migrateTable(sqliteDb, pgClient, tableName) {
  const errors = [];
  let migrated = 0;

  try {
    // 读取 SQLite 数据
    const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();

    if (rows.length === 0) {
      console.log(`  ⚠️  表 ${tableName} 没有数据`);
      return { table: tableName, rowsMigrated: 0, errors: [] };
    }

    // 转换并插入数据
    for (const row of rows) {
      try {
        const data = transformRow(tableName, row);

        // 构建 INSERT 语句
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

        const query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

        await pgClient.unsafe(query, values);
        migrated++;

        // 每100行显示一次进度
        if (migrated % 100 === 0) {
          console.log(`  进度: ${migrated}/${rows.length}`);
        }
      } catch (error) {
        errors.push(`ID ${row.id}: ${error.message}`);
      }
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
 * 同步所有表的序列（修复主键自增）
 */
async function syncSequences(pgClient) {
  console.log("🔄 同步数据库序列...");

  const tables = [
    { name: "users", sequence: "users_id_seq" },
    { name: "semesters", sequence: "semesters_id_seq" },
    { name: "grades", sequence: "grades_id_seq" },
    { name: "classes", sequence: "classes_id_seq" },
    { name: "students", sequence: "students_id_seq" },
    { name: "leave_records", sequence: "leave_records_id_seq" },
    { name: "system_config", sequence: "system_config_id_seq" },
    { name: "operation_logs", sequence: "operation_logs_id_seq" },
    { name: "fee_configs", sequence: "fee_configs_id_seq" },
    { name: "backup_records", sequence: "backup_records_id_seq" },
    { name: "backup_config", sequence: "backup_config_id_seq" },
  ];

  for (const table of tables) {
    try {
      await pgClient.unsafe(
        `SELECT setval('${table.sequence}', (SELECT COALESCE(MAX(id), 1) FROM ${table.name}))`
      );
    } catch (error) {
      // 如果表是空的，重置序列到 1
      try {
        await pgClient.unsafe(`ALTER SEQUENCE ${table.sequence} RESTART WITH 1`);
      } catch (e) {
        // 忽略不存在的序列
      }
    }
  }

  console.log("✅ 序列同步完成");
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

  // 4. 开始迁移
  console.log("\n📋 开始迁移数据...\n");

  const results = [];
  let totalRows = 0;
  let totalErrors = 0;

  for (const table of tables) {
    console.log(`\n📦 迁移表: ${table}`);
    const result = await migrateTable(sqliteDb, pgClient, table);
    results.push(result);
    totalRows += result.rowsMigrated;
    totalErrors += result.errors.length;
  }

  // 5. 重建学生数统计
  await rebuildStudentCounts(pgClient);

  // 6. 同步序列
  await syncSequences(pgClient);

  // 7. 关闭连接
  sqliteDb.close();
  await pgClient.end();

  // 8. 打印迁移摘要
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
runMigration().catch(console.error);
