import { NextResponse } from "next/server";
import { testSavedConnection } from "@/lib/api/database";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/database/connections/[id]/test
 * 测试数据库连接
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    // 验证权限
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

    const result = await testSavedConnection(connectionId);

    return NextResponse.json({
      success: result.success,
      status: result.status,
      message: result.message,
      version: result.version,
      latency: result.latency,
    });
  } catch (error) {
    console.error("测试数据库连接失败:", error);
    return NextResponse.json(
      { error: "测试数据库连接失败" },
      { status: 500 }
    );
  }
}
