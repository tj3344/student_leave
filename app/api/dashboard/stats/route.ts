import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getDb } from "@/lib/db";
import { getCurrentSemester } from "@/lib/api/semesters";
import type { DashboardStats } from "@/types";

// 缓存配置：统计数据缓存 1 小时
export const revalidate = 3600;

/**
 * GET /api/dashboard/stats - 获取管理员仪表盘统计数据
 */
export async function GET() {
  try {
    // 1. 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    // 2. 获取当前学期
    const currentSemester = getCurrentSemester();
    if (!currentSemester) {
      return NextResponse.json({ error: "未设置当前学期" }, { status: 400 });
    }

    const db = getDb();
    const semesterId = currentSemester.id;

    // 3. 获取学生统计
    const studentStats = db.prepare(`
      SELECT
        COUNT(DISTINCT s.id) as total,
        SUM(CASE WHEN s.is_nutrition_meal = 1 THEN 1 ELSE 0 END) as nutrition_meal
      FROM students s
      INNER JOIN classes c ON s.class_id = c.id
      WHERE c.semester_id = ? AND s.is_active = 1
    `).get(semesterId) as { total: number; nutrition_meal: number };

    // 4. 获取请假统计
    const leaveStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM leave_records
      WHERE semester_id = ?
    `).get(semesterId) as { total: number; pending: number; approved: number; rejected: number };

    // 5. 获取退费统计
    const refundStats = db.prepare(`
      SELECT
        COALESCE(SUM(refund_amount), 0) as total_refund_amount,
        COUNT(DISTINCT student_id) as refund_students_count
      FROM leave_records
      WHERE semester_id = ?
        AND status = 'approved'
        AND is_refund = 1
    `).get(semesterId) as { total_refund_amount: number; refund_students_count: number };

    // 6. 组装返回数据
    const stats: DashboardStats = {
      semester: {
        id: currentSemester.id,
        name: currentSemester.name,
        start_date: currentSemester.start_date,
        end_date: currentSemester.end_date,
      },
      students: {
        total: studentStats.total,
        active: studentStats.total,
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
    console.error("获取仪表盘统计数据失败:", error);
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 });
  }
}
