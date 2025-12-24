import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getFeeConfigById, updateFeeConfig, deleteFeeConfig } from "@/lib/api/fees";
import { hasPermission } from "@/lib/api/auth";
import { PERMISSIONS } from "@/lib/constants";
import type { FeeConfigInput } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/fee-configs/[id] - 获取费用配置详情
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.FEE_READ)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的费用配置ID" }, { status: 400 });
    }

    const feeConfig = getFeeConfigById(id);

    if (!feeConfig) {
      return NextResponse.json({ error: "费用配置不存在" }, { status: 404 });
    }

    return NextResponse.json(feeConfig);
  } catch (error) {
    console.error("Get fee config error:", error);
    return NextResponse.json({ error: "获取费用配置详情失败" }, { status: 500 });
  }
}

/**
 * PUT /api/fee-configs/[id] - 更新费用配置
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.FEE_UPDATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的费用配置ID" }, { status: 400 });
    }

    const body = (await request.json()) as Partial<FeeConfigInput>;
    const result = updateFeeConfig(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "费用配置更新成功" });
  } catch (error) {
    console.error("Update fee config error:", error);
    return NextResponse.json({ error: "更新费用配置失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/fee-configs/[id] - 删除费用配置
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.FEE_DELETE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const params = await context.params;
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的费用配置ID" }, { status: 400 });
    }

    const result = deleteFeeConfig(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "费用配置删除成功" });
  } catch (error) {
    console.error("Delete fee config error:", error);
    return NextResponse.json({ error: "删除费用配置失败" }, { status: 500 });
  }
}
