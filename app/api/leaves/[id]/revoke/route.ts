import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { revokeLeaveApproval, getLeaveById } from "@/lib/api/leaves";
import { hasPermission, PERMISSIONS } from "@/lib/constants";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/leaves/[id]/revoke - 撤销请假审核（退回到待审核状态）
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

    // 撤销审核
    const result = await revokeLeaveApproval(id, currentUser.id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "已撤销审核，记录退回到待审核状态" });
  } catch (error) {
    console.error("撤销请假审核失败:", error);
    return NextResponse.json({ error: "撤销请假审核失败" }, { status: 500 });
  }
}
