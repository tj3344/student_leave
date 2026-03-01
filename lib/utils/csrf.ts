/**
 * CSRF (Cross-Site Request Forgery) 防护工具
 *
 * 用于防止跨站请求伪造攻击，通过生成和验证带 HMAC 签名的 CSRF Token 来确保请求的合法性
 *
 * Token 格式: base64(timestamp.random).signature
 * - timestamp: 时间戳，用于验证 Token 时效性
 * - random: 随机字符串，增加不可预测性
 * - signature: HMAC-SHA256 签名，防止伪造
 */

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { generateCsrfSignature, verifyCsrfSignature } from "./crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_MAX_AGE = 60 * 60 * 1000; // 1 小时（毫秒）

/**
 * 生成 CSRF Token（带 HMAC 签名）
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
  const random = crypto.randomUUID().replace(/-/g, "");
  const data = `${timestamp}.${random}`;

  // 生成 HMAC 签名
  const signature = generateCsrfSignature(data);

  // 组合: base64(data).signature
  const tokenData = Buffer.from(data).toString("base64");
  return `${tokenData}.${signature}`;
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

  // 验证 header 中的 token 是否与 cookie 中的匹配
  if (cookieToken !== headerToken) {
    return false;
  }

  // 解析并验证 token 格式: base64(data).signature
  const parts = headerToken.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [tokenData, signature] = parts;

  try {
    // 解码 token 数据
    const data = Buffer.from(tokenData, "base64").toString("utf-8");
    const dataParts = data.split(".");

    if (dataParts.length !== 2) {
      return false;
    }

    const [timestampStr] = dataParts;
    const timestamp = parseInt(timestampStr, 10);

    // 验证时间戳格式
    if (isNaN(timestamp)) {
      return false;
    }

    // 验证 Token 是否过期（1 小时）
    const now = Date.now();
    if (now - timestamp > TOKEN_MAX_AGE) {
      return false;
    }

    // 验证 HMAC 签名
    return verifyCsrfSignature(data, signature);
  } catch {
    return false;
  }
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
