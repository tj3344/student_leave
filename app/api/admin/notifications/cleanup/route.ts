import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getRawPostgres } from "@/lib/db";
import { hasPermission, PERMISSIONS, OPERATION_MODULES } from "@/lib/constants";
import { logCreate } from "@/lib/utils/logger";

interface CleanupRequest {
  type: "read" | "old" | "all";
  daysOld?: number;
}

/**
 * POST /api/admin/notifications/cleanup - 清理通知
 * type: read - 清理所有已读通知
 * type: old - 清理指定天数之前的已读通知
 * type: all - 清理所有通知（危险操作）
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.NOTIFICATION_DELETE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await request.json()) as CleanupRequest;
    const { type, daysOld = 30 } = body;

    const pgClient = getRawPostgres();

    let deleteQuery = "";
    let queryParams: (string | number)[] = [];
    let description = "";

    switch (type) {
      case "read":
        // 只删除所有接收者都已读的通知批次
        deleteQuery = `
          DELETE FROM notifications
          WHERE sender_id = $1
            AND (title, content, type, DATE_TRUNC('minute', created_at)) IN (
              SELECT title, content, type, DATE_TRUNC('minute', created_at)
              FROM notifications
              WHERE sender_id = $1
              GROUP BY title, content, type, DATE_TRUNC('minute', created_at)
              HAVING COUNT(*) = SUM(CASE WHEN is_read THEN 1 ELSE 0 END)
            )
        `;
        queryParams = [currentUser.id];
        description = "清理已读通知（仅删除所有接收者都已读的批次）";
        break;

      case "old":
        // 只删除所有接收者都已读的旧通知批次
        deleteQuery = `
          DELETE FROM notifications
          WHERE sender_id = $1
            AND is_read = true
            AND created_at < CURRENT_DATE - INTERVAL '${daysOld} days'
            AND (title, content, type, DATE_TRUNC('minute', created_at)) IN (
              SELECT title, content, type, DATE_TRUNC('minute', created_at)
              FROM notifications
              WHERE sender_id = $1
                AND created_at < CURRENT_DATE - INTERVAL '${daysOld} days'
              GROUP BY title, content, type, DATE_TRUNC('minute', created_at)
              HAVING COUNT(*) = SUM(CASE WHEN is_read THEN 1 ELSE 0 END)
            )
        `;
        queryParams = [currentUser.id];
        description = `清理 ${daysOld} 天前的已读通知（仅删除所有接收者都已读的批次）`;
        break;

      case "all":
        deleteQuery = `DELETE FROM notifications WHERE sender_id = $1`;
        queryParams = [currentUser.id];
        description = "清理所有通知";
        break;

      default:
        return NextResponse.json({ error: "无效的清理类型" }, { status: 400 });
    }

    const result = await pgClient.unsafe(deleteQuery, queryParams);

    // 记录日志
    await logCreate(
      currentUser.id,
      OPERATION_MODULES.NOTIFICATIONS,
      `${description}：删除 ${result.count} 条`
    );

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `成功删除 ${result.count} 条通知`,
    });
  } catch (error) {
    console.error("清理通知失败:", error);
    return NextResponse.json({ error: "清理通知失败" }, { status: 500 });
  }
}
