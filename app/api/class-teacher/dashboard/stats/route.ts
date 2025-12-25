import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getDb } from "@/lib/db";
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
    const currentSemester = getCurrentSemester();
    if (!currentSemester) {
      return NextResponse.json({ error: "未设置当前学期" }, { status: 400 });
    }

    const db = getDb();
    const semesterId = currentSemester.id;

    // 3. 查询班主任负责的班级
    const classRow = db.prepare(`
      SELECT c.id, c.name, g.name as grade_name
      FROM classes c
      INNER JOIN grades g ON c.grade_id = g.id
      WHERE c.class_teacher_id = ? AND c.semester_id = ?
    `).get(currentUser.id, semesterId) as { id: number; name: string; grade_name: string } | undefined;

    if (!classRow) {
      return NextResponse.json({ error: "您尚未分配任何班级" }, { status: 400 });
    }

    const classId = classRow.id;

    // 4. 获取学生统计
    const studentStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_nutrition_meal = 1 THEN 1 ELSE 0 END) as nutrition_meal
      FROM students
      WHERE class_id = ? AND is_active = 1
    `).get(classId) as { total: number; nutrition_meal: number };

    // 5. 获取请假统计
    const leaveStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM leave_records
      WHERE semester_id = ? AND student_id IN (SELECT id FROM students WHERE class_id = ?)
    `).get(semesterId, classId) as { total: number; pending: number; approved: number; rejected: number };

    // 6. 获取退费统计
    const refundStats = db.prepare(`
      SELECT
        COALESCE(SUM(refund_amount), 0) as total_refund_amount,
        COUNT(DISTINCT student_id) as refund_students_count
      FROM leave_records
      WHERE semester_id = ?
        AND status = 'approved'
        AND is_refund = 1
        AND student_id IN (SELECT id FROM students WHERE class_id = ?)
    `).get(semesterId, classId) as { total_refund_amount: number; refund_students_count: number };

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
        nutrition_meal: studentStats.nutrition_meal,
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
