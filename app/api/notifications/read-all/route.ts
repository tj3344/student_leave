import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { markAllAsRead } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

/**
 * PUT /api/notifications/read-all - 标记所有通知为已读
 */
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.NOTIFICATION_MARK_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const result = await markAllAsRead(currentUser.id);

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("批量标记已读失败:", error);
    return NextResponse.json({ error: "批量标记已读失败" }, { status: 500 });
  }
}
