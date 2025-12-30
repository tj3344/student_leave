/**
 * SQLite 到 PostgreSQL 数据迁移脚本
 *
 * 使用方法:
 *   ts-node scripts/migrate-to-postgres.ts
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  users,
  semesters,
  grades,
  classes,
  students,
  leaveRecords,
  systemConfig,
  operationLogs,
  feeConfigs,
  backupRecords,
  backupConfig,
} from "../lib/db/schema";
import fs from "fs";
import path from "path";

// Schema 对象
const schema = {
  users,
  semesters,
  grades,
  classes,
  students,
  leaveRecords,
  systemConfig,
  operationLogs,
  feeConfigs,
  backupRecords,
  backupConfig,
};

// 迁移结果接口
interface MigrationResult {
  table: string;
  rowsMigrated: number;
  errors: string[];
}

// 创建 Drizzle 实例
let pgDrizzle: ReturnType<typeof drizzle> | null = null;

function getPgDrizzle(url: string) {
  if (!pgDrizzle) {
    const client = postgres(url, { max: 1 });
    pgDrizzle = drizzle(client, { schema });
  }
  return pgDrizzle;
}

// 表名映射（snake_case -> camelCase）
const tableMapping: Record<string, keyof typeof schema> = {
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

// 类型转换函数（将 SQLite 数据格式转换为 PostgreSQL 格式）
const transformers: Record<string, (row: any) => any> = {
  users: (row: any) => ({
    ...row,
    isActive: Boolean(row.is_active),
    passwordHash: row.password_hash,
    realName: row.real_name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }),
  semesters: (row: any) => ({
    ...row,
    startDate: row.start_date,
    endDate: row.end_date,
    schoolDays: row.school_days,
    isCurrent: Boolean(row.is_current),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }),
  grades: (row: any) => ({
    ...row,
    semesterId: row.semester_id,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
  }),
  classes: (row: any) => ({
    ...row,
    semesterId: row.semester_id,
    gradeId: row.grade_id,
    classTeacherId: row.class_teacher_id,
    mealFee: String(row.meal_fee),
    studentCount: row.student_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }),
  students: (row: any) => ({
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
  leave_records: (row: any) => ({
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
  system_config: (row: any) => ({
    ...row,
    configKey: row.config_key,
    configValue: row.config_value,
    updatedAt: new Date(row.updated_at),
  }),
  operation_logs: (row: any) => ({
    ...row,
    userId: row.user_id,
    ipAddress: row.ip_address,
    createdAt: new Date(row.created_at),
  }),
  fee_configs: (row: any) => ({
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
  backup_records: (row: any) => ({
    ...row,
    filePath: row.file_path,
    fileSize: row.file_size,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  }),
  backup_config: (row: any) => ({
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
function createBackup(): string {
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
 * 迁移单个表（优化版 - 批量插入）
 */
async function migrateTable(
  sqliteDb: Database.Database,
  pgDrizzle: ReturnType<typeof drizzle>,
  pgClient: postgres.Sql,
  tableName: string
): Promise<MigrationResult> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    // 读取 SQLite 数据
    const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all() as any[];

    if (rows.length === 0) {
      console.log(`  ⚠️  表 ${tableName} 没有数据`);
      return { table: tableName, rowsMigrated: 0, errors: [] };
    }

    // 获取对应的 schema 表名
    const schemaTableName = tableMapping[tableName];
    if (!schemaTableName) {
      throw new Error(`未找到表 ${tableName} 的 schema 映射`);
    }

    const transformer = transformers[tableName];
    const pgTable = schema[schemaTableName];

    // 批量插入（每批 1000 条）
    const batchSize = 1000;
    const transformedData: any[] = [];

    // 预处理：转换所有数据
    for (const row of rows) {
      try {
        const data = transformer ? transformer(row) : row;
        transformedData.push(data);
      } catch (error: any) {
        errors.push(`ID ${row.id}: 数据转换失败 - ${error.message}`);
      }
    }

    // 分批并行插入
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);

      try {
        // 使用 Promise.all 并行插入
        await Promise.all(
          batch.map(data => pgDrizzle.insert(pgTable).values(data).onConflictDoNothing())
        );
        migrated += batch.length;

        const progress = Math.min(i + batchSize, transformedData.length);
        console.log(`  进度: ${progress}/${transformedData.length}`);
      } catch (error: any) {
        console.error(`  批量插入失败，回退到逐条插入: ${error.message}`);
        // 如果批量失败，回退到逐条插入
        for (const data of batch) {
          try {
            await pgDrizzle.insert(pgTable).values(data).onConflictDoNothing();
            migrated++;
          } catch (err: any) {
            errors.push(`插入失败: ${err.message}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      console.error(`  ❌ 表 ${tableName} 迁移完成，但有 ${errors.length} 个错误`);
    } else {
      console.log(`  ✅ 表 ${tableName} 迁移完成: ${migrated} 行`);
    }
  } catch (error: any) {
    errors.push(`表级别错误: ${error.message}`);
    console.error(`  ❌ 表 ${tableName} 迁移失败: ${error.message}`);
  }

  return { table: tableName, rowsMigrated: migrated, errors };
}

/**
 * 重建班级学生数统计
 */
async function rebuildStudentCounts(pgClient: postgres.Sql): Promise<void> {
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
export async function runMigration(): Promise<void> {
  console.log("🚀 开始迁移 SQLite -> PostgreSQL");
  console.log("=" .repeat(50));

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
  const pgDrizzleInstance = getPgDrizzle(pgUrl);

  // 4. 开始迁移
  console.log("\n📋 开始迁移数据...\n");

  const results: MigrationResult[] = [];
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
runMigration().catch(console.error);
