import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import fs from "fs";

/**
 * GET /api/backup/download/[id] - 下载备份文件
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_BACKUP)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { getDb } = await import("@/lib/db");
    const db = getDb();

    const record = db
      .prepare("SELECT * FROM backup_records WHERE id = ?")
      .get(params.id) as { file_path: string; name: string } | undefined;

    if (!record) {
      return NextResponse.json({ error: "备份不存在" }, { status: 404 });
    }

    // 检查文件是否存在
    if (!fs.existsSync(record.file_path)) {
      return NextResponse.json({ error: "备份文件不存在" }, { status: 404 });
    }

    const sqlContent = fs.readFileSync(record.file_path, "utf-8");
    const fileName = `${record.name}.sql`;

    return new NextResponse(sqlContent, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("下载备份失败:", error);
    return NextResponse.json({ error: "下载备份失败" }, { status: 500 });
  }
}
