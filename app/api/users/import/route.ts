import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { batchCreateOrUpdateUsers } from "@/lib/api/users";
import { hasPermission, PERMISSIONS, ROLES } from "@/lib/constants";
import type { UserImportRow } from "@/types";

/**
 * POST /api/users/import - 批量导入用户
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.USER_IMPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const { users } = body as { users: UserImportRow[] };

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "用户数据不能为空" }, { status: 400 });
    }

    // 转换和验证数据
    const validatedUsers: Array<{
      username: string;
      password?: string;
      real_name: string;
      role: string;
      phone?: string;
      email?: string;
    }> = [];
    const validationErrors: Array<{
      row: number;
      message: string;
    }> = [];

    for (let i = 0; i < users.length; i++) {
      const row = users[i];
      const rowNum = i + 1;

      // 验证必填字段
      if (!row.username?.trim()) {
        validationErrors.push({ row: rowNum, message: "用户名不能为空" });
        continue;
      }
      if (!row.real_name?.trim()) {
        validationErrors.push({ row: rowNum, message: "真实姓名不能为空" });
        continue;
      }
      if (!row.role?.trim()) {
        validationErrors.push({ row: rowNum, message: "角色不能为空" });
        continue;
      }

      // 验证用户名长度
      if (row.username.trim().length > 50) {
        validationErrors.push({ row: rowNum, message: "用户名不能超过50个字符" });
        continue;
      }

      // 验证角色
      const validRoles = [ROLES.ADMIN, ROLES.TEACHER, ROLES.CLASS_TEACHER];
      if (!validRoles.includes(row.role as typeof ROLES[keyof typeof ROLES])) {
        validationErrors.push({ row: rowNum, message: "角色必须是 admin、teacher 或 class_teacher" });
        continue;
      }

      // 验证电话格式（如果提供）
      if (row.phone && !/^1[3-9]\d{9}$/.test(row.phone.trim())) {
        validationErrors.push({ row: rowNum, message: "电话号码格式不正确" });
        continue;
      }

      // 验证邮箱格式（如果提供）
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
        validationErrors.push({ row: rowNum, message: "邮箱格式不正确" });
        continue;
      }

      // 构建验证后的数据
      validatedUsers.push({
        username: row.username.trim(),
        password: row.password?.trim() || undefined,
        real_name: row.real_name.trim(),
        role: row.role,
        phone: row.phone?.trim() || undefined,
        email: row.email?.trim() || undefined,
      });
    }

    // 如果有验证错误，返回错误信息
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "数据验证失败",
          validationErrors,
        },
        { status: 400 }
      );
    }

    // 执行批量导入
    const result = await batchCreateOrUpdateUsers(validatedUsers);

    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("批量导入用户失败:", error);
    return NextResponse.json({ error: "批量导入用户失败" }, { status: 500 });
  }
}
