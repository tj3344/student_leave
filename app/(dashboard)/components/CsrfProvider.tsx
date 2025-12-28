"use client";

import { useEffect } from "react";

// 扩展 Window 接口以包含 CSRF Token
declare global {
  interface Window {
    __CSRF_TOKEN__?: string;
  }
}

/**
 * CSRF Provider 组件
 *
 * 在应用启动时获取 CSRF Token 并存储到全局变量，
 * 供后续 API 请求使用
 */
export function CsrfProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 获取 CSRF Token 并存储到全局
    fetch("/api/auth/csrf")
      .then((res) => res.json())
      .then((data) => {
        // 存储到全局变量
        window.__CSRF_TOKEN__ = data.csrfToken;
      })
      .catch((error) => {
        console.error("获取 CSRF Token 失败:", error);
      });
  }, []);

  return <>{children}</>;
}

/**
 * 增强的 fetch 函数，自动添加 CSRF Token
 *
 * @example
 * ```ts
 * import { apiFetch } from "@/components/CsrfProvider";
 *
 * const response = await apiFetch("/api/users", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ username: "test" }),
 * });
 * ```
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = window.__CSRF_TOKEN__;

  // 自动添加 CSRF Token 到请求头
  const headers = {
    ...options.headers,
    ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * 获取当前 CSRF Token
 */
export function getCsrfToken(): string | undefined {
  return window.__CSRF_TOKEN__;
}
