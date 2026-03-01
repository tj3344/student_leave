/**
 * 数据库性能优化索引迁移脚本
 *
 * 功能：为常用查询字段添加索引以提高查询性能
 *
 * 使用方法:
 *   tsx scripts/add-performance-indexes.ts
 *   或
 *   npm run run-script add-performance-indexes
 */

import postgres from "postgres";

/**
 * 索引定义
 * 格式：{ 表名: [{ 索引名, 字段, 选项 }] }
 */
const INDEX_DEFINITIONS: Record<string, Array<{
  name: string;
  columns: string;
  options?: string;
}>> = {
  // students 表索引
  students: [
    {
      name: "idx_students_student_no",
      columns: "student_no",
      options: "WHERE student_no IS NOT NULL",
    },
    {
      name: "idx_students_name",
      columns: "name",
      options: "WHERE name IS NOT NULL",
    },
    {
      name: "idx_students_class_id",
      columns: "class_id",
    },
    {
      name: "idx_students_parent_phone",
      columns: "parent_phone",
      options: "WHERE parent_phone IS NOT NULL",
    },
    {
      name: "idx_students_is_active",
      columns: "is_active",
    },
    {
      name: "idx_students_class_active",
      columns: "class_id, is_active",
    },
  ],

  // leave_records 表索引
  leave_records: [
    {
      name: "idx_leave_records_student_id",
      columns: "student_id",
    },
    {
      name: "idx_leave_records_semester_id",
      columns: "semester_id",
    },
    {
      name: "idx_leave_records_applicant_id",
      columns: "applicant_id",
    },
    {
      name: "idx_leave_records_status",
      columns: "status",
    },
    {
      name: "idx_leave_records_start_date",
      columns: "start_date",
    },
    {
      name: "idx_leave_records_semester_status",
      columns: "semester_id, status",
    },
    {
      name: "idx_leave_records_student_semester",
      columns: "student_id, semester_id",
    },
  ],

  // classes 表索引
  classes: [
    {
      name: "idx_classes_grade_id",
      columns: "grade_id",
    },
    {
      name: "idx_classes_semester_id",
      columns: "semester_id",
    },
    {
      name: "idx_classes_class_teacher_id",
      columns: "class_teacher_id",
      options: "WHERE class_teacher_id IS NOT NULL",
    },
    {
      name: "idx_classes_semester_grade",
      columns: "semester_id, grade_id",
    },
  ],

  // users 表索引
  users: [
    {
      name: "idx_users_username",
      columns: "username",
      options: "WHERE username IS NOT NULL",
    },
    {
      name: "idx_users_role",
      columns: "role",
    },
    {
      name: "idx_users_is_active",
      columns: "is_active",
    },
    {
      name: "idx_users_role_active",
      columns: "role, is_active",
    },
  ],

  // notifications 表索引
  notifications: [
    {
      name: "idx_notifications_recipient_id",
      columns: "recipient_id",
    },
    {
      name: "idx_notifications_semester_id",
      columns: "semester_id",
    },
    {
      name: "idx_notifications_is_read",
      columns: "is_read",
    },
    {
      name: "idx_notifications_recipient_read",
      columns: "recipient_id, is_read",
    },
    {
      name: "idx_notifications_created_at",
      columns: "created_at",
    },
  ],

  // operation_logs 表索引
  operation_logs: [
    {
      name: "idx_operation_logs_user_id",
      columns: "user_id",
      options: "WHERE user_id IS NOT NULL",
    },
    {
      name: "idx_operation_logs_action",
      columns: "action",
    },
    {
      name: "idx_operation_logs_module",
      columns: "module",
    },
    {
      name: "idx_operation_logs_created_at",
      columns: "created_at",
    },
  ],

  // grades 表索引
  grades: [
    {
      name: "idx_grades_semester_id",
      columns: "semester_id",
    },
    {
      name: "idx_grades_name",
      columns: "name",
    },
  ],

  // semesters 表索引
  semesters: [
    {
      name: "idx_semesters_is_active",
      columns: "is_active",
    },
  ],
};

/**
 * 检查索引是否已存在
 */
async function indexExists(
  pgClient: postgres.Sql<{}>,
  tableName: string,
  indexName: string
): Promise<boolean> {
  const result = await pgClient.unsafe(`
    SELECT 1
    FROM pg_indexes
    WHERE tablename = '${tableName}'
    AND indexname = '${indexName}'
  `);
  return result.length > 0;
}

/**
 * 执行迁移
 */
export async function runMigration(): Promise<void> {
  console.log("🚀 开始数据库性能优化索引迁移");
  console.log("=".repeat(60));

  const pgUrl = process.env.POSTGRES_URL;
  if (!pgUrl) {
    throw new Error("POSTGRES_URL 环境变量未设置");
  }

  const pgClient = postgres(pgUrl, { max: 1 });

  try {
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 按表处理索引
    for (const [tableName, indexes] of Object.entries(INDEX_DEFINITIONS)) {
      console.log(`\n📋 处理表: ${tableName}`);

      for (const indexDef of indexes) {
        try {
          // 检查索引是否已存在
          const exists = await indexExists(pgClient, tableName, indexDef.name);

          if (exists) {
            console.log(`  - 跳过 ${indexDef.name} (已存在)`);
            skippedCount++;
            continue;
          }

          // 创建索引
          const optionsSql = indexDef.options ? ` ${indexDef.options}` : "";
          const sql = `CREATE INDEX ${indexDef.name} ON ${tableName}(${indexDef.columns})${optionsSql}`;

          console.log(`  - 创建 ${indexDef.name} ON ${tableName}(${indexDef.columns})`);
          await pgClient.unsafe(sql);
          createdCount++;
        } catch (error) {
          console.error(`  - ❌ 创建 ${indexDef.name} 失败:`, error instanceof Error ? error.message : error);
          errorCount++;
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ 数据库索引迁移完成！");
    console.log("=".repeat(60));
    console.log(`\n📊 统计:`);
    console.log(`  - 创建: ${createdCount} 个索引`);
    console.log(`  - 跳过: ${skippedCount} 个已存在的索引`);
    console.log(`  - 失败: ${errorCount} 个索引`);

    if (errorCount > 0) {
      console.log("\n⚠️  部分索引创建失败，请检查错误信息");
    }

    // 显示所有已创建的索引
    console.log("\n📋 当前索引列表:");
    for (const tableName of Object.keys(INDEX_DEFINITIONS)) {
      const indexes = await pgClient.unsafe(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = '${tableName}'
        AND indexname LIKE 'idx_%'
        ORDER BY indexname
      `);

      if (indexes.length > 0) {
        console.log(`\n  ${tableName}:`);
        for (const idx of indexes) {
          console.log(`    - ${idx.indexname}`);
        }
      }
    }

  } catch (error: any) {
    console.error("\n❌ 迁移失败:", error.message);
    throw error;
  } finally {
    await pgClient.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runMigration().catch(console.error);
}
