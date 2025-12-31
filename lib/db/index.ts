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
