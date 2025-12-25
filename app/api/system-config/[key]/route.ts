import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { getConfig, setConfig } from "@/lib/api/system-config";

/**
 * GET /api/system-config/[key] - 获取单个配置
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 读取配置只需要 SYSTEM_CONFIG_READ 权限
    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_CONFIG_READ) &&
        !hasPermission(currentUser.role, PERMISSIONS.SYSTEM_CONFIG)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { key } = await params;
    const value = getConfig(key);

    if (value === undefined) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: { config_key: key, config_value: value } });
  } catch (error) {
    console.error("获取配置失败:", error);
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
  }
}

/**
 * PUT /api/system-config/[key] - 更新单个配置
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_CONFIG)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { key } = await params;
    const body = await request.json();
    const { config_value, description } = body;

    if (config_value === undefined || config_value === null) {
      return NextResponse.json({ error: "缺少配置值" }, { status: 400 });
    }

    setConfig(key, String(config_value), description);

    return NextResponse.json({
      success: true,
      message: "配置更新成功",
    });
  } catch (error) {
    console.error("更新配置失败:", error);
    return NextResponse.json({ error: "更新配置失败" }, { status: 500 });
  }
}
