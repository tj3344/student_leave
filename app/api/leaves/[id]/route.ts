import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getLeaveById, deleteLeave, updateLeave } from "@/lib/api/leaves";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { logDelete, logUpdate } from "@/lib/utils/logger";
import { getBooleanConfig } from "@/lib/api/system-config";

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
    const leave = await getLeaveById(id);

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
 * PUT /api/leaves/[id] - 更新请假记录
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.LEAVE_UPDATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 班主任需要检查系统配置开关
    if (currentUser.role === "class_teacher") {
      const canEdit = await getBooleanConfig("permission.class_teacher_edit_leave", true);
      if (!canEdit) {
        return NextResponse.json({ error: "无权限，系统未开放此功能" }, { status: 403 });
      }
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的请假记录ID" }, { status: 400 });
    }

    // 检查请假记录是否存在
    const existingLeave = await getLeaveById(id);
    if (!existingLeave) {
      return NextResponse.json({ error: "请假记录不存在" }, { status: 404 });
    }

    // 获取更新数据
    const body = await request.json();

    // 更新请假记录
    const result = await updateLeave(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // 记录更新日志
    await logUpdate(currentUser.id, "leaves", `更新请假记录：${existingLeave.student_name}（${existingLeave.student_no}）`);

    return NextResponse.json({ success: true, message: "请假记录更新成功" });
  } catch (error) {
    console.error("更新请假记录失败:", error);
    return NextResponse.json({ error: "更新请假记录失败" }, { status: 500 });
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

    if (!hasPermission(currentUser.role, PERMISSIONS.LEAVE_DELETE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的请假记录ID" }, { status: 400 });
    }

    // 检查是否是自己申请的记录
    const leave = await getLeaveById(id);
    if (!leave) {
      return NextResponse.json({ error: "请假记录不存在" }, { status: 404 });
    }

    if (currentUser.role === "teacher" && leave.applicant_id !== currentUser.id) {
      return NextResponse.json({ error: "无权限删除此请假记录" }, { status: 403 });
    }

    // 删除请假记录
    const result = await deleteLeave(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // 记录删除日志
    await logDelete(currentUser.id, "leaves", `删除请假记录：${leave.student_name}（${leave.student_no}）`);

    return NextResponse.json({ success: true, message: "请假记录删除成功" });
  } catch (error) {
    console.error("删除请假记录失败:", error);
    return NextResponse.json({ error: "删除请假记录失败" }, { status: 500 });
  }
}
