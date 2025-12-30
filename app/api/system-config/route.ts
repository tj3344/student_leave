import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { getAllConfigs, updateConfigs } from "@/lib/api/system-config";

/**
 * GET /api/system-config - 获取所有系统配置
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_CONFIG)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const configs = await getAllConfigs();

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error("获取系统配置失败:", error);
    return NextResponse.json(
      { error: "获取系统配置失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system-config - 批量更新系统配置
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_CONFIG)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = await request.json();
    const { configs } = body;

    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json({ error: "无效的请求参数" }, { status: 400 });
    }

    const success = await updateConfigs(
      configs.map((c: { config_key: string; config_value: string }) => ({
        key: c.config_key,
        value: c.config_value,
      }))
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: "系统配置更新成功",
      });
    } else {
      return NextResponse.json(
        { error: "部分配置更新失败" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("更新系统配置失败:", error);
    return NextResponse.json(
      { error: "更新系统配置失败" },
      { status: 500 }
    );
  }
}
