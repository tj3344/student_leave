import { getDb } from "@/lib/db";
import type { BackupModule } from "@/types";
import fs from "fs";
import path from "path";

/**
 * 表的依赖顺序（考虑外键关系）
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
];

/**
 * 生成 SQL INSERT 语句（处理字符串转义）
 */
function escapeSQL(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  // 转义单引号
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * 生成单个表的 INSERT 语句
 */
export function generateTableInserts(tableName: BackupModule): string {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM ${tableName}`).all() as Record<string, unknown>[];

  if (rows.length === 0) {
    return `-- 表 ${tableName} 无数据\n\n`;
  }

  const columns = Object.keys(rows[0]);
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
export function generateBackupSQL(modules: BackupModule[]): string {
  let sql = `-- ========================================\n`;
  sql += `-- 学生请假管理系统数据备份\n`;
  sql += `-- 备份时间: ${new Date().toLocaleString("zh-CN")}\n`;
  sql += `-- ========================================\n\n`;

  sql += `BEGIN TRANSACTION;\n\n`;

  // 按依赖顺序生成
  for (const table of TABLE_DEPENDENCY_ORDER) {
    if (modules.includes(table)) {
      sql += generateTableInserts(table);
    }
  }

  sql += `COMMIT;\n`;

  return sql;
}

/**
 * 执行 SQL 恢复
 */
export function restoreFromSQL(
  sqlContent: string
): { success: boolean; message: string; preBackupPath?: string } {
  const db = getDb();

  try {
    // 恢复前自动备份当前数据
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const backupDir = path.join(process.cwd(), "data", "backups");
    const preBackupPath = path.join(backupDir, `pre-restore-${timestamp}.sql`);

    // 确保备份目录存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const preBackupSQL = generateBackupSQL(TABLE_DEPENDENCY_ORDER);
    fs.writeFileSync(preBackupPath, preBackupSQL, "utf-8");

    // 开始事务恢复
    db.transaction(() => {
      // 删除现有数据（按依赖逆序）
      const reversedOrder = [...TABLE_DEPENDENCY_ORDER].reverse();
      for (const table of reversedOrder) {
        db.prepare(`DELETE FROM ${table}`).run();
      }

      // 执行恢复 SQL
      const statements = sqlContent
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("--") && s.toUpperCase().includes("INSERT"));

      for (const stmt of statements) {
        db.prepare(stmt).run();
      }
    })();

    return { success: true, message: "数据恢复成功", preBackupPath };
  } catch (error) {
    return {
      success: false,
      message: `恢复失败: ${error instanceof Error ? error.message : String(error)}`,
    };
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
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
