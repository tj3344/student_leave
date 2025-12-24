import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import {
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  toggleTeacherStatus,
  assignTeacherToClass,
} from "@/lib/api/teachers";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { UserUpdate } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/teachers/[id] - 获取教师详情
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.USER_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的教师ID" }, { status: 400 });
    }

    // 获取教师
    const teacher = getTeacherById(id);

    if (!teacher) {
      return NextResponse.json({ error: "教师不存在" }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("获取教师详情失败:", error);
    return NextResponse.json({ error: "获取教师详情失败" }, { status: 500 });
  }
}

/**
 * PUT /api/teachers/[id] - 更新教师
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.USER_UPDATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的教师ID" }, { status: 400 });
    }

    // 解析请求体
    const body = await request.json();
    const teacherUpdate = body as UserUpdate & { password?: string };

    // 验证角色只能是教师或班主任
    if (teacherUpdate.role !== undefined && teacherUpdate.role !== "teacher" && teacherUpdate.role !== "class_teacher") {
      return NextResponse.json({ error: "教师角色只能是教师或班主任" }, { status: 400 });
    }

    // 更新教师
    const result = await updateTeacher(id, teacherUpdate);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "教师更新成功" });
  } catch (error) {
    console.error("更新教师失败:", error);
    return NextResponse.json({ error: "更新教师失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/teachers/[id] - 删除教师
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.USER_DELETE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的教师ID" }, { status: 400 });
    }

    // 删除教师
    const result = deleteTeacher(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "教师删除成功" });
  } catch (error) {
    console.error("删除教师失败:", error);
    return NextResponse.json({ error: "删除教师失败" }, { status: 500 });
  }
}

/**
 * PATCH /api/teachers/[id] - 教师操作（切换状态、分配班级等）
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.USER_UPDATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的教师ID" }, { status: 400 });
    }

    // 解析请求体，确定操作类型
    const body = await request.json();
    const action = body.action;

    let result;
    if (action === "toggle") {
      // 切换启用/禁用状态
      result = toggleTeacherStatus(id);
    } else if (action === "assignClass") {
      // 分配/解除班级
      const classId = body.classId; // null 表示解除分配
      result = assignTeacherToClass(id, classId);
    } else {
      return NextResponse.json({ error: "无效的操作" }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("操作失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
