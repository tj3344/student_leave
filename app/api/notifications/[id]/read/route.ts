import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { markNotificationAsRead } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

/**
 * PUT /api/notifications/[id]/read - 标记通知为已读
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.NOTIFICATION_MARK_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await params;
    const notificationId = parseInt(id, 10);
    const result = await markNotificationAsRead(notificationId, currentUser.id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("标记已读失败:", error);
    return NextResponse.json({ error: "标记已读失败" }, { status: 500 });
  }
}
