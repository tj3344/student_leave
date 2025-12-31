import { NextResponse } from "next/server";
import {
  getConnections,
  createConnection,
} from "@/lib/api/database";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { DatabaseConnectionInput } from "@/types";

/**
 * GET /api/database/connections
 * 获取所有数据库连接
 */
export async function GET() {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.DATABASE_MANAGE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const connections = await getConnections();

    return NextResponse.json({
      success: true,
      data: connections,
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
 * POST /api/database/connections
 * 创建数据库连接
 */
export async function POST(request: Request) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.DATABASE_MANAGE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body: DatabaseConnectionInput = await request.json();

    // 验证输入
    if (!body.name || !body.connection_string || !body.environment) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    const connection = await createConnection(body, currentUser.id);

    return NextResponse.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error("创建数据库连接失败:", error);
    return NextResponse.json(
      { error: "创建数据库连接失败" },
      { status: 500 }
    );
  }
}
