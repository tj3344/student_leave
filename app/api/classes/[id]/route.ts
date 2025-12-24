import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getClassById, updateClass, deleteClass } from "@/lib/api/classes";
import { hasPermission } from "@/lib/api/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/classes/[id] - 获取班级详情
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "class:read")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const classId = parseInt(id, 10);

    if (isNaN(classId)) {
      return NextResponse.json({ error: "无效的班级ID" }, { status: 400 });
    }

    const classData = getClassById(classId);

    if (!classData) {
      return NextResponse.json({ error: "班级不存在" }, { status: 404 });
    }

    return NextResponse.json(classData);
  } catch (error) {
    console.error("Get class error:", error);
    return NextResponse.json({ error: "获取班级详情失败" }, { status: 500 });
  }
}

// PUT /api/classes/[id] - 更新班级
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "class:update")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const classId = parseInt(id, 10);

    if (isNaN(classId)) {
      return NextResponse.json({ error: "无效的班级ID" }, { status: 400 });
    }

    const body = (await request.json()) as Partial<import("@/types").ClassInput>;
    const result = updateClass(classId, body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update class error:", error);
    return NextResponse.json({ error: "更新班级失败" }, { status: 500 });
  }
}

// DELETE /api/classes/[id] - 删除班级
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, "class:delete")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const classId = parseInt(id, 10);

    if (isNaN(classId)) {
      return NextResponse.json({ error: "无效的班级ID" }, { status: 400 });
    }

    const result = deleteClass(classId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete class error:", error);
    return NextResponse.json({ error: "删除班级失败" }, { status: 500 });
  }
}
