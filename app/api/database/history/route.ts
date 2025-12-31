import { NextResponse } from "next/server";
import { db, databaseSwitchHistory, databaseConnections, users } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

/**
 * GET /api/database/history
 * 获取数据库切换历史
 */
export async function GET(request: Request) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.DATABASE_MANAGE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // 获取历史记录
    const history = await db
      .select({
        id: databaseSwitchHistory.id,
        from_connection_id: databaseSwitchHistory.fromConnectionId,
        to_connection_id: databaseSwitchHistory.toConnectionId,
        switch_type: databaseSwitchHistory.switchType,
        status: databaseSwitchHistory.status,
        backup_file_path: databaseSwitchHistory.backupFilePath,
        error_message: databaseSwitchHistory.errorMessage,
        migrated_tables: databaseSwitchHistory.migratedTables,
        migration_details: databaseSwitchHistory.migrationDetails,
        switched_by: databaseSwitchHistory.switchedBy,
        created_at: databaseSwitchHistory.createdAt,
        completed_at: databaseSwitchHistory.completedAt,
      })
      .from(databaseSwitchHistory)
      .orderBy(desc(databaseSwitchHistory.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取关联信息
    const historyWithDetails = await Promise.all(
      history.map(async (h) => {
        // 获取目标连接名称
        let to_connection_name = "";
        if (h.to_connection_id) {
          const toConn = await db
            .select({ name: databaseConnections.name })
            .from(databaseConnections)
            .where(eq(databaseConnections.id, h.to_connection_id))
            .limit(1);
          to_connection_name = toConn[0]?.name || "";
        }

        // 获取源连接名称
        let from_connection_name = "";
        if (h.from_connection_id) {
          const fromConn = await db
            .select({ name: databaseConnections.name })
            .from(databaseConnections)
            .where(eq(databaseConnections.id, h.from_connection_id))
            .limit(1);
          from_connection_name = fromConn[0]?.name || "";
        }

        // 获取操作人名称
        let switched_by_name = "";
        if (h.switched_by) {
          const user = await db
            .select({ real_name: users.realName })
            .from(users)
            .where(eq(users.id, h.switched_by))
            .limit(1);
          switched_by_name = user[0]?.real_name || "";
        }

        return {
          ...h,
          to_connection_name,
          from_connection_name,
          switched_by_name,
        };
      })
    );

    // 获取总数
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(databaseSwitchHistory);

    const total = totalResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: historyWithDetails,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("获取切换历史失败:", error);
    return NextResponse.json(
      { error: "获取切换历史失败" },
      { status: 500 }
    );
  }
}
