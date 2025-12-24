import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import {
  getSemesterById,
  updateSemester,
  deleteSemester,
  setCurrentSemester,
} from "@/lib/api/semesters";
import { hasPermission } from "@/lib/api/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/semesters/[id] - 获取学期详情
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "semesters:read")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const semesterId = parseInt(id, 10);

    if (isNaN(semesterId)) {
      return NextResponse.json({ error: "无效的学期ID" }, { status: 400 });
    }

    const semester = getSemesterById(semesterId);

    if (!semester) {
      return NextResponse.json({ error: "学期不存在" }, { status: 404 });
    }

    return NextResponse.json(semester);
  } catch (error) {
    console.error("Get semester error:", error);
    return NextResponse.json({ error: "获取学期详情失败" }, { status: 500 });
  }
}

// PUT /api/semesters/[id] - 更新学期
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "semesters:update")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const semesterId = parseInt(id, 10);

    if (isNaN(semesterId)) {
      return NextResponse.json({ error: "无效的学期ID" }, { status: 400 });
    }

    const body = (await request.json()) as Partial<
      import("@/types").SemesterInput & { is_current?: boolean }
    >;
    const result = updateSemester(semesterId, body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update semester error:", error);
    return NextResponse.json({ error: "更新学期失败" }, { status: 500 });
  }
}

// DELETE /api/semesters/[id] - 删除学期
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "semesters:delete")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const semesterId = parseInt(id, 10);

    if (isNaN(semesterId)) {
      return NextResponse.json({ error: "无效的学期ID" }, { status: 400 });
    }

    const result = deleteSemester(semesterId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete semester error:", error);
    return NextResponse.json({ error: "删除学期失败" }, { status: 500 });
  }
}

// PATCH /api/semesters/[id]/set-current - 设置当前学期
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "semesters:update")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const semesterId = parseInt(id, 10);

    if (isNaN(semesterId)) {
      return NextResponse.json({ error: "无效的学期ID" }, { status: 400 });
    }

    const body = (await request.json()) as { action?: string };

    if (body.action === "set_current") {
      const result = setCurrentSemester(semesterId);

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "无效的操作" }, { status: 400 });
  } catch (error) {
    console.error("Set current semester error:", error);
    return NextResponse.json({ error: "设置当前学期失败" }, { status: 500 });
  }
}
