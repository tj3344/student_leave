import { NextResponse } from "next/server";
import { logout } from "@/lib/api/auth";
import { getCurrentUser } from "@/lib/api/auth";
import { logLogout } from "@/lib/utils/logger";

export async function POST() {
  try {
    // 获取当前用户用于记录日志
    const currentUser = await getCurrentUser();

    // 执行登出
    await logout();

    // 记录登出日志
    if (currentUser) {
      await logLogout(currentUser.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "登出失败" }, { status: 500 });
  }
}
