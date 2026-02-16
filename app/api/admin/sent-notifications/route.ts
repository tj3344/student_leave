import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getSentNotificationBatches } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { getCurrentSemester } from "@/lib/api/semesters";

/**
 * GET /api/admin/sent-notifications - 获取管理员发送的通知批次列表（聚合显示）
 * 查询参数：
 * - all: 可选，设置为 "true" 时显示所有学期的通知
 * 注意：默认只显示当前学期的通知
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
    const showAll = searchParams.get("all") === "true";

    // 获取学期日期范围，默认使用当前学期
    let semesterStartDate: string | undefined;
    let semesterEndDate: string | undefined;

    if (!showAll) {
      const currentSemester = await getCurrentSemester();
      if (currentSemester) {
        semesterStartDate = currentSemester.startDate;
        semesterEndDate = currentSemester.endDate;
      }
    }

    const result = await getSentNotificationBatches(currentUser.id, {
      page,
      limit,
      search: search || undefined,
      type: type || undefined,
      sort,
      order,
      semester_start_date: semesterStartDate,
      semester_end_date: semesterEndDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取发送通知批次列表失败:", error);
    return NextResponse.json({ error: "获取发送通知批次列表失败" }, { status: 500 });
  }
}
