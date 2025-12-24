import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";

// 指定使用 Node.js runtime（better-sqlite3 需要）
export const runtime = "nodejs";

// 不需要认证的路径
const publicPaths = ["/", "/login", "/api/auth/login", "/api/init"];

// 需要管理员权限的路径前缀
const adminPaths = ["/admin"];

// 需要教师权限的路径前缀
const teacherPaths = ["/teacher"];

// 需要班主任权限的路径前缀
const classTeacherPaths = ["/class-teacher"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 如果是公共路径，直接放行
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    // 但对于已登录用户访问根路径，重定向到仪表盘
    if (pathname === "/") {
      const user = await getCurrentUser();
      if (user) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
    return NextResponse.next();
  }

  // 获取当前用户
  const user = await getCurrentUser();

  // 如果没有登录，重定向到登录页
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 检查管理员权限
  if (adminPaths.some((path) => pathname.startsWith(path))) {
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 检查教师权限
  if (teacherPaths.some((path) => pathname.startsWith(path))) {
    if (user.role !== "admin" && user.role !== "teacher" && user.role !== "class_teacher") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 检查班主任权限
  if (classTeacherPaths.some((path) => pathname.startsWith(path))) {
    if (user.role !== "admin" && user.role !== "class_teacher") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
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
