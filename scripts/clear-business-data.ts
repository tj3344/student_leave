/**
 * 清除业务数据脚本
 *
 * 保留的数据：
 * - users (用户表)
 * - system_config (系统配置)
 * - operation_logs (操作日志)
 * - backup_config (备份配置)
 * - backup_records (备份记录)
 *
 * 清除的数据（按外键依赖顺序）：
 * 1. leave_records (请假记录)
 * 2. students (学生)
 * 3. classes (班级)
 * 4. grades (年级)
 * 5. semesters (学期)
 * 6. fee_configs (费用配置)
 *
 * 使用方法：
 * npm run ts-node scripts/clear-business-data.ts
 */

import postgres from "postgres";

async function clearBusinessData() {
  // 使用环境变量中的数据库连接
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("未找到数据库连接字符串，请设置 POSTGRES_URL 环境变量");
  }

  const pgClient = postgres(dbUrl);

  console.log("开始清除业务数据...\n");

  try {
    // 按照外键依赖顺序删除数据
    const tables = [
      { name: "leave_records", description: "请假记录" },
      { name: "students", description: "学生" },
      { name: "classes", description: "班级" },
      { name: "grades", description: "年级" },
      { name: "semesters", description: "学期" },
      { name: "fee_configs", description: "费用配置" },
    ];

    // 显示当前数据统计
    console.log("清除前的数据统计：");
    for (const table of tables) {
      const result = await pgClient.unsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
      console.log(`  - ${table.description}: ${result[0]?.count || 0} 条`);
    }
    console.log("");

    // 确认操作
    console.log("⚠️  警告：此操作将清除以上所有业务数据！");
    console.log("保留的数据：用户、系统配置、操作日志、备份配置/记录\n");
    console.log("将在 5 秒后开始执行，按 Ctrl+C 取消...\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 开始删除
    console.log("开始删除...\n");

    for (const table of tables) {
      const result = await pgClient.unsafe(`DELETE FROM ${table.name} RETURNING *`);
      console.log(`✓ 已清除 ${table.description}: ${result.length} 条`);
    }

    console.log("\n业务数据清除完成！");

    // 重置序列（从 1 重新开始）
    console.log("\n重置自增序列...");
    const sequences = [
      "leave_records_id_seq",
      "students_id_seq",
      "classes_id_seq",
      "grades_id_seq",
      "semesters_id_seq",
      "fee_configs_id_seq",
    ];

    for (const seq of sequences) {
      try {
        await pgClient.unsafe(`SELECT setval('${seq}', 1, false)`);
        console.log(`✓ 已重置序列: ${seq}`);
      } catch (e) {
        // 序列可能不存在，忽略错误
      }
    }

    console.log("\n✅ 所有操作完成！");

    // 显示保留的数据统计
    console.log("\n保留的数据统计：");
    const keptTables = [
      { name: "users", description: "用户" },
      { name: "system_config", description: "系统配置" },
      { name: "operation_logs", description: "操作日志" },
      { name: "backup_config", description: "备份配置" },
      { name: "backup_records", description: "备份记录" },
    ];

    for (const table of keptTables) {
      const result = await pgClient.unsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
      console.log(`  - ${table.description}: ${result[0]?.count || 0} 条`);
    }

  } catch (error) {
    console.error("清除数据时出错：", error);
    process.exit(1);
  }
}

// 执行清除
clearBusinessData()
  .then(() => {
    console.log("\n脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("脚本执行失败：", error);
    process.exit(1);
  });
