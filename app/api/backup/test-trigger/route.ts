import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { generateBackupSQL, getBackupDir, generateBackupFileName } from "@/lib/utils/backup";
import fs from "fs";
import type { BackupModule } from "@/types";

/**
 * POST /api/backup/test-trigger - 测试触发自动备份
 * 跳过时间和每日执行限制，用于测试配置是否正确
 */
export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_BACKUP)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { getRawPostgres } = await import("@/lib/db");
    const pgClient = getRawPostgres();

    // 获取自动备份配置
    const config = await pgClient.unsafe("SELECT * FROM backup_config WHERE id = 1");
    const configRow = config[0];

    if (!configRow) {
      return NextResponse.json({ error: "未找到自动备份配置" }, { status: 400 });
    }

    if (!configRow.enabled) {
      return NextResponse.json({ error: "自动备份未启用" }, { status: 400 });
    }

    // 解析备份模块
    const modules = JSON.parse(configRow.modules) as BackupModule[];

    if (modules.length === 0) {
      return NextResponse.json({ error: "没有选择备份模块" }, { status: 400 });
    }

    // 生成备份
    const sqlContent = await generateBackupSQL(modules);

    const backupDir = getBackupDir();
    const now = new Date();
    const fileName = generateBackupFileName("测试备份", true);
    const filePath = `${backupDir}/${fileName}`;

    fs.writeFileSync(filePath, sqlContent, "utf-8");

    // 记录到数据库
    const backupName = `测试备份_${now.toLocaleString()}`;

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
        currentUser.id,
        `测试备份 - ${configRow.backup_type} (${modules.length}个模块)`
      ]
    );

    return NextResponse.json({
      success: true,
      message: `测试备份成功！已创建 ${modules.length} 个模块的${configRow.backup_type === "full" ? "全量" : "部分"}备份`,
      fileName,
      fileSize: Buffer.byteLength(sqlContent, "utf-8"),
    });
  } catch (error) {
    console.error("测试备份失败:", error);
    return NextResponse.json(
      { error: `测试备份失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
