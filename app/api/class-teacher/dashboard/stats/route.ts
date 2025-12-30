import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getRawPostgres } from "@/lib/db";
import { getCurrentSemester } from "@/lib/api/semesters";
import type { ClassTeacherDashboardStats } from "@/types";

/**
 * GET /api/class-teacher/dashboard/stats - 获取班主任仪表盘统计数据
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
    const currentSemester = await getCurrentSemester();
    if (!currentSemester) {
      return NextResponse.json({ error: "未设置当前学期" }, { status: 400 });
    }

    const pgClient = getRawPostgres();
    const semesterId = currentSemester.id;

    // 3. 查询班主任负责的班级
    const classRowResult = await pgClient.unsafe(`
      SELECT c.id, c.name, g.name as grade_name
      FROM classes c
      INNER JOIN grades g ON c.grade_id = g.id
      WHERE c.class_teacher_id = $1 AND c.semester_id = $2
    `, [currentUser.id, semesterId]);
    const classRow = classRowResult[0] as { id: number; name: string; grade_name: string } | undefined;

    if (!classRow) {
      return NextResponse.json({ error: "您尚未分配任何班级" }, { status: 400 });
    }

    const classId = classRow.id;

    // 4. 获取学生统计
    const studentStatsResult = await pgClient.unsafe(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_nutrition_meal = true THEN 1 ELSE 0 END) as nutrition_meal
      FROM students
      WHERE class_id = $1 AND is_active = true
    `, [classId]);
    const studentStats = studentStatsResult[0] as { total: number; nutrition_meal: number };

    // 5. 获取请假统计
    const leaveStatsResult = await pgClient.unsafe(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM leave_records
      WHERE semester_id = $1 AND student_id IN (SELECT id FROM students WHERE class_id = $2)
    `, [semesterId, classId]);
    const leaveStats = leaveStatsResult[0] as { total: number; pending: number; approved: number; rejected: number };

    // 6. 获取退费统计（注意：refund_amount 是 text 类型，需要转换为 numeric）
    const refundStatsResult = await pgClient.unsafe(`
      SELECT
        COALESCE(SUM(CAST(refund_amount AS NUMERIC)), 0) as total_refund_amount,
        COUNT(DISTINCT student_id) as refund_students_count
      FROM leave_records
      WHERE semester_id = $1
        AND status = 'approved'
        AND is_refund = true
        AND student_id IN (SELECT id FROM students WHERE class_id = $2)
    `, [semesterId, classId]);
    const refundStats = refundStatsResult[0] as { total_refund_amount: number; refund_students_count: number };

    // 7. 组装返回数据
    const stats: ClassTeacherDashboardStats = {
      semester: {
        id: currentSemester.id,
        name: currentSemester.name,
        start_date: currentSemester.start_date,
        end_date: currentSemester.end_date,
      },
      class: {
        id: classRow.id,
        name: classRow.name,
        grade_name: classRow.grade_name,
      },
      students: {
        total: studentStats.total,
        nutrition_meal: studentStats.nutrition_meal || 0,
      },
      leaves: {
        total: leaveStats.total || 0,
        pending: leaveStats.pending || 0,
        approved: leaveStats.approved || 0,
        rejected: leaveStats.rejected || 0,
      },
      refunds: {
        total_refund_amount: refundStats.total_refund_amount || 0,
        refund_students_count: refundStats.refund_students_count || 0,
      },
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("获取班主任仪表盘统计数据失败:", error);
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 });
  }
}
