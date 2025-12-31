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

  const tempDb = drizzle(client, { schema });

  // 使用 Drizzle 的 push 功能创建表结构
  // 这里我们手动创建所有表，因为 drizzle-kit push 需要 CLI
  await createAllTables(client);

  await client.end();
}

/**
 * 创建所有数据库表
 */
async function createAllTables(client: postgres.Sql): Promise<void> {
  // 按依赖顺序创建表
  const tables = [
    // 用户表（最先创建，其他表可能依赖它）
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      real_name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // 学期表
    `CREATE TABLE IF NOT EXISTS semesters (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_current BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // 年级表
    `CREATE TABLE IF NOT EXISTS grades (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE
    )`,

    // 班级表
    `CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
      UNIQUE(name, grade_id)
    )`,

    // 学生表
    `CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      student_no VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      gender VARCHAR(10) NOT NULL,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
      phone VARCHAR(20),
      dormitory VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // 请假记录表
    `CREATE TABLE IF NOT EXISTS leave_records (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      reason TEXT NOT NULL,
      destination VARCHAR(200),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      review_time TIMESTAMP,
      review_comment TEXT,
      leave_type VARCHAR(20) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // 系统配置表
    `CREATE TABLE IF NOT EXISTS system_config (
      id SERIAL PRIMARY KEY,
      config_key VARCHAR(100) NOT NULL UNIQUE,
      config_value TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // 操作日志表
    `CREATE TABLE IF NOT EXISTS operation_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      target_type VARCHAR(50),
      target_id INTEGER,
      details TEXT,
      ip_address VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // 费用配置表
    `CREATE TABLE IF NOT EXISTS fee_configs (
      id SERIAL PRIMARY KEY,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
      fee_type VARCHAR(50) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(semester_id, fee_type)
    )`,

    // 备份记录表
    `CREATE TABLE IF NOT EXISTS backup_records (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      type VARCHAR(20) NOT NULL,
      modules TEXT NOT NULL,
      file_path TEXT,
      file_size BIGINT NOT NULL DEFAULT 0,
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // 备份配置表
    `CREATE TABLE IF NOT EXISTS backup_config (
      id SERIAL PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT false,
      schedule_type VARCHAR(20) NOT NULL,
      schedule_time VARCHAR(10) NOT NULL,
      backup_type VARCHAR(20) NOT NULL,
      modules TEXT NOT NULL,
      retention_days INTEGER NOT NULL DEFAULT 30,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    )`,
  ];

  for (const createSQL of tables) {
    await client.unsafe(createSQL);
  }
}
