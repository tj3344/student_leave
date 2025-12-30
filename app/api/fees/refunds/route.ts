import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getStudentRefundRecords } from "@/lib/api/fees";
import { hasPermission } from "@/lib/api/auth";
import { PERMISSIONS } from "@/lib/constants";

/**
 * GET /api/fees/refunds - 获取学生退费记录列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.REFUND_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const semesterId = searchParams.get("semester_id");
    const classId = searchParams.get("class_id");

    const params: {
      page?: number;
      limit?: number;
      semester_id?: number;
      class_id?: number;
    } = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      semester_id: semesterId ? parseInt(semesterId, 10) : undefined,
      class_id: classId ? parseInt(classId, 10) : undefined,
    };

    const result = await getStudentRefundRecords(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get student refund records error:", error);
    return NextResponse.json({ error: "获取退费记录失败" }, { status: 500 });
  }
}
