import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getRawPostgres } from "@/lib/db";
import { getCurrentSemester } from "@/lib/api/semesters";

/**
 * GET /api/class-teacher/class - 获取班主任管理的班级信息
 */
export async function GET() {
  try {
    // 1. 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (currentUser.role !== "class_teacher") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    // 2. 获取当前学期
    const currentSemester = getCurrentSemester();
    if (!currentSemester) {
      return NextResponse.json({ error: "未设置当前学期" }, { status: 400 });
    }

    const pgClient = getRawPostgres();
    const semesterId = currentSemester.id;

    // 3. 查询班主任负责的班级
    const classRowResult = await pgClient.unsafe(`
      SELECT c.id, c.name, c.grade_id, g.name as grade_name
      FROM classes c
      INNER JOIN grades g ON c.grade_id = g.id
      WHERE c.class_teacher_id = $1 AND c.semester_id = $2
    `, [currentUser.id, semesterId]);
    const classRow = classRowResult[0] as
      | { id: number; name: string; grade_id: number; grade_name: string }
      | undefined;

    if (!classRow) {
      return NextResponse.json({ error: "您尚未分配任何班级" }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        id: classRow.id,
        name: classRow.name,
        grade_id: classRow.grade_id,
        grade_name: classRow.grade_name,
      },
    });
  } catch (error) {
    console.error("获取班主任班级信息失败:", error);
    return NextResponse.json({ error: "获取班级信息失败" }, { status: 500 });
  }
}
