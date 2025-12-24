import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getStudentById, updateStudent, deleteStudent, toggleStudentStatus } from "@/lib/api/students";
import { hasPermission } from "@/lib/constants";
import type { StudentInput } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/students/[id] - 获取学生详情
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, "students:read")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的学生ID" }, { status: 400 });
    }

    // 获取学生
    const student = getStudentById(id);

    if (!student) {
      return NextResponse.json({ error: "学生不存在" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("获取学生详情失败:", error);
    return NextResponse.json({ error: "获取学生详情失败" }, { status: 500 });
  }
}

/**
 * PUT /api/students/[id] - 更新学生
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, "students:update")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的学生ID" }, { status: 400 });
    }

    // 解析请求体
    const body = await request.json();
    const studentUpdate = body as Partial<StudentInput> & { is_active?: number };

    // 更新学生
    const result = updateStudent(id, studentUpdate);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "学生更新成功" });
  } catch (error) {
    console.error("更新学生失败:", error);
    return NextResponse.json({ error: "更新学生失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/students/[id] - 删除学生
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, "students:delete")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的学生ID" }, { status: 400 });
    }

    // 删除学生
    const result = deleteStudent(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "学生删除成功" });
  } catch (error) {
    console.error("删除学生失败:", error);
    return NextResponse.json({ error: "删除学生失败" }, { status: 500 });
  }
}

/**
 * PATCH /api/students/[id] - 切换学生状态
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, "students:update")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的学生ID" }, { status: 400 });
    }

    // 切换状态
    const result = toggleStudentStatus(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, isActive: result.isActive });
  } catch (error) {
    console.error("操作失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
