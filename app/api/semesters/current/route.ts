import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/api/auth";
import { getCurrentSemester } from "@/lib/api/semesters";
import { PERMISSIONS } from "@/lib/constants";

// GET /api/semesters/current - 获取当前学期
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.SEMESTER_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const currentSemester = getCurrentSemester();

    if (!currentSemester) {
      return NextResponse.json({ error: "未找到当前学期" }, { status: 404 });
    }

    return NextResponse.json(currentSemester);
  } catch (error) {
    console.error("Get current semester error:", error);
    return NextResponse.json({ error: "获取当前学期失败" }, { status: 500 });
  }
}
