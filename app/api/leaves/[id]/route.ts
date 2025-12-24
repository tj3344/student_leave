import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getLeaveById, deleteLeave } from "@/lib/api/leaves";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/leaves/[id] - 获取请假记录详情
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.LEAVE_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的请假记录ID" }, { status: 400 });
    }

    // 获取请假记录
    const leave = getLeaveById(id);

    if (!leave) {
      return NextResponse.json({ error: "请假记录不存在" }, { status: 404 });
    }

    // 教师只能查看自己申请的请假记录
    if (currentUser.role === "teacher" && leave.applicant_id !== currentUser.id) {
      return NextResponse.json({ error: "无权限查看此请假记录" }, { status: 403 });
    }

    return NextResponse.json(leave);
  } catch (error) {
    console.error("获取请假记录详情失败:", error);
    return NextResponse.json({ error: "获取请假记录详情失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/leaves/[id] - 删除请假记录
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.LEAVE_CREATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的请假记录ID" }, { status: 400 });
    }

    // 检查是否是自己申请的记录
    const leave = getLeaveById(id);
    if (!leave) {
      return NextResponse.json({ error: "请假记录不存在" }, { status: 404 });
    }

    if (currentUser.role === "teacher" && leave.applicant_id !== currentUser.id) {
      return NextResponse.json({ error: "无权限删除此请假记录" }, { status: 403 });
    }

    // 删除请假记录
    const result = deleteLeave(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "请假记录删除成功" });
  } catch (error) {
    console.error("删除请假记录失败:", error);
    return NextResponse.json({ error: "删除请假记录失败" }, { status: 500 });
  }
}
