import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/api/auth";
import { getSemesters, createSemester } from "@/lib/api/semesters";
import { PERMISSIONS } from "@/lib/constants";
import type { SemesterInput } from "@/types";

// GET /api/semesters - 获取学期列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.SEMESTER_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || undefined;
    const order = (searchParams.get("order") as "asc" | "desc") || undefined;

    const params = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search: search || undefined,
      sort,
      order,
    };

    const result = getSemesters(params);

    // 如果是数组（无分页），直接返回
    if (Array.isArray(result)) {
      return NextResponse.json({ data: result });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get semesters error:", error);
    return NextResponse.json({ error: "获取学期列表失败" }, { status: 500 });
  }
}

// POST /api/semesters - 创建学期
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.SEMESTER_CREATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await request.json()) as SemesterInput & { is_current?: boolean };
    const result = createSemester(body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ id: result.semesterId }, { status: 201 });
  } catch (error) {
    console.error("Create semester error:", error);
    return NextResponse.json({ error: "创建学期失败" }, { status: 500 });
  }
}
