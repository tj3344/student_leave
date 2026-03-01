/**
 * 优雅关闭模块
 *
 * 用于在服务器关闭时优雅地处理：
 * - 完成进行中的请求
 * - 关闭数据库连接
 * - 刷新日志
 * - 清理缓存
 */

import { cache } from "@/lib/cache";

/**
 * 关闭状态
 */
type ShutdownState = "running" | "shutting_down" | "terminated";

/**
 * 关闭管理器
 */
class ShutdownManager {
  private state: ShutdownState = "running";
  private shutdownTimeout: number = 30 * 1000; // 30 秒超时
  private pendingRequests = new Set<Promise<unknown>>();
  private handlers: Array<() => Promise<void>> = [];

  /**
   * 获取当前状态
   */
  getState(): ShutdownState {
    return this.state;
  }

  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.state === "running";
  }

  /**
   * 注册关闭处理器
   */
  registerHandler(handler: () => Promise<void>): void {
    this.handlers.push(handler);
  }

  /**
   * 注册进行中的请求
   */
  registerRequest(request: Promise<unknown>): void {
    if (!this.isRunning()) {
      return;
    }
    this.pendingRequests.add(request);
    request.finally(() => {
      this.pendingRequests.delete(request);
    });
  }

  /**
   * 开始关闭流程
   */
  async shutdown(reason: string = "SIGTERM"): Promise<void> {
    if (this.state !== "running") {
      console.log("⚠️  关闭流程已在进行中");
      return;
    }

    console.log(`\n🛑 收到关闭信号: ${reason}`);
    console.log("🔄 开始优雅关闭流程...");
    this.state = "shutting_down";

    try {
      // 1. 停止接受新请求（由调用方控制）
      console.log("  ⏹️  停止接受新请求");

      // 2. 等待进行中的请求完成
      const waitStart = Date.now();
      while (this.pendingRequests.size > 0) {
        const elapsed = Date.now() - waitStart;
        if (elapsed > this.shutdownTimeout) {
          console.warn(`  ⚠️  等待请求超时 (${this.pendingRequests.size} 个请求仍在进行中)`);
          break;
        }
        console.log(`  ⏳ 等待请求完成... (剩余 ${this.pendingRequests.size} 个)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log("  ✅ 所有请求已完成或超时");

      // 3. 执行注册的关闭处理器
      console.log("  🔄 执行关闭处理器...");
      for (const handler of this.handlers) {
        try {
          await handler();
        } catch (error) {
          console.error("  ❌ 关闭处理器执行失败:", error);
        }
      }
      console.log("  ✅ 关闭处理器执行完成");

      // 4. 清理缓存
      console.log("  🧹 清理缓存...");
      cache.destroy();
      console.log("  ✅ 缓存已清理");

      // 5. 刷新日志
      if (process.env.ENABLE_FILE_LOG === "true") {
        console.log("  📝 刷新日志...");
        // 文件日志是异步写入的，等待一段时间确保写入完成
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("  ✅ 日志已刷新");
      }

      console.log("\n✅ 优雅关闭完成");
    } catch (error) {
      console.error("\n❌ 优雅关闭失败:", error);
    } finally {
      this.state = "terminated";
    }
  }

  /**
   * 设置关闭超时时间
   */
  setShutdownTimeout(timeout: number): void {
    this.shutdownTimeout = timeout;
  }
}

// 全局关闭管理器实例
const shutdownManager = new ShutdownManager();

/**
 * 获取关闭管理器实例
 */
export function getShutdownManager(): ShutdownManager {
  return shutdownManager;
}

/**
 * 注册关闭信号监听器
 */
export function registerShutdownSignals(): void {
  // 只在主进程中注册
  if (process.env.NODE_ENV !== "test") {
    // SIGTERM (15) - 正常终止信号
    process.on("SIGTERM", () => {
      shutdownManager.shutdown("SIGTERM").catch(() => {
        process.exit(1);
      });
    });

    // SIGINT (2) - 中断信号 (Ctrl+C)
    process.on("SIGINT", () => {
      shutdownManager.shutdown("SIGINT").catch(() => {
        process.exit(1);
      });
    });

    // 未捕获的异常
    process.on("uncaughtException", (error) => {
      console.error("❌ 未捕获的异常:", error);
      shutdownManager.shutdown("uncaughtException").finally(() => {
        process.exit(1);
      });
    });

    // 未处理的 Promise 拒绝
    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ 未处理的 Promise 拒绝:", reason);
      shutdownManager.shutdown("unhandledRejection").finally(() => {
        process.exit(1);
      });
    });
  }
}

/**
 * 检查服务是否正在关闭
 */
export function isShuttingDown(): boolean {
  return !shutdownManager.isRunning();
}

/**
 * 如果服务正在关闭，拒绝请求
 */
export function checkShutdownStatus(): { shouldReject: boolean; error?: string } {
  const state = shutdownManager.getState();
  if (state !== "running") {
    return {
      shouldReject: true,
      error: "服务正在关闭，请稍后重试",
    };
  }
  return { shouldReject: false };
}

/**
 * 创建带关闭检查的 API 路由包装器
 */
export function withGracefulShutdown<T extends Request>(
  handler: (request: T) => Promise<Response>
): (request: T) => Promise<Response> {
  return async (request: T) => {
    const shutdownCheck = checkShutdownStatus();
    if (shutdownCheck.shouldReject) {
      return new Response(
        JSON.stringify({
          error: shutdownCheck.error || "服务正在关闭",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        }
      );
    }

    // 包装请求以追踪其完成
    const requestPromise = handler(request).finally(() => {
      // 请求完成
    });

    shutdownManager.registerRequest(requestPromise);
    return requestPromise;
  };
}

// 自动注册关闭信号监听器（仅在非测试环境）
if (process.env.NODE_ENV !== "test") {
  registerShutdownSignals();
}

export { shutdownManager };
