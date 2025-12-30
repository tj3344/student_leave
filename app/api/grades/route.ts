import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getGrades, createGrade, updateGradesOrder } from "@/lib/api/grades";
import { hasPermission } from "@/lib/api/auth";
import type { GradeInput } from "@/types";

// 缓存配置：年级列表是相对静态的数据，缓存 24 小时
export const revalidate = 86400;

// GET /api/grades - 获取年级列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "grade:read")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");
    const semester_id = searchParams.get("semester_id");
    const sort = searchParams.get("sort") || undefined;
    const order = (searchParams.get("order") as "asc" | "desc") || undefined;

    const params = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search: search || undefined,
      semester_id: semester_id ? parseInt(semester_id, 10) : undefined,
      sort,
      order,
    };

    const result = await getGrades(params);

    // 如果是数组（无分页），直接返回
    if (Array.isArray(result)) {
      return NextResponse.json({ data: result });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get grades error:", error);
    return NextResponse.json({ error: "获取年级列表失败" }, { status: 500 });
  }
}

// POST /api/grades - 创建年级
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "grade:create")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await request.json()) as GradeInput;
    const result = await createGrade(body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ id: result.gradeId }, { status: 201 });
  } catch (error) {
    console.error("Create grade error:", error);
    return NextResponse.json({ error: "创建年级失败" }, { status: 500 });
  }
}

// PUT /api/grades/batch-order - 批量更新排序
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "grade:update")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await request.json()) as { updates: { id: number; sort_order: number }[] };

    if (!body.updates || !Array.isArray(body.updates)) {
      return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
    }

    const result = await updateGradesOrder(body.updates);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update grades order error:", error);
    return NextResponse.json({ error: "更新年级排序失败" }, { status: 500 });
  }
}
