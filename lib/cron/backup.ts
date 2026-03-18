import { getRawPostgres } from "@/lib/db";
import { generateBackupSQL, getBackupDir, generateBackupFileName } from "@/lib/utils/backup";
import fs from "fs";
import type { BackupModule } from "@/types";

/**
 * 定时备份任务调度器
 * 使用 node-cron 实现定时自动备份
 */

let schedulerInitialized = false;

// 记录最后一次执行备份的日期（年-月-日格式），防止同一天多次执行
let lastExecutionDate: string | null = null;

/**
 * 执行自动备份
 */
export async function executeAutoBackup(): Promise<boolean> {
  try {
    const pgClient = getRawPostgres();

    // 获取自动备份配置
    const config = await pgClient.unsafe("SELECT * FROM backup_config WHERE enabled = true");
    const configRow = config[0];

    if (!configRow) {
      return false;
    }

    // 检查是否符合备份时间
    const [hour, minute] = configRow.schedule_time.split(":").map(Number);
    const now = new Date();

    // 检查是否已在本日执行过（防止同一天多次执行）
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (lastExecutionDate === todayKey) {
      return false; // 今日已执行，跳过
    }

    // 时间匹配检查（精确匹配小时和分钟）
    if (now.getHours() !== hour || now.getMinutes() !== minute) {
      return false;
    }

    // 标记今日已执行
    lastExecutionDate = todayKey;

    // 解析备份模块
    const modules = JSON.parse(configRow.modules) as BackupModule[];

    // 生成备份
    const sqlContent = await generateBackupSQL(modules);

    const backupDir = getBackupDir();
    const fileName = generateBackupFileName("自动备份");
    const filePath = `${backupDir}/${fileName}`;

    fs.writeFileSync(filePath, sqlContent, "utf-8");

    // 记录到数据库
    await pgClient.unsafe(
      `
      INSERT INTO backup_records (name, type, modules, file_path, file_size, created_by, description, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `,
      [
        "自动备份",
        configRow.backup_type,
        configRow.modules,
        filePath,
        Buffer.byteLength(sqlContent, "utf-8"),
        1, // 系统用户 (admin)
        `自动备份 - ${new Date().toLocaleString("zh-CN")}`
      ]
    );

    // 清理过期备份（先查询要删除的记录，获取文件路径）
    const retentionDays = configRow.retention_days || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // 先查询过期的备份记录（获取文件路径）
    const expiredBackups = await pgClient.unsafe(
      `
      SELECT file_path FROM backup_records
      WHERE created_at < $1 AND name LIKE '自动备份%'
    `,
      [cutoffDate.toISOString()]
    );

    // 删除过期的备份文件
    for (const backup of expiredBackups) {
      try {
        if (fs.existsSync(backup.file_path)) {
          fs.unlinkSync(backup.file_path);
          console.log(`[Backup] 已删除过期备份文件: ${backup.file_path}`);
        }
      } catch (error) {
        console.error(`[Backup] 删除备份文件失败: ${backup.file_path}`, error);
      }
    }

    // 删除过期的数据库记录
    await pgClient.unsafe(
      `
      DELETE FROM backup_records
      WHERE created_at < $1 AND name LIKE '自动备份%'
    `,
      [cutoffDate.toISOString()]
    );

    console.log(`[${new Date().toISOString()}] 自动备份执行成功: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 自动备份执行失败:`, error);
    return false;
  }
}

/**
 * 启动定时备份调度器
 * 仅在服务端环境中运行
 */
export function startBackupScheduler() {
  // 确保只初始化一次
  if (schedulerInitialized) {
    return;
  }

  // 仅在 Node.js 环境中运行
  if (typeof window !== "undefined") {
    return;
  }

  try {
    // 动态导入 node-cron
    import("node-cron").then((cron) => {
      // 每分钟检查一次是否需要执行备份（支持精确到分钟的备份时间）
      cron.schedule("* * * * *", async () => {
        await executeAutoBackup();
      });

      schedulerInitialized = true;
      console.log("[Backup] 定时备份调度器已启动");
    });
  } catch (error) {
    console.error("[Backup] 启动定时备份调度器失败:", error);
  }
}

/**
 * 手动触发备份（用于测试）
 * 注意：此函数会跳过时间检查，直接执行备份
 */
export async function triggerManualBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const pgClient = getRawPostgres();

    // 获取自动备份配置（不检查 enabled 状态，允许手动触发）
    const config = await pgClient.unsafe("SELECT * FROM backup_config WHERE id = 1");
    const configRow = config[0];

    if (!configRow) {
      return { success: false, message: "未找到自动备份配置" };
    }

    if (!configRow.enabled) {
      return { success: false, message: "自动备份功能未启用" };
    }

    // 解析备份模块
    const modules = JSON.parse(configRow.modules) as BackupModule[];

    // 生成备份
    const sqlContent = await generateBackupSQL(modules);

    const backupDir = getBackupDir();
    const fileName = generateBackupFileName("手动备份-测试");
    const filePath = `${backupDir}/${fileName}`;

    fs.writeFileSync(filePath, sqlContent, "utf-8");

    // 记录到数据库
    await pgClient.unsafe(
      `
      INSERT INTO backup_records (name, type, modules, file_path, file_size, created_by, description, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `,
      [
        "手动备份-测试",
        configRow.backup_type,
        configRow.modules,
        filePath,
        Buffer.byteLength(sqlContent, "utf-8"),
        1, // 系统用户 (admin)
        `手动触发备份测试 - ${new Date().toLocaleString("zh-CN")}`
      ]
    );

    console.log(`[${new Date().toISOString()}] 手动备份执行成功: ${fileName}`);
    return { success: true, message: `手动备份执行成功: ${fileName}` };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 手动备份执行失败:`, error);
    return {
      success: false,
      message: `手动备份执行失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
