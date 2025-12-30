/**
 * 创建 PostgreSQL 数据库
 */

import postgres from "postgres";
import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: ".env" });

async function createDatabase(): Promise<void> {
  const { POSTGRES_URL } = process.env;

  if (!POSTGRES_URL) {
    throw new Error("POSTGRES_URL 环境变量未设置");
  }

  // 解析连接 URL
  const url = new URL(POSTGRES_URL);
  const dbName = url.pathname.slice(1); // 去掉开头的 /

  // 连接到默认的 postgres 数据库
  const adminUrl = `${url.protocol}//${url.username}:${url.password}@${url.host}/postgres`;

  console.log("🚀 开始创建 PostgreSQL 数据库...");
  console.log(`数据库名: ${dbName}`);

  const sql = postgres(adminUrl);

  try {
    // 检查数据库是否已存在
    const result = await sql`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}
    `;

    if (result.length > 0) {
      console.log(`⚠️  数据库 ${dbName} 已存在`);
    } else {
      // 创建数据库
      await sql.unsafe(`CREATE DATABASE ${dbName}`);
      console.log(`✅ 数据库 ${dbName} 创建成功`);
    }

    await sql.end();
  } catch (error: any) {
    console.error("❌ 创建数据库失败:", error.message);
    await sql.end();
    process.exit(1);
  }
}

createDatabase().catch(console.error);
