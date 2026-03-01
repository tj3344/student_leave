"use client";

import { Component, ReactNode } from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
}

/**
 * Error Boundary 包装组件（客户端）
 * 用于在服务端组件布局中包装客户端内容
 */
export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // 可选：发送错误到服务器
        console.error("Dashboard Error:", error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
