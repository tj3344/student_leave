import { NextResponse } from "next/server";
import { switchDatabase } from "@/lib/api/database-migration";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { DatabaseMigrationOptions } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/database/connections/[id]/switch
 * 切换到指定数据库
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
    const targetConnectionId = parseInt(id);

    if (isNaN(targetConnectionId)) {
      return NextResponse.json(
        { error: "无效的连接 ID" },
        { status: 400 }
      );
    }

    // 获取请求体（可选的迁移选项）
    const body: { options?: Partial<DatabaseMigrationOptions> } = {};
    try {
      const requestBody = await request.json();
      body.options = requestBody.options;
    } catch {
      // 无请求体，使用默认选项
    }

    // 默认迁移选项
    const migrationOptions: DatabaseMigrationOptions = {
      createBackup: body.options?.createBackup ?? true,
      tables: body.options?.tables,
      batchSize: body.options?.batchSize ?? 1000,
      validateAfterMigration: body.options?.validateAfterMigration ?? true,
    };

    const result = await switchDatabase(
      targetConnectionId,
      migrationOptions,
      currentUser.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      details: result.details,
    });
  } catch (error) {
    console.error("切换数据库失败:", error);
    return NextResponse.json(
      { error: "切换数据库失败" },
      { status: 500 }
    );
  }
}
