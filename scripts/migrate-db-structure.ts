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

    // 修改 classes 表的 meal_fee
    console.log("  - 修改 classes.meal_fee");
    await pgClient.unsafe(`
      ALTER TABLE classes
        ALTER COLUMN meal_fee TYPE NUMERIC(10, 2)
        USING CASE
          WHEN meal_fee ~ '^[0-9]+(\.[0-9]+)?$' THEN CAST(meal_fee AS NUMERIC(10, 2))
          ELSE 0.00
        END
    `);

    // 修改 leave_records 表的 refund_amount
    console.log("  - 修改 leave_records.refund_amount");
    await pgClient.unsafe(`
      ALTER TABLE leave_records
        ALTER COLUMN refund_amount TYPE NUMERIC(10, 2)
        USING CASE
          WHEN refund_amount ~ '^[0-9]+(\.[0-9]+)?$' THEN CAST(refund_amount AS NUMERIC(10, 2))
          ELSE NULL
        END
    `);

    // 修改 fee_configs 表的 meal_fee_standard
    console.log("  - 修改 fee_configs.meal_fee_standard");
    await pgClient.unsafe(`
      ALTER TABLE fee_configs
        ALTER COLUMN meal_fee_standard TYPE NUMERIC(10, 2)
        USING CASE
          WHEN meal_fee_standard ~ '^[0-9]+(\.[0-9]+)?$' THEN CAST(meal_fee_standard AS NUMERIC(10, 2))
          ELSE 0.00
        END
    `);

    console.log("✅ 金额字段类型调整完成");

    // ============ 问题 #3: 时区处理优化 ============
    console.log("\n📋 步骤 2: 时区字段优化 (timestamp -> timestamptz)");

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

    for (const table of tables) {
      console.log(`  - 处理表: ${table}`);
      await pgClient.unsafe(`
        ALTER TABLE ${table}
          ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
          ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE
      `);
    }

    // leave_records 表还有 review_time 字段
    console.log("  - 处理表: leave_records.review_time");
    await pgClient.unsafe(`
      ALTER TABLE leave_records
        ALTER COLUMN review_time TYPE TIMESTAMP WITH TIME ZONE
    `);

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
