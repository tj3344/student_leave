import { NextResponse } from "next/server";
import { getDatabaseStatus } from "@/lib/api/database";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

/**
 * GET /api/database/status
 * 获取当前数据库状态
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

    const status = await getDatabaseStatus();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("获取数据库状态失败:", error);
    return NextResponse.json(
      { error: "获取数据库状态失败" },
      { status: 500 }
    );
  }
}
