/**
 * 数据库结构优化迁移脚本
 *
 * 功能：
 * 1. 将所有 timestamp 改为 timestamptz（时区优化）
 * 2. 将 meal_fee 和 refund_amount 从 text 改为 NUMERIC(10, 2)
 *
 * 使用方法:
 *   ts-node scripts/migrate-db-structure.ts
 */

import postgres from "postgres";

/**
 * 执行迁移
 */
export async function runMigration(): Promise<void> {
  console.log("🚀 开始数据库结构优化迁移");
  console.log("=".repeat(50));

  const pgUrl = process.env.POSTGRES_URL;
  if (!pgUrl) {
    throw new Error("POSTGRES_URL 环境变量未设置");
  }

  const pgClient = postgres(pgUrl, { max: 1 });

  try {
    // ============ 问题 #4: 金额字段类型调整 ============
    console.log("\n📋 步骤 1: 金额字段类型调整 (text -> NUMERIC)");

    // 定义需要转换的金额字段
    const moneyFields = [
      { table: "classes", column: "meal_fee", default: "0.00" },
      { table: "leave_records", column: "refund_amount", default: "NULL" },
      { table: "fee_configs", column: "meal_fee_standard", default: "0.00" },
    ];

    for (const field of moneyFields) {
      // 检查当前类型
      const typeCheck = await pgClient.unsafe(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = '${field.table}' AND column_name = '${field.column}'
      `);

      if (typeCheck.length === 0) {
        console.log(`  - 跳过 ${field.table}.${field.column} (字段不存在)`);
        continue;
      }

      const currentType = typeCheck[0].data_type;

      if (currentType === "numeric") {
        console.log(`  - 跳过 ${field.table}.${field.column} (已经是 NUMERIC)`);
        continue;
      }

      console.log(`  - 修改 ${field.table}.${field.column} (${currentType} -> NUMERIC)`);
      await pgClient.unsafe(`
        ALTER TABLE ${field.table}
          ALTER COLUMN ${field.column} TYPE NUMERIC(10, 2)
          USING CASE
            WHEN ${field.column} ~ '^[0-9]+(\.[0-9]+)?$' THEN CAST(${field.column} AS NUMERIC(10, 2))
            ELSE ${field.default}
          END
      `);
    }

    console.log("✅ 金额字段类型调整完成");

    // ============ 问题 #3: 时区处理优化 ============
    console.log("\n📋 步骤 2: 时区字段优化 (timestamp -> timestamptz)");

    // 定义每个表实际存在的时间戳列
    const tableTimestamps: Record<string, string[]> = {
      users: ["created_at", "updated_at"],
      semesters: ["created_at", "updated_at"],
      grades: ["created_at"],  // 只有 created_at
      classes: ["created_at", "updated_at"],
      students: ["created_at", "updated_at"],
      leave_records: ["created_at", "updated_at"],
      system_config: ["updated_at"],  // 只有 updated_at
      operation_logs: ["created_at"],  // 只有 created_at
      fee_configs: ["created_at", "updated_at"],
      backup_records: ["created_at"],  // 只有 created_at
      backup_config: ["updated_at"],   // 只有 updated_at
    };

    for (const [table, columns] of Object.entries(tableTimestamps)) {
      for (const column of columns) {
        // 检查当前类型
        const typeCheck = await pgClient.unsafe(`
          SELECT data_type
          FROM information_schema.columns
          WHERE table_name = '${table}' AND column_name = '${column}'
        `);

        if (typeCheck.length === 0) {
          console.log(`  - 跳过 ${table}.${column} (字段不存在)`);
          continue;
        }

        const currentType = typeCheck[0].data_type;

        // 如果已经是 timestamptz，跳过
        if (currentType === "timestamp with time zone") {
          console.log(`  - 跳过 ${table}.${column} (已经是 TIMESTAMPTZ)`);
          continue;
        }

        console.log(`  - 修改 ${table}.${column} (${currentType} -> TIMESTAMPTZ)`);
        await pgClient.unsafe(`
          ALTER TABLE ${table}
            ALTER COLUMN ${column} TYPE TIMESTAMP WITH TIME ZONE
        `);
      }
    }

    // leave_records 表还有 review_time 字段
    const reviewTimeCheck = await pgClient.unsafe(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'leave_records' AND column_name = 'review_time'
    `);

    if (reviewTimeCheck.length > 0) {
      const currentType = reviewTimeCheck[0].data_type;
      if (currentType !== "timestamp with time zone") {
        console.log(`  - 修改 leave_records.review_time (${currentType} -> TIMESTAMPTZ)`);
        await pgClient.unsafe(`
          ALTER TABLE leave_records
            ALTER COLUMN review_time TYPE TIMESTAMP WITH TIME ZONE
        `);
      } else {
        console.log(`  - 跳过 leave_records.review_time (已经是 TIMESTAMPTZ)`);
      }
    }

    console.log("✅ 时区字段优化完成");

    // ============ 验证结果 ============
    console.log("\n📊 验证迁移结果:");

    // 验证金额字段
    const mealFeeResult = await pgClient.unsafe(`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'classes' AND column_name = 'meal_fee'
    `);
    console.log("  classes.meal_fee:", mealFeeResult[0]);

    const refundAmountResult = await pgClient.unsafe(`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'leave_records' AND column_name = 'refund_amount'
    `);
    console.log("  leave_records.refund_amount:", refundAmountResult[0]);

    // 验证时区字段
    const usersTimestampResult = await pgClient.unsafe(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('created_at', 'updated_at')
    `);
    console.log("  users.created_at/updated_at:", usersTimestampResult);

    console.log("\n" + "=".repeat(50));
    console.log("✅ 数据库结构优化迁移完成！");
    console.log("=".repeat(50));

    console.log("\n⚠️  注意事项：");
    console.log("  1. 金额字段已从 text 改为 NUMERIC(10, 2)");
    console.log("  2. 所有时间戳字段已改为 TIMESTAMP WITH TIME ZONE");
    console.log("  3. 如果应用层有相关类型定义，请同步更新");

  } catch (error: any) {
    console.error("\n❌ 迁移失败:", error.message);
    throw error;
  } finally {
    await pgClient.end();
  }
}

// 运行迁移
runMigration().catch(console.error);
