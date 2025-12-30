/**
 * PostgreSQL 数据库初始化脚本
 * 初始化触发器和全文搜索
 */

import * as dotenv from "dotenv";
import { initStudentCountTriggers } from "../lib/db/triggers";
import { initFullTextSearch } from "../lib/db/full-text-search";

// 加载环境变量
dotenv.config({ path: ".env" });

export async function setupPostgres(): Promise<void> {
  console.log("🚀 开始初始化 PostgreSQL 数据库...");
  console.log("=" .repeat(50));

  try {
    // 初始化触发器
    console.log("\n📋 初始化触发器...");
    await initStudentCountTriggers();

    // 初始化全文搜索
    console.log("\n🔍 初始化全文搜索...");
    await initFullTextSearch();

    console.log("\n" + "=".repeat(50));
    console.log("✅ PostgreSQL 数据库初始化完成！");
    console.log("=".repeat(50));
  } catch (error: any) {
    console.error("\n❌ 初始化失败:", error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  setupPostgres().catch(console.error);
}
