import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { recalculateAllLeaveRefunds } from "@/lib/api/leaves";
import { hasPermission } from "@/lib/api/auth";
import { PERMISSIONS } from "@/lib/constants";

/**
 * POST /api/leaves/recalculate-refunds - 重新计算所有请假记录的退费金额
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.FEE_UPDATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const result = recalculateAllLeaveRefunds();

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Recalculate leave refunds error:", error);
    return NextResponse.json({ error: "重新计算退费金额失败" }, { status: 500 });
  }
}
