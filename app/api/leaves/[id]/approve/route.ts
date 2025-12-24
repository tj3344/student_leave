import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { reviewLeave } from "@/lib/api/leaves";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { LeaveReview } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/leaves/[id]/approve - 批准请假
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.LEAVE_APPROVE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的请假记录ID" }, { status: 400 });
    }

    // 解析请求体
    const body = await request.json();
    const review: LeaveReview = {
      status: "approved",
      review_remark: body.review_remark,
    };

    // 审核请假
    const result = reviewLeave(id, review, currentUser.id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "请假已批准" });
  } catch (error) {
    console.error("批准请假失败:", error);
    return NextResponse.json({ error: "批准请假失败" }, { status: 500 });
  }
}
