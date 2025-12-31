import { NextResponse } from "next/server";
import { getConnectionById, updateConnection, deleteConnection } from "@/lib/api/database";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { DatabaseConnectionInput } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/database/connections/[id]
 * 获取单个数据库连接
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.DATABASE_MANAGE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const connectionId = parseInt(id);

    if (isNaN(connectionId)) {
      return NextResponse.json(
        { error: "无效的连接 ID" },
        { status: 400 }
      );
    }

    const connection = await getConnectionById(connectionId);

    if (!connection) {
      return NextResponse.json(
        { error: "数据库连接不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error("获取数据库连接失败:", error);
    return NextResponse.json(
      { error: "获取数据库连接失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/database/connections/[id]
 * 更新数据库连接
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.DATABASE_MANAGE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const connectionId = parseInt(id);

    if (isNaN(connectionId)) {
      return NextResponse.json(
        { error: "无效的连接 ID" },
        { status: 400 }
      );
    }

    const body: Partial<DatabaseConnectionInput> = await request.json();

    const connection = await updateConnection(connectionId, body, currentUser.id);

    if (!connection) {
      return NextResponse.json(
        { error: "数据库连接不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error("更新数据库连接失败:", error);
    return NextResponse.json(
      { error: "更新数据库连接失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/database/connections/[id]
 * 删除数据库连接
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.DATABASE_MANAGE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await context.params;
    const connectionId = parseInt(id);

    if (isNaN(connectionId)) {
      return NextResponse.json(
        { error: "无效的连接 ID" },
        { status: 400 }
      );
    }

    const success = await deleteConnection(connectionId);

    if (!success) {
      return NextResponse.json(
        { error: "数据库连接不存在或删除失败" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除数据库连接失败:", error);
    if (error instanceof Error && error.message.includes("无法删除当前活动连接")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "删除数据库连接失败" },
      { status: 500 }
    );
  }
}
