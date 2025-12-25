import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "student_leave_session";

// 不需要认证的路径
const publicPaths = ["/", "/login", "/api/auth/login", "/api/init"];

// API 路径（由路由处理器自己处理认证）
const apiPaths = ["/api"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 如果是公共路径，直接放行
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    // 对于已登录用户访问根路径，重定向到 /home
    // /home 页面会根据角色重定向到正确的页面
    if (pathname === "/") {
      const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
      if (sessionCookie) {
        return NextResponse.redirect(new URL("/home", request.url));
      }
    }
    return NextResponse.next();
  }

  // API 路由由各自的处理器处理认证和授权
  if (apiPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 页面路由：检查是否有会话 cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // 如果没有登录，重定向到登录页
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon 文件)
     * - public 文件夹中的文件
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
