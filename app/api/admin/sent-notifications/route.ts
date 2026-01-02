import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getSentNotificationBatches } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

/**
 * GET /api/admin/sent-notifications - 获取管理员发送的通知批次列表（聚合显示）
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const sort = searchParams.get("sort") || "created_at";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    const result = await getSentNotificationBatches(currentUser.id, {
      page,
      limit,
      search: search || undefined,
      type: type || undefined,
      sort,
      order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取发送通知批次列表失败:", error);
    return NextResponse.json({ error: "获取发送通知批次列表失败" }, { status: 500 });
  }
}
