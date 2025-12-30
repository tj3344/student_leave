/**
 * 清空数据库并重建所有表
 */

import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { POSTGRES_URL } = process.env;

if (!POSTGRES_URL) {
  throw new Error("POSTGRES_URL 环境变量未设置");
}

async function dropAndCreateTables(): Promise<void> {
  const sql = postgres(POSTGRES_URL as string);

  try {
    console.log("🗑️  删除所有表...");

    // 删除所有表（按依赖顺序逆序）
    const tables = [
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

    for (const table of tables) {
      await sql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`  ✓ 已删除表: ${table}`);
    }

    console.log("\n✅ 所有表已删除，现在可以使用 drizzle-kit push 创建表结构");

    await sql.end();
  } catch (error: any) {
    console.error("❌ 错误:", error.message);
    await sql.end();
    process.exit(1);
  }
}

dropAndCreateTables().catch(console.error);
