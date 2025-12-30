import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// PostgreSQL 连接（单一实例）
let db: ReturnType<typeof drizzle> | null = null;
let pgClient: postgres.Sql | null = null;

/**
 * 获取数据库连接（Drizzle ORM）
 */
export function getDb() {
  if (!db) {
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
  }
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
}

// 导出 schema
export * from "./schema";
