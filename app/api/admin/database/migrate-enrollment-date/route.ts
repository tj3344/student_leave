import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { getRawPostgres } from "@/lib/db";

/**
 * POST /api/admin/database/migrate-enrollment-date
 * 添加 enrollment_date 列到 students 表
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

    const pgClient = getRawPostgres();

    // 检查列是否已存在
    const checkResult = await pgClient.unsafe(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'students'
        AND column_name = 'enrollment_date'
      )
    `) as { exists: boolean }[];

    const columnExists = checkResult[0]?.exists || false;

    if (columnExists) {
      return NextResponse.json({
        success: true,
        message: "enrollment_date 列已存在，无需迁移",
      });
    }

    // 添加列
    await pgClient.unsafe(`
      ALTER TABLE students ADD COLUMN enrollment_date text
    `);

    return NextResponse.json({
      success: true,
      message: "enrollment_date 列已成功添加",
    });
  } catch (error) {
    console.error("数据库迁移失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "迁移失败" },
      { status: 500 }
    );
  }
}
