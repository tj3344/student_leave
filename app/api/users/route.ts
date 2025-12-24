import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getUsers, createUser } from "@/lib/api/users";
import { hasPermission } from "@/lib/constants";
import type { UserInput } from "@/types";

/**
 * GET /api/users - 获取用户列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, "users:read")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const is_active = searchParams.get("is_active");
    const sort = searchParams.get("sort") || "created_at";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    // 获取用户列表
    const result = getUsers({
      page,
      limit,
      search: search || undefined,
      role: role || undefined,
      is_active: is_active ? parseInt(is_active, 10) : undefined,
      sort,
      order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/users - 创建用户
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, "users:create")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const userInput = body as UserInput & { password?: string };

    // 验证必填字段
    if (!userInput.username || !userInput.real_name || !userInput.role) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 创建用户
    const result = await createUser(userInput);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, userId: result.userId, message: "用户创建成功" },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建用户失败:", error);
    return NextResponse.json({ error: "创建用户失败" }, { status: 500 });
  }
}
