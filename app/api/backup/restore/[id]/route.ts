import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { restoreFromSQL } from "@/lib/utils/backup";
import { logRestore } from "@/lib/utils/logger";
import fs from "fs";

/**
 * POST /api/backup/restore/[id] - 从备份记录恢复
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_RESTORE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await params;
    const { getDb } = await import("@/lib/db");
    const db = getDb();

    // 获取备份记录
    const record = db
      .prepare("SELECT * FROM backup_records WHERE id = ?")
      .get(id) as { file_path: string; name: string } | undefined;

    if (!record) {
      return NextResponse.json({ error: "备份不存在" }, { status: 404 });
    }

    // 检查文件是否存在
    if (!fs.existsSync(record.file_path)) {
      return NextResponse.json({ error: "备份文件不存在" }, { status: 404 });
    }

    // 读取 SQL 内容
    const sqlContent = fs.readFileSync(record.file_path, "utf-8");

    // 执行恢复
    const result = restoreFromSQL(sqlContent);

    if (result.success) {
      // 记录恢复日志
      await logRestore(currentUser.id, `从备份恢复数据：${record.name}`);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("恢复备份失败:", error);
    return NextResponse.json(
      { error: "恢复备份失败", message: String(error) },
      { status: 500 }
    );
  }
}
