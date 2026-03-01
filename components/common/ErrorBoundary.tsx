"use client";

import React from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary 组件
 *
 * 用于捕获子组件中的 JavaScript 错误，记录错误日志，并显示降级 UI
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 记录错误到控制台
    console.error("ErrorBoundary caught an error:", error);
    console.error("Error Info:", errorInfo);

    // 记录组件堆栈
    const componentStack = errorInfo.componentStack || "";
    console.error("Component Stack:", componentStack);

    // 调用自定义错误处理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 可选：发送错误到服务器（如 Sentry）
    // logErrorToServer(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = "/home";
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      // 使用自定义降级 UI（如果提供）
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // 默认降级 UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <Card className="w-full max-w-md shadow-soft-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">出错了</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive" className="shadow-soft">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>页面加载失败</AlertTitle>
                <AlertDescription>
                  抱歉，页面遇到了一些问题。我们已经记录了这个问题，请稍后再试。
                </AlertDescription>
              </Alert>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4 p-3 bg-muted rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    错误详情（开发模式）
                  </summary>
                  <pre className="text-xs overflow-auto p-2 bg-background rounded border">
                    {this.state.error.toString()}
                    {"\n"}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={this.handleRetry} className="w-full shadow-soft">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重试
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  返回首页
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook 版本的错误边界（用于函数组件）
 *
 * 注意：React 暂不支持 Hook 版本的 Error Boundary
 * 这是一个占位符，提醒用户使用类组件版本
 */
export function useErrorHandler(error: Error | null): void {
  if (error) {
    throw error;
  }
}

/**
 * 用于抛出错误的工具函数
 *
 * @example
 * ```tsx
 * if (someError) {
 *   throwError(new Error("Something went wrong"));
 * }
 * ```
 */
export function throwError(error: Error): never {
  throw error;
}

export default ErrorBoundary;
