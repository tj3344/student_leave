import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getGradeById, updateGrade, deleteGrade } from "@/lib/api/grades";
import { hasPermission } from "@/lib/api/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/grades/[id] - 获取年级详情
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "grade:read")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const gradeId = parseInt(id, 10);

    if (isNaN(gradeId)) {
      return NextResponse.json({ error: "无效的年级ID" }, { status: 400 });
    }

    const grade = getGradeById(gradeId);

    if (!grade) {
      return NextResponse.json({ error: "年级不存在" }, { status: 404 });
    }

    return NextResponse.json(grade);
  } catch (error) {
    console.error("Get grade error:", error);
    return NextResponse.json({ error: "获取年级详情失败" }, { status: 500 });
  }
}

// PUT /api/grades/[id] - 更新年级
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "grade:update")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const gradeId = parseInt(id, 10);

    if (isNaN(gradeId)) {
      return NextResponse.json({ error: "无效的年级ID" }, { status: 400 });
    }

    const body = (await request.json()) as Partial<import("@/types").GradeInput>;
    const result = updateGrade(gradeId, body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update grade error:", error);
    return NextResponse.json({ error: "更新年级失败" }, { status: 500 });
  }
}

// DELETE /api/grades/[id] - 删除年级
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "grade:delete")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const gradeId = parseInt(id, 10);

    if (isNaN(gradeId)) {
      return NextResponse.json({ error: "无效的年级ID" }, { status: 400 });
    }

    const result = deleteGrade(gradeId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete grade error:", error);
    return NextResponse.json({ error: "删除年级失败" }, { status: 500 });
  }
}
