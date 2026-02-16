import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getAllClassTeachersForNotification } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { getCurrentSemester } from "@/lib/api/semesters";

/**
 * GET /api/notifications/class-teachers - 获取当前学期的班主任列表
 * 查询参数：
 * - semester_id: 可选，指定学期ID，如果不传则使用当前学期
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

    // 获取学期参数，如果没有传递则使用当前学期
    const searchParams = request.nextUrl.searchParams;
    const semesterParam = searchParams.get("semester_id");
    let semesterId: number | undefined;

    if (semesterParam) {
      semesterId = parseInt(semesterParam, 10);
      if (isNaN(semesterId)) {
        return NextResponse.json({ error: "无效的学期ID" }, { status: 400 });
      }
    } else {
      // 如果没有指定学期，使用当前学期
      const currentSemester = await getCurrentSemester();
      if (currentSemester) {
        semesterId = currentSemester.id;
      }
    }

    const teachers = await getAllClassTeachersForNotification(semesterId);

    return NextResponse.json({ data: teachers });
  } catch (error) {
    console.error("获取班主任列表失败:", error);
    return NextResponse.json({ error: "获取班主任列表失败" }, { status: 500 });
  }
}
