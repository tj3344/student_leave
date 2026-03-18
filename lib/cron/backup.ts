import { getRawPostgres } from "@/lib/db";
import { generateBackupSQL, getBackupDir, generateBackupFileName } from "@/lib/utils/backup";
import fs from "fs";
import type { BackupModule } from "@/types";

/**
 * 定时备份任务调度器
 * 使用 node-cron 实现定时自动备份
 */

// 使用全局变量确保在整个 Node.js 进程中只初始化一次
const globalForBackup = global as typeof global & {
  backupSchedulerInitialized?: boolean;
  lastBackupExecutionDate?: string | null;
  isBackupExecuting?: boolean; // 防止并发执行
};

/**
 * 执行自动备份
 */
export async function executeAutoBackup(): Promise<boolean> {
  // 添加日志记录调度触发
  console.log("[Backup] executeAutoBackup 被调用");

  // 防止并发执行
  if (globalForBackup.isBackupExecuting) {
    console.log("[Backup] 备份正在执行中，跳过本次调度");
    return false;
  }

  try {
    globalForBackup.isBackupExecuting = true;

    const pgClient = getRawPostgres();

    // 获取自动备份配置
    const config = await pgClient.unsafe("SELECT * FROM backup_config WHERE enabled = true");
    console.log("[Backup] 查询配置结果:", config.length, "条");
    const configRow = config[0];

    if (!configRow) {
      console.log("[Backup] 没有找到启用的自动备份配置");
      return false;
    }

    console.log("[Backup] 配置信息:", {
      schedule_time: configRow.schedule_time,
      backup_type: configRow.backup_type,
      modules: configRow.modules,
    });

    // 检查是否符合备份时间
    const [hour, minute] = configRow.schedule_time.split(":").map(Number);
    const now = new Date();
    console.log("[Backup] 时间检查 - 配置:", configRow.schedule_time, "当前:", `${now.getHours()}:${now.getMinutes()}`);

    // 检查是否已在本日执行过（防止同一天多次执行）
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (globalForBackup.lastBackupExecutionDate === todayKey) {
      console.log("[Backup] 今日已执行，跳过");
      return false; // 今日已执行，跳过
    }

    // 时间匹配检查（精确匹配小时和分钟）
    if (now.getHours() !== hour || now.getMinutes() !== minute) {
      console.log("[Backup] 时间不匹配，跳过");
      return false;
    }

    console.log("[Backup] 时间匹配！开始执行备份...");

    // 标记今日已执行（同步到全局变量）
    globalForBackup.lastBackupExecutionDate = todayKey;

    // 解析备份模块
    const modules = JSON.parse(configRow.modules) as BackupModule[];
    console.log("[Backup] 解析后的模块:", modules);

    // 生成备份
    console.log("[Backup] 开始生成备份 SQL...");
    const sqlContent = await generateBackupSQL(modules);
    console.log("[Backup] SQL 生成完成，大小:", sqlContent.length, "字节");

    const backupDir = getBackupDir();
    const fileName = generateBackupFileName("自动备份", true);
    const filePath = `${backupDir}/${fileName}`;
    console.log("[Backup] 备份文件路径:", filePath);

    fs.writeFileSync(filePath, sqlContent, "utf-8");
    console.log("[Backup] 文件写入成功");

    // 记录到数据库（名称格式与手动备份一致）
    const backupName = `自动备份_${now.toLocaleString()}`;

    await pgClient.unsafe(
      `
      INSERT INTO backup_records (name, type, modules, file_path, file_size, created_by, description, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `,
      [
        backupName,
        configRow.backup_type,
        configRow.modules,
        filePath,
        Buffer.byteLength(sqlContent, "utf-8"),
        1, // 系统用户 (admin)
        `自动备份 - ${now.toLocaleString("zh-CN")}`
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
  } finally {
    // 重置执行状态，允许下一次执行
    globalForBackup.isBackupExecuting = false;
  }
}

/**
 * 启动定时备份调度器
 * 仅在服务端环境中运行
 */
export function startBackupScheduler() {
  console.log("[Backup] startBackupScheduler 被调用");

  // 仅在 Node.js 环境中运行
  if (typeof window !== "undefined") {
    console.log("[Backup] 跳过：在浏览器环境中运行");
    return;
  }

  // 使用全局变量确保在整个 Node.js 进程中只初始化一次
  if (globalForBackup.backupSchedulerInitialized) {
    console.log("[Backup] 调度器已初始化，跳过重复启动");
    return;
  }

  console.log("[Backup] 开始初始化调度器...");

  try {
    // 动态导入 node-cron
    import("node-cron").then((cron) => {
      console.log("[Backup] node-cron 加载成功，准备调度");
      // 每分钟检查一次是否需要执行备份（支持精确到分钟的备份时间）
      cron.schedule("* * * * *", async () => {
        await executeAutoBackup();
      });

      globalForBackup.backupSchedulerInitialized = true;
      console.log("[Backup] 定时备份调度器已启动");
    }).catch((err) => {
      console.error("[Backup] node-cron 加载失败:", err);
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
