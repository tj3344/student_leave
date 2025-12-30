import { getRawPostgres } from "@/lib/db";
import type { BackupModule } from "@/types";
import fs from "fs";
import path from "path";

/**
 * 表的依赖顺序（考虑外键关系）
 * 注意：backup_records 有外键引用 users，必须在 users 之后
 */
export const TABLE_DEPENDENCY_ORDER: BackupModule[] = [
  "users",
  "semesters",
  "grades",
  "classes",
  "students",
  "leave_records",
  "fee_configs",
  "system_config",
  "operation_logs",
  "backup_records",  // 必须在 users 之后，因为有外键引用
];

/**
 * 生成 SQL INSERT 语句（处理字符串转义）
 */
function escapeSQL(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  // 处理 Date 对象 - 转换为 PostgreSQL 可识别的格式
  if (value instanceof Date) {
    // 转换为 ISO 格式，不带时区后缀（PostgreSQL 会使用配置的时区）
    return `'${value.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')}'`;
  }
  // 转义单引号
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * 生成单个表的 INSERT 语句
 */
export async function generateTableInserts(tableName: BackupModule): Promise<string> {
  const pgClient = getRawPostgres();
  const rows = await pgClient.unsafe(`SELECT * FROM ${tableName}`);

  if (rows.length === 0) {
    return `-- 表 ${tableName} 无数据\n\n`;
  }

  // 获取表的实际列名（从 information_schema）
  const columnsResult = await pgClient.unsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
    ORDER BY ordinal_position
  `);
  const columns = columnsResult.map((r: any) => r.column_name);

  let sql = `-- 表: ${tableName}\n`;
  sql += `-- 记录数: ${rows.length}\n\n`;

  for (const row of rows) {
    const values = columns.map((col) => escapeSQL(row[col])).join(", ");
    sql += `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values});\n`;
  }

  sql += "\n";
  return sql;
}

/**
 * 生成完整备份 SQL
 */
export async function generateBackupSQL(modules: BackupModule[]): Promise<string> {
  let sql = `-- ========================================\n`;
  sql += `-- 学生请假管理系统数据备份\n`;
  sql += `-- 备份时间: ${new Date().toLocaleString("zh-CN")}\n`;
  sql += `-- ========================================\n\n`;

  sql += `BEGIN;\n\n`;

  // 按依赖顺序生成
  for (const table of TABLE_DEPENDENCY_ORDER) {
    if (modules.includes(table)) {
      sql += await generateTableInserts(table);
    }
  }

  sql += `COMMIT;\n`;

  return sql;
}

/**
 * 过滤 INSERT 语句中的时间戳列（created_at, updated_at）
 * 使用 PostgreSQL 默认值 CURRENT_TIMESTAMP 替代 SQLite 格式的时间戳
 */
function filterTimestampColumns(insertStmt: string): string | null {
  // 匹配 INSERT INTO table_name (col1, col2, ...) VALUES (val1, val2, ...)
  const insertRegex = /^INSERT INTO (\w+)\s+\(([^)]+)\)\s+VALUES\s+\(([^)]+)\)$/i;
  const match = insertStmt.match(insertRegex);

  if (!match) {
    return insertStmt; // 无法解析，返回原语句
  }

  const [, tableName, columnsStr, valuesStr] = match;
  const columns = columnsStr.split(",").map((c) => c.trim());
  const values = valuesStr.split(",").map((v) => v.trim());

  // 找到需要过滤的时间戳列索引
  const timestampColumns = ["created_at", "updated_at"];
  const indicesToRemove: number[] = [];

  for (const col of timestampColumns) {
    const index = columns.indexOf(col);
    if (index !== -1) {
      indicesToRemove.push(index);
    }
  }

  if (indicesToRemove.length === 0) {
    return insertStmt; // 没有时间戳列，返回原语句
  }

  // 从后往前删除，避免索引变化
  indicesToRemove.sort((a, b) => b - a);
  for (const index of indicesToRemove) {
    columns.splice(index, 1);
    values.splice(index, 1);
  }

  // 重新构建 INSERT 语句
  if (columns.length === 0) {
    return null; // 没有列了，跳过
  }

  return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")})`;
}

/**
 * 执行 SQL 恢复
 */
