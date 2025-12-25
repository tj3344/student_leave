"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { User } from "@/types";

export default function HomeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const result = await response.json();
          const user = result.user as Omit<User, "password_hash">;

          console.log("Current user role:", user.role); // 调试信息

          // 根据角色重定向到不同的仪表盘
          // 使用 window.location.href 确保强制跳转
          switch (user.role) {
            case "class_teacher":
              console.log("Redirecting class_teacher to /class-teacher");
              window.location.href = "/class-teacher";
              break;
            case "teacher":
              console.log("Redirecting teacher to /leaves");
              window.location.href = "/leaves";
              break;
            case "admin":
            default:
              console.log("Redirecting admin to /admin");
              window.location.href = "/admin";
              break;
          }
        } else {
          // 未登录，重定向到登录页
          window.location.href = "/login";
        }
      } catch (err) {
        console.error("Check user error:", err);
        // 出错时重定向到登录页
        window.location.href = "/login";
      }
    };

    checkUserAndRedirect();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">正在跳转...</p>
      </div>
    </div>
  );
}
