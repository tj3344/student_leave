import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { validatePath, getBackupDirectory } from "@/lib/utils/path-security";
import fs from "fs";
import path from "path";

/**
 * GET /api/backup/download/[id] - 下载备份文件
 */
export async function GET(
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
    const { getRawPostgres } = await import("@/lib/db");
    const pgClient = getRawPostgres();

    const recordResult = await pgClient.unsafe("SELECT * FROM backup_records WHERE id = $1", [id]);
    const record = recordResult[0] as { file_path: string; name: string } | undefined;

    if (!record) {
      return NextResponse.json({ error: "备份不存在" }, { status: 404 });
    }

    // 获取允许的备份目录
    const allowedBackupDir = getBackupDirectory();

    // 验证文件路径是否安全（防止路径遍历攻击）
    const safePath = validatePath(record.file_path, allowedBackupDir);

    if (!safePath) {
      // 路径验证失败，可能是路径遍历攻击
      return NextResponse.json({ error: "非法的文件路径" }, { status: 403 });
    }

    // 检查文件是否存在
    if (!fs.existsSync(safePath)) {
      return NextResponse.json({ error: "备份文件不存在" }, { status: 404 });
    }

    // 验证是文件而不是目录
    const stat = fs.statSync(safePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "备份文件不存在" }, { status: 404 });
    }

    // 验证文件扩展名（只允许 .sql 文件）
    if (!safePath.endsWith(".sql")) {
      return NextResponse.json({ error: "非法的文件类型" }, { status: 403 });
    }

    const sqlContent = fs.readFileSync(safePath, "utf-8");
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
