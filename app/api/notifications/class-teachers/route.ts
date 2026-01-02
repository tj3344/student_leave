import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getAllClassTeachersForNotification } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

/**
 * GET /api/notifications/class-teachers - 获取所有班主任列表
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.NOTIFICATION_SEND)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const teachers = await getAllClassTeachersForNotification();

    return NextResponse.json({ data: teachers });
  } catch (error) {
    console.error("获取班主任列表失败:", error);
    return NextResponse.json({ error: "获取班主任列表失败" }, { status: 500 });
  }
}
