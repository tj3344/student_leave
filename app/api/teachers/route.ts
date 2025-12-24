import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getTeachers, createTeacher } from "@/lib/api/teachers";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { UserInput } from "@/types";

/**
 * GET /api/teachers - 获取教师列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.USER_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const is_active = searchParams.get("is_active");
    const has_class = searchParams.get("has_class");
    const sort = searchParams.get("sort") || "created_at";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    // 获取教师列表
    const result = getTeachers({
      page,
      limit,
      search: search || undefined,
      role: role || undefined,
      is_active: is_active ? parseInt(is_active, 10) : undefined,
      has_class: has_class ? has_class === "true" : undefined,
      sort,
      order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取教师列表失败:", error);
    return NextResponse.json({ error: "获取教师列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/teachers - 创建教师
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.USER_CREATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 解析请求体
    const body = await request.json();
    const teacherInput = body as UserInput & { password?: string };

    // 验证必填字段
    if (!teacherInput.username || !teacherInput.real_name || !teacherInput.role) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 验证角色只能是教师或班主任
    if (teacherInput.role !== "teacher" && teacherInput.role !== "class_teacher") {
      return NextResponse.json({ error: "教师角色只能是教师或班主任" }, { status: 400 });
    }

    // 创建教师
    const result = await createTeacher(teacherInput);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, teacherId: result.teacherId, message: "教师创建成功" },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建教师失败:", error);
    return NextResponse.json({ error: "创建教师失败" }, { status: 500 });
  }
}
