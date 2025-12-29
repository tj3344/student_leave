import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getClasses, createClass } from "@/lib/api/classes";
import { hasPermission } from "@/lib/api/auth";
import type { ClassInput } from "@/types";

// 缓存配置：班级列表是相对静态的数据，缓存 24 小时
export const revalidate = 86400;

// GET /api/classes - 获取班级列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "class:read")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");
    const gradeId = searchParams.get("grade_id");
    const semesterId = searchParams.get("semester_id");
    const sort = searchParams.get("sort") || undefined;
    const order = (searchParams.get("order") as "asc" | "desc") || undefined;

    const params: {
      page?: number;
      limit?: number;
      search?: string;
      grade_id?: number;
      semester_id?: number;
      class_teacher_id?: number;
      sort?: string;
      order?: "asc" | "desc";
    } = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search: search || undefined,
      grade_id: gradeId ? parseInt(gradeId, 10) : undefined,
      semester_id: semesterId ? parseInt(semesterId, 10) : undefined,
      sort,
      order,
    };

    // 班主任角色：只能看到自己管理的班级
    if (user.role === "class_teacher") {
      params.class_teacher_id = user.id;
    }

    const result = getClasses(params);

    // 如果是数组（无分页），直接返回
    if (Array.isArray(result)) {
      return NextResponse.json({ data: result });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get classes error:", error);
    return NextResponse.json({ error: "获取班级列表失败" }, { status: 500 });
  }
}

// POST /api/classes - 创建班级
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "class:create")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await request.json()) as ClassInput;
    const result = createClass(body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ id: result.classId }, { status: 201 });
  } catch (error) {
    console.error("Create class error:", error);
    return NextResponse.json({ error: "创建班级失败" }, { status: 500 });
  }
}
