import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { decryptConnectionString } from "@/lib/utils/crypto";

/**
 * 数据库连接管理
 * 支持从环境变量或数据库连接表动态获取连接
 */

// PostgreSQL 连接（单例）
let db: ReturnType<typeof drizzle> | null = null;
let pgClient: postgres.Sql | null = null;
let currentConnectionId: number | null = null;

/**
 * 获取数据库连接（Drizzle ORM）
 * 自动从 database_connections 表获取当前活动连接
 * 如果没有配置，则使用环境变量 POSTGRES_URL
 */
export function getDb() {
  if (db) {
    return db; // 复用现有连接
  }

  // 尝试从数据库连接表获取活动连接
  // 注意：这里不能使用 getDb() 或 getRawPostgres()，会造成循环
  // 使用环境变量作为默认值
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("POSTGRES_URL 环境变量未设置");
  }

  pgClient = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: {
      timezone: 'Asia/Shanghai',
    },
  });
  db = drizzle(pgClient, { schema });

  return db;
}

/**
 * 获取原始 PostgreSQL 连接（用于特殊操作）
 * 复用 getDb() 的连接池，避免创建多个连接池
 */
export function getRawPostgres(): postgres.Sql {
  // 确保 db 和 pgClient 已初始化
  getDb();
  if (!pgClient) {
    throw new Error("数据库连接未初始化");
  }
  return pgClient;
}

/**
 * 关闭数据库连接
 */
export async function closeDb(): Promise<void> {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
  }
  db = null;
  currentConnectionId = null;
}

/**
 * 强制重新加载数据库连接
 * 用于数据库切换后刷新连接
 */
export async function reloadDatabaseConnection(): Promise<void> {
  await closeDb();
  getDb();
}

// 导出 db 实例（用于直接访问）
export { db };

// 导出 schema
export * from "./schema";

/**
 * 初始化目标数据库的表结构
 * 用于数据库切换时自动创建表
 */
export async function initializeDatabaseSchema(connectionString: string): Promise<void> {
  const client = postgres(connectionString, {
    max: 1,
    connect_timeout: 10,
  });

  try {
    // 检查是否存在旧结构（多种方式检测）
    let needsRebuild = false;

    // 检测1：users 表是否有旧的 password 列
    const checkPassword = await client.unsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'password'
    `);
    if (checkPassword.length > 0) {
      console.log("检测到旧列: users.password");
      needsRebuild = true;
    }

    // 检测2：leave_records 表是否有旧的 start_time 列
    const checkStartTime = await client.unsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'leave_records' AND column_name = 'start_time'
    `);
    if (checkStartTime.length > 0) {
      console.log("检测到旧列: leave_records.start_time");
      needsRebuild = true;
    }

    // 检测3：fee_configs 表是否有旧的 grade_id 列
    const checkGradeId = await client.unsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'fee_configs' AND column_name = 'grade_id'
    `);
    if (checkGradeId.length > 0) {
      console.log("检测到旧列: fee_configs.grade_id");
      needsRebuild = true;
    }

    // 检测4：system_config 表是否有旧的 created_at 列
    const checkSystemConfigCreatedAt = await client.unsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'system_config' AND column_name = 'created_at'
    `);
    if (checkSystemConfigCreatedAt.length > 0) {
      console.log("检测到旧列: system_config.created_at");
      needsRebuild = true;
    }

    // 检测5：operation_logs 表是否有旧的 target_type 列
    const checkTargetType = await client.unsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'operation_logs' AND column_name = 'target_type'
    `);
    if (checkTargetType.length > 0) {
      console.log("检测到旧列: operation_logs.target_type");
      needsRebuild = true;
    }

    // 如果检测到旧结构，删除所有表重建
    if (needsRebuild) {
      console.log("检测到旧表结构，正在删除并重建...");
      await dropAllTables(client);
    }

    // 创建所有表
    await createAllTables(client);
  } finally {
    await client.end();
  }
}

/**
 * 删除所有表（按依赖逆序）
 */
async function dropAllTables(client: postgres.Sql): Promise<void> {
  const tablesToDrop = [
    "notifications",
    "database_switch_history",
    "database_connections",
    "backup_config",
    "backup_records",
    "fee_configs",
    "operation_logs",
    "system_config",
    "leave_records",
    "students",
    "classes",
    "grades",
    "semesters",
    "users",
  ];

  for (const table of tablesToDrop) {
    try {
      await client.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`);
    } catch {
      // 忽略不存在的表
    }
  }
}

