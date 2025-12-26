import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { generateBackupSQL, getBackupDir, generateBackupFileName } from "@/lib/utils/backup";
import { logBackup } from "@/lib/utils/logger";
import fs from "fs";
import type { BackupRecordInput } from "@/types";

/**
 * POST /api/backup/create - 创建备份
 */
export async function POST(request: NextRequest) {
  try {
    // 权限验证
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_BACKUP)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await request.json()) as BackupRecordInput;
    const { name, type, modules, description } = body;

    // 验证必填字段
    if (!name || !type || !modules || modules.length === 0) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 生成 SQL
    const sqlContent = generateBackupSQL(modules);

    // 保存文件
    const backupDir = getBackupDir();
    const fileName = generateBackupFileName(name);
    const filePath = `${backupDir}/${fileName}`;

    fs.writeFileSync(filePath, sqlContent, "utf-8");

    // 记录到数据库
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const result = db
      .prepare(
        `
        INSERT INTO backup_records (name, type, modules, file_path, file_size, created_by, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        name,
        type,
        JSON.stringify(modules),
        filePath,
        Buffer.byteLength(sqlContent, "utf-8"),
        currentUser.id,
        description || null
      );

    // 记录备份日志
    await logBackup(currentUser.id, `创建备份：${name}（${type}），模块：${modules.join(", ")}`);

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      message: "备份创建成功",
    });
  } catch (error) {
    console.error("创建备份失败:", error);
    return NextResponse.json(
      { error: "创建备份失败" },
      { status: 500 }
    );
  }
}
