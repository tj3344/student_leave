import { NextResponse } from "next/server";
import { getCsrfToken } from "@/lib/utils/csrf";

/**
 * GET /api/auth/csrf
 *
 * 获取 CSRF Token
 *
 * 前端在页面加载时调用此接口获取 CSRF Token，
 * 然后在所有 POST/PUT/DELETE 请求中通过 x-csrf-token 头部发送
 */
export async function GET() {
  try {
    const token = await getCsrfToken();
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    console.error("获取 CSRF Token 失败:", error);
    return NextResponse.json(
      { error: "获取 CSRF Token 失败" },
      { status: 500 }
    );
  }
}