/**
 * 创建所有数据库表
 * 注意：SQL 定义必须与 Drizzle Schema 完全一致
 */
async function createAllTables(client: postgres.Sql): Promise<void> {
  // 按依赖顺序创建表
  const tables = [
    // 用户表（最先创建，其他表可能依赖它）
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      real_name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )`,

    // 学期表
    `CREATE TABLE IF NOT EXISTS semesters (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      school_days INTEGER NOT NULL,
      is_current BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )`,

    // 年级表
    `CREATE TABLE IF NOT EXISTS grades (
      id SERIAL PRIMARY KEY,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL
    )`,

    // 班级表
    `CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
      grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      class_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      meal_fee TEXT NOT NULL,
      student_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )`,

    // 学生表
    `CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      student_no TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      gender TEXT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
      parent_name TEXT,
      parent_phone TEXT,
      address TEXT,
      is_nutrition_meal BOOLEAN NOT NULL DEFAULT false,
      enrollment_date TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )`,

    // 请假记录表
    `CREATE TABLE IF NOT EXISTS leave_records (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
      applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      leave_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      review_time TIMESTAMP,
      review_remark TEXT,
      is_refund BOOLEAN NOT NULL DEFAULT true,
      refund_amount TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )`,

    // 系统配置表
    `CREATE TABLE IF NOT EXISTS system_config (
      id SERIAL PRIMARY KEY,
      config_key TEXT NOT NULL UNIQUE,
      config_value TEXT,
      description TEXT,
      updated_at TIMESTAMP NOT NULL
    )`,

    // 操作日志表
    `CREATE TABLE IF NOT EXISTS operation_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      description TEXT,
      ip_address TEXT,
      created_at TIMESTAMP NOT NULL
    )`,

    // 通知表
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL
    )`,

    // 费用配置表
    `CREATE TABLE IF NOT EXISTS fee_configs (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
      meal_fee_standard TEXT NOT NULL,
      prepaid_days INTEGER NOT NULL DEFAULT 0,
      actual_days INTEGER NOT NULL DEFAULT 0,
      suspension_days INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      UNIQUE(class_id, semester_id)
    )`,

    // 备份记录表
    `CREATE TABLE IF NOT EXISTS backup_records (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      modules TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMP NOT NULL
    )`,

    // 备份配置表
    `CREATE TABLE IF NOT EXISTS backup_config (
      id SERIAL PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT false,
      schedule_type TEXT NOT NULL,
      schedule_time TEXT NOT NULL,
      backup_type TEXT NOT NULL,
      modules TEXT NOT NULL,
      retention_days INTEGER NOT NULL DEFAULT 30,
      updated_at TIMESTAMP NOT NULL
    )`,

    // 数据库连接表
    `CREATE TABLE IF NOT EXISTS database_connections (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      connection_string_encrypted TEXT NOT NULL,
      environment VARCHAR(50) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT false,
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_switched_at TIMESTAMP,
      last_switched_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      connection_test_status VARCHAR(20),
      connection_test_message TEXT,
      connection_test_at TIMESTAMP
    )`,

    // 数据库切换历史表
    `CREATE TABLE IF NOT EXISTS database_switch_history (
      id SERIAL PRIMARY KEY,
      from_connection_id INTEGER REFERENCES database_connections(id) ON DELETE SET NULL,
      to_connection_id INTEGER NOT NULL REFERENCES database_connections(id) ON DELETE RESTRICT,
      switch_type VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      backup_file_path TEXT,
      error_message TEXT,
      migrated_tables TEXT,
      migration_details TEXT,
      switched_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP
    )`,
  ];

  for (const createSQL of tables) {
    await client.unsafe(createSQL);
  }
}
