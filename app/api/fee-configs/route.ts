import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getFeeConfigs, createFeeConfig } from "@/lib/api/fees";
import { hasPermission } from "@/lib/api/auth";
import { PERMISSIONS } from "@/lib/constants";
import type { FeeConfigInput } from "@/types";

// 缓存配置：费用配置是相对静态的数据，缓存 24 小时
export const revalidate = 86400;

/**
 * GET /api/fee-configs - 获取费用配置列表
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

    const result = await getFeeConfigs(params);

    // 如果是数组（无分页），直接返回
    if (Array.isArray(result)) {
      return NextResponse.json({ data: result });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get fee configs error:", error);
    return NextResponse.json({ error: "获取费用配置列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/fee-configs - 创建费用配置
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.FEE_CREATE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await request.json()) as FeeConfigInput;
    const result = await createFeeConfig(body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ id: result.configId }, { status: 201 });
  } catch (error) {
    console.error("Create fee config error:", error);
    return NextResponse.json({ error: "创建费用配置失败" }, { status: 500 });
  }
}
