import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { BackupRecordWithDetails } from "@/types";

/**
 * GET /api/backup/list - 获取备份列表
 */
export async function GET() {
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

    const records = db
      .prepare(
        `
        SELECT
          br.*,
          u.real_name as created_by_name,
          JSON_ARRAY_LENGTH(br.modules) as module_count
        FROM backup_records br
        LEFT JOIN users u ON br.created_by = u.id
        ORDER BY br.created_at DESC
      `
      )
      .all() as BackupRecordWithDetails[];

    return NextResponse.json({ data: records });
  } catch (error) {
    console.error("获取备份列表失败:", error);
    return NextResponse.json(
      { error: "获取备份列表失败" },
      { status: 500 }
    );
  }
}