export async function restoreFromSQL(
  sqlContent: string
): Promise<{ success: boolean; message: string; preBackupPath?: string }> {
  const pgClient = getRawPostgres();

  try {
    // 恢复前自动备份当前数据
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const backupDir = path.join(process.cwd(), "data", "backups");
    const preBackupPath = path.join(backupDir, `pre-restore-${timestamp}.sql`);

    // 确保备份目录存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const preBackupSQL = await generateBackupSQL(TABLE_DEPENDENCY_ORDER);
    fs.writeFileSync(preBackupPath, preBackupSQL, "utf-8");

    // 开始事务恢复
    await pgClient.unsafe("BEGIN");

    try {
      // 删除现有数据（按依赖逆序）
      const reversedOrder = [...TABLE_DEPENDENCY_ORDER].reverse();
      for (const table of reversedOrder) {
        await pgClient.unsafe(`DELETE FROM ${table}`);
      }

      // 执行恢复 SQL（逐行解析，避免 split(";") 问题）
      const lines = sqlContent.split("\n");
      let currentStmt = "";
      for (const line of lines) {
        const trimmed = line.trim();
        // 跳过注释和空行
        if (!trimmed || trimmed.startsWith("--")) {
          continue;
        }
        currentStmt += line + "\n";
        // 检查是否是完整的 INSERT 语句（以分号结尾）
        if (trimmed.endsWith(";")) {
          const insertStmt = currentStmt.trim();
          if (insertStmt.toUpperCase().includes("INSERT")) {
            await pgClient.unsafe(insertStmt);
          }
          currentStmt = "";
        }
      }

      await pgClient.unsafe("COMMIT");
    } catch (error) {
      await pgClient.unsafe("ROLLBACK");
      throw error;
    }

    // 同步序列（必须在事务外执行）
    await syncSequencesAfterRestore(pgClient);

    return { success: true, message: "数据恢复成功", preBackupPath };
  } catch (error) {
    return {
      success: false,
      message: `恢复失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 恢复后同步所有表的序列
 */
async function syncSequencesAfterRestore(pgClient: any): Promise<void> {
  const tables = [
    { name: "users", sequence: "users_id_seq" },
    { name: "semesters", sequence: "semesters_id_seq" },
    { name: "grades", sequence: "grades_id_seq" },
    { name: "classes", sequence: "classes_id_seq" },
    { name: "students", sequence: "students_id_seq" },
    { name: "leave_records", sequence: "leave_records_id_seq" },
    { name: "system_config", sequence: "system_config_id_seq" },
    { name: "operation_logs", sequence: "operation_logs_id_seq" },
    { name: "fee_configs", sequence: "fee_configs_id_seq" },
    { name: "backup_records", sequence: "backup_records_id_seq" },
    { name: "backup_config", sequence: "backup_config_id_seq" },
  ];

  // 按 TABLE_DEPENDENCY_ORDER 的逆序同步（确保外键关系）
  const reverseOrder = [...TABLE_DEPENDENCY_ORDER].reverse().filter(
    (table) => tables.some((t) => t.name === table)
  );

  for (const tableName of reverseOrder) {
    const table = tables.find((t) => t.name === tableName);
    if (!table) continue;

    try {
      await pgClient.unsafe(
        `SELECT setval('${table.sequence}', (SELECT COALESCE(MAX(id), 1) FROM ${table.name}))`
      );
    } catch (error) {
      // 如果表是空的，重置序列到 1
      try {
        await pgClient.unsafe(`ALTER SEQUENCE ${table.sequence} RESTART WITH 1`);
      } catch (e) {
        // 忽略不存在的序列
      }
    }
  }
}

/**
 * 获取备份文件存储目录
 */
export function getBackupDir(): string {
  const backupDir = path.join(process.cwd(), "data", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

/**
 * 生成备份文件名
 */
export function generateBackupFileName(name: string): string {
  // 清理文件名：移除或替换无效字符
  const sanitizedName = name
    .replace(/[\/\\:*?"<>|]/g, "-")  // 替换无效字符为短横线
    .replace(/\s+/g, "_")             // 替换空格为下划线
    .substring(0, 100);               // 限制长度

  // 使用本地时间而非 UTC 时间，保持与前端显示一致
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const timestamp = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
  return `${sanitizedName}_${timestamp}.sql`;
}

/**
 * 删除备份文件
 */
export function deleteBackupFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
