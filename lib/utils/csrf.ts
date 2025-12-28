/**
 * CSRF (Cross-Site Request Forgery) 防护工具
 *
 * 用于防止跨站请求伪造攻击，通过生成和验证 CSRF Token 来确保请求的合法性
 */

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * 生成 CSRF Token
 *
 * @returns 生成的 CSRF Token
 *
 * @example
 * ```ts
 * const token = generateCsrfToken();
 * ```
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const token = Buffer.from(`${timestamp}.${random}`).toString("base64");
  return token;
}

/**
 * 设置 CSRF Token 到 Cookie
 *
 * @returns 生成的 CSRF Token
 *
 * @example
 * ```ts
 * const token = await setCsrfToken();
 * ```
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateCsrfToken();
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // 需要前端 JavaScript 读取
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 小时
    path: "/",
  });
  return token;
}

/**
 * 验证 CSRF Token
 *
 * @param request - Next.js 请求对象
 * @returns Token 是否有效
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const csrfValid = await validateCsrfToken(request);
 *   if (!csrfValid) {
 *     return NextResponse.json({ error: "CSRF token 验证失败" }, { status: 403 });
 *   }
 *   // ... 处理请求
 * }
 * ```
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // 简单比较（生产环境应使用更严格的验证，如加入签名）
  return cookieToken === headerToken;
}

/**
 * 获取 CSRF Token（用于前端调用）
 *
 * @returns CSRF Token
 *
 * @example
 * ```ts
 * // API 路由中
 * import { getCsrfToken } from "@/lib/utils/csrf";
 *
 * export async function GET() {
 *   const token = await getCsrfToken();
 *   return NextResponse.json({ csrfToken: token });
 * }
 * ```
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // 如果没有 token 或已过期，生成新的
  if (!token) {
    token = await setCsrfToken();
  }

  return token;
}

/**
 * 刷新 CSRF Token
 *
 * @returns 新的 CSRF Token
 *
 * @example
 * ```ts
 * const newToken = await refreshCsrfToken();
 * ```
 */
export async function refreshCsrfToken(): Promise<string> {
  return await setCsrfToken();
}
