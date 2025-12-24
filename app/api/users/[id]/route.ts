import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getUserById, updateUser, deleteUser, toggleUserStatus, resetUserPassword } from "@/lib/api/users";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { UserUpdate } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/users/[id] - 获取用户详情
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
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    // 获取用户
    const user = getUserById(id);

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("获取用户详情失败:", error);
    return NextResponse.json({ error: "获取用户详情失败" }, { status: 500 });
  }
}

/**
 * PUT /api/users/[id] - 更新用户
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
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    // 解析请求体
    const body = await request.json();
    const userUpdate = body as UserUpdate & { password?: string };

    // 更新用户
    const result = await updateUser(id, userUpdate);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "用户更新成功" });
  } catch (error) {
    console.error("更新用户失败:", error);
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id] - 删除用户
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
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    // 删除用户
    const result = deleteUser(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "用户删除成功" });
  } catch (error) {
    console.error("删除用户失败:", error);
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 });
  }
}

/**
 * PATCH /api/users/[id]/toggle - 切换用户状态
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
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    // 解析请求体，确定操作类型
    const body = await request.json();
    const action = body.action;

    let result;
    if (action === "toggle") {
      result = toggleUserStatus(id);
    } else if (action === "resetPassword") {
      const newPassword = body.password;
      result = resetUserPassword(id, newPassword);
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
