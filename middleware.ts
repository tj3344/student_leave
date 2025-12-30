import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "student_leave_session";

// CSP 头部配置
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
].join("; ");

// 不需要认证的路径
const publicPaths = ["/", "/login", "/api/auth/login", "/api/init", "/maintenance"];

// API 路径（由路由处理器自己处理认证）
const apiPaths = ["/api"];

// 管理员路径（维护模式下仍可访问）
const adminPaths = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 创建响应对象并添加安全头部
  const response = NextResponse.next();

  // 添加 CSP 和其他安全头部
  response.headers.set("Content-Security-Policy", CSP_HEADER);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

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
    return response;
  }

  // API 路由由各自的处理器处理认证和授权
  if (apiPaths.some((path) => pathname.startsWith(path))) {
    return response;
  }

  // 页面路由：检查是否有会话 cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // 如果没有登录，重定向到登录页
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ===== 维护模式检查 =====
  // 检查是否是管理员路径
  const isAdminPath = adminPaths.some((path) => pathname.startsWith(path));

  if (!isAdminPath) {
    try {
      // 动态导入配置获取函数
      const { getConfig } = await import("@/lib/api/system-config");
      const maintenanceMode = await getConfig("system.maintenance_mode");

      if (maintenanceMode === "true" || maintenanceMode === "1") {
        // 维护模式：检查用户角色
        const { getRawPostgres } = await import("@/lib/db");
        const pgClient = getRawPostgres();
        const userId = parseInt(sessionCookie.value, 10);

        const users = await pgClient.unsafe(
          "SELECT role FROM users WHERE id = $1 AND is_active = true",
          [userId]
        );
        const user = users[0] as { role: string } | undefined;

        // 非管理员用户，显示维护页面
        if (!user || user.role !== "admin") {
          return NextResponse.redirect(new URL("/maintenance", request.url));
        }
      }
    } catch (error) {
      // 配置获取失败，记录错误但继续放行
      console.error("获取维护模式配置失败:", error);
    }
  }

  return response;
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
