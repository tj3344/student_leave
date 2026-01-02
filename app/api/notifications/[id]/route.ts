import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { deleteNotification } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

/**
 * DELETE /api/notifications/[id] - 删除通知
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.NOTIFICATION_DELETE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const notificationId = parseInt(params.id, 10);
    const result = await deleteNotification(notificationId, currentUser.id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除通知失败:", error);
    return NextResponse.json({ error: "删除通知失败" }, { status: 500 });
  }
}
