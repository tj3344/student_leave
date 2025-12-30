import { getRawPostgres } from "@/lib/db";
import { generateBackupSQL, getBackupDir, generateBackupFileName } from "@/lib/utils/backup";
import fs from "fs";
import type { BackupModule } from "@/types";

/**
 * 定时备份任务调度器
 * 使用 node-cron 实现定时自动备份
 */

let schedulerInitialized = false;

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

    // 简单的时间匹配检查（实际使用时由 cron 调度，这里仅作为保险）
    if (now.getHours() !== hour || now.getMinutes() !== minute) {
      return false;
    }

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

    // 清理过期备份
    const retentionDays = configRow.retention_days || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await pgClient.unsafe(
      `
      DELETE FROM backup_records
      WHERE created_at < $1 AND name LIKE '自动备份%'
    `,
      [cutoffDate.toISOString()]
    );

    // 同时删除对应的文件
    const expiredBackups = await pgClient.unsafe(
      `
      SELECT file_path FROM backup_records
      WHERE created_at < $1 AND name LIKE '自动备份%'
    `,
      [cutoffDate.toISOString()]
    );

    for (const backup of expiredBackups) {
      try {
        if (fs.existsSync(backup.file_path)) {
          fs.unlinkSync(backup.file_path);
        }
      } catch {
        // 忽略文件删除错误
      }
    }

    console.log(`[${new Date().toISOString()}] 自动备份执行成功`);
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
      // 每小时检查一次是否需要执行备份
      cron.schedule("0 * * * *", async () => {
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
 */
export async function triggerManualBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await executeAutoBackup();
    if (result) {
      return { success: true, message: "手动备份执行成功" };
    } else {
      return { success: false, message: "未配置自动备份或时间不匹配" };
    }
  } catch (error) {
    return {
      success: false,
      message: `手动备份执行失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
