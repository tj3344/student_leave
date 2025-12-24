import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getClassRefundSummary } from "@/lib/api/fees";
import { hasPermission } from "@/lib/api/auth";
import { PERMISSIONS } from "@/lib/constants";

/**
 * GET /api/fees/summary - 获取班级退费汇总
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.FEE_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const semesterId = searchParams.get("semester_id");
    const classId = searchParams.get("class_id");

    const params: {
      semester_id?: number;
      class_id?: number;
    } = {
      semester_id: semesterId ? parseInt(semesterId, 10) : undefined,
      class_id: classId ? parseInt(classId, 10) : undefined,
    };

    const result = getClassRefundSummary(params);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Get class refund summary error:", error);
    return NextResponse.json({ error: "获取退费汇总失败" }, { status: 500 });
  }
}
