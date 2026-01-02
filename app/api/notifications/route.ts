import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getNotifications } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

/**
 * GET /api/notifications - 获取当前用户的通知列表
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const is_read = searchParams.get("is_read");
    const type = searchParams.get("type");
    const sender_id = searchParams.get("sender_id");
    const sort = searchParams.get("sort") || "created_at";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    const result = await getNotifications(currentUser.id, {
      page,
      limit,
      search: search || undefined,
      is_read: is_read ? is_read === "true" : undefined,
      type: type || undefined,
      sender_id: sender_id ? parseInt(sender_id, 10) : undefined,
      sort,
      order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取通知列表失败:", error);
    return NextResponse.json({ error: "获取通知列表失败" }, { status: 500 });
  }
}
