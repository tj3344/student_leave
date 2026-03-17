import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { ensureTriggersInitialized, rebuildStudentCounts } from "@/lib/db/triggers";

/**
 * POST /api/admin/database/triggers - 手动初始化触发器并重建统计
 * 用于修复班级学生人数统计不正确的问题
 */
export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.DATABASE_MANAGE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 初始化触发器
    const wasInitialized = await ensureTriggersInitialized();

    // 重建统计数据
    await rebuildStudentCounts();

    return NextResponse.json({
      success: true,
      message: wasInitialized
        ? "触发器已初始化，统计数据已重建"
        : "触发器已存在，统计数据已重建",
    });
  } catch (error) {
    console.error("初始化触发器失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "初始化失败" },
      { status: 500 }
    );
  }
}
