import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getRawPostgres } from "@/lib/db";
import { ROLE_PERMISSIONS, PERMISSIONS } from "@/lib/constants";

/**
 * GET /api/operation-logs - 获取操作日志列表
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (!ROLE_PERMISSIONS[currentUser.role]?.includes(PERMISSIONS.SYSTEM_LOGS)) {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    // 2. 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const moduleFilter = searchParams.get("module") || "";
    const actionFilter = searchParams.get("action") || "";
    const startDate = searchParams.get("start_date") || "";
    const endDate = searchParams.get("end_date") || "";
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") || "desc";
    const offset = (page - 1) * limit;

    const pgClient = getRawPostgres();

    // 3. 构建查询条件
    const whereConditions: string[] = ["1=1"];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(u.username LIKE $${paramIndex} OR u.real_name LIKE $${paramIndex + 1})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }
    if (moduleFilter) {
      whereConditions.push(`ol.module = $${paramIndex}`);
      queryParams.push(moduleFilter);
      paramIndex++;
    }
    if (actionFilter) {
      whereConditions.push(`ol.action = $${paramIndex}`);
      queryParams.push(actionFilter);
      paramIndex++;
    }
    if (startDate) {
      whereConditions.push(`DATE(ol.created_at) >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      whereConditions.push(`DATE(ol.created_at) <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // 4. 查询总数
    const countResult = await pgClient.unsafe(`
      SELECT COUNT(*) as total
      FROM operation_logs ol
      LEFT JOIN users u ON ol.user_id = u.id
      WHERE ${whereClause}
    `, queryParams);
    const totalCount = countResult[0]?.total || 0;

    // 5. 查询数据
    queryParams.push(limit, offset);
    const logs = await pgClient.unsafe(`
      SELECT
        ol.id,
        ol.user_id,
        ol.action,
        ol.module,
        ol.description,
        ol.ip_address,
        ol.created_at,
        u.username,
        u.real_name,
        u.role
      FROM operation_logs ol
      LEFT JOIN users u ON ol.user_id = u.id
      WHERE ${whereClause}
      ORDER BY ol.${sort} ${order.toUpperCase()}
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `, queryParams) as Array<{
      id: number;
      user_id: number | null;
      action: string;
      module: string;
      description: string | null;
      ip_address: string | null;
      created_at: string;
      username: string | null;
      real_name: string | null;
      role: string | null;
    }>;

    // 6. 转换时间格式为 ISO 8601（UTC），确保前端正确解析时区
    const formattedLogs = logs.map((log) => ({
      ...log,
      created_at: new Date(log.created_at + "Z").toISOString(),
    }));

    return NextResponse.json({
      data: formattedLogs,
      total: totalCount,
      page,
      limit,
    });
  } catch (error) {
    console.error("获取操作日志失败:", error);
    return NextResponse.json({ error: "获取操作日志失败" }, { status: 500 });
  }
}
