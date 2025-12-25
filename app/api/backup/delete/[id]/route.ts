import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { deleteBackupFile } from "@/lib/utils/backup";

/**
 * DELETE /api/backup/delete/[id] - 删除备份
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_BACKUP)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await params;
    const { getDb } = await import("@/lib/db");
    const db = getDb();

    // 获取备份记录
    const record = db
      .prepare("SELECT * FROM backup_records WHERE id = ?")
      .get(id) as { file_path: string } | undefined;

    if (!record) {
      return NextResponse.json({ error: "备份不存在" }, { status: 404 });
    }

    // 删除文件
    deleteBackupFile(record.file_path);

    // 删除数据库记录
    db.prepare("DELETE FROM backup_records WHERE id = ?").run(id);

    return NextResponse.json({ success: true, message: "备份删除成功" });
  } catch (error) {
    console.error("删除备份失败:", error);
    return NextResponse.json({ error: "删除备份失败" }, { status: 500 });
  }
}
