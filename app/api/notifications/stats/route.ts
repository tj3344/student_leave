import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getNotificationStats } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

/**
 * GET /api/notifications/stats - 获取通知统计
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.NOTIFICATION_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const stats = await getNotificationStats(currentUser.id);

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("获取通知统计失败:", error);
    return NextResponse.json({ error: "获取通知统计失败" }, { status: 500 });
  }
}
