import { getRawPostgres } from "@/lib/db";
import { logOperation } from "@/lib/utils/logger";

export async function clearAllData(userId: number) {
  const pgClient = getRawPostgres();
  const clearedTables: string[] = [];

  try {
    // 在事务外先检查哪些表存在
    const tablesToCheck = [
      "leave_records",
      "notifications",
      "operation_logs",
      "students",
      "classes",
      "grades",
      "semesters",
      "fee_configs",
      "backup_records",
      "backup_config",
      "database_switch_history",
      "database_connections",
      "system_config",
      "users",
    ];

    const tableExistsMap: Record<string, boolean> = {};

    for (const table of tablesToCheck) {
      const result = await pgClient.unsafe(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists
      `, [table]);
      tableExistsMap[table] = result[0]?.exists ?? false;
    }

    const result = await pgClient.begin(async (sql) => {
      let rows = 0;

      const safeDelete = async (tableName: string): Promise<number> => {
        if (!tableExistsMap[tableName]) {
          return 0;
        }
        const deleteResult: any[] = await sql.unsafe(`DELETE FROM ${tableName}`);
        clearedTables.push(tableName);
        return deleteResult.length;
      };

      // 按依赖关系顺序删除：先删除引用其他表的表，再删除被引用的表
      rows += await safeDelete("leave_records");      // 依赖 students, semesters
      rows += await safeDelete("notifications");       // 依赖 users
      rows += await safeDelete("operation_logs");      // 依赖 users
      rows += await safeDelete("backup_records");      // 依赖 users

      // fee_configs 依赖 classes 和 semesters，必须在 classes 之前删除
      rows += await safeDelete("fee_configs");

      rows += await safeDelete("students");          // 依赖 classes
      rows += await safeDelete("classes");           // 依赖 grades, semesters
      rows += await safeDelete("grades");            // 依赖 semesters
      rows += await safeDelete("semesters");         // 被 fee_configs, grades, classes 引用

      rows += await safeDelete("backup_config");
      rows += await safeDelete("database_switch_history"); // 依赖 database_connections
      rows += await safeDelete("database_connections");      // 依赖 users

      // system_config 特殊处理，保留 default_semester_id
      if (tableExistsMap["system_config"]) {
        const r = await sql.unsafe(
          "DELETE FROM system_config WHERE config_key != 'default_semester_id'"
        );
        rows += r.length;
        clearedTables.push("system_config");
      }

      // users 表最后删除（多个表依赖它）
      if (tableExistsMap["users"]) {
        const r = await sql.unsafe("DELETE FROM users WHERE id != $1", [userId]);
        rows += r.length;
        clearedTables.push("users");
      }

      return { clearedTables, totalRows: rows };
    });

    await logOperation(userId, "clear_data", "system", "Cleared all data");

    return {
      success: true,
      message: "Data cleared successfully",
      details: { clearedTables: result.clearedTables, rowsCleared: result.totalRows },
    };
  } catch (error) {
    console.error("Clear data failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to clear data",
    };
  }
}
