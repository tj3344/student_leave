import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRawPostgres } from "@/lib/db";
import { validateEnvironment } from "@/lib/config/env-validation";
import { cache } from "@/lib/cache";

/**
 * 健康检查响应接口
 */
interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version?: string;
  environment: string;
  checks: {
    database: {
      status: "pass" | "fail";
      latency?: number;
      error?: string;
    };
    environment: {
      status: "pass" | "fail";
      errors?: string[];
      warnings?: string[];
    };
    memory: {
      status: "pass" | "warn" | "fail";
      usage: NodeJS.MemoryUsage;
      pressure: number;
    };
    disk?: {
      status: "pass" | "warn" | "fail";
      path: string;
      free: number;
      total: number;
    };
  };
}

/**
 * 获取应用版本
 */
function getAppVersion(): string {
  return process.env.npm_package_version || process.env.APP_VERSION || "0.1.0";
}

/**
 * 计算内存压力（0-100）
 */
function getMemoryPressure(memoryUsage: NodeJS.MemoryUsage): number {
  const used = memoryUsage.heapUsed;
  const total = memoryUsage.heapTotal;
  const pressure = (used / total) * 100;
  return Math.min(Math.max(pressure, 0), 100);
}

/**
 * 获取磁盘空间信息（可选）
 */
function getDiskInfo(): { free: number; total: number } | null {
  try {
    const fs = require("fs");
    const path = require("path");
    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");

    if (fs.existsSync(backupDir)) {
      const stats = fs.statSync(backupDir);
      return {
        free: stats.size || 0,
        total: stats.size || 0,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheckResponse["checks"] = {
    database: { status: "pass" },
    environment: { status: "pass" },
    memory: { status: "pass" },
  };

  // 检查数据库连接
  try {
    const pgClient = getRawPostgres();
    await pgClient.unsafe("SELECT 1");
    checks.database = {
      status: "pass",
      latency: Date.now() - startTime,
    };
  } catch (error) {
    checks.database = {
      status: "fail",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // 检查环境变量
  try {
    const envResult = validateEnvironment();
    if (envResult.isValid) {
      checks.environment = {
        status: "pass",
        warnings: envResult.warnings,
      };
    } else {
      checks.environment = {
        status: "fail",
        errors: envResult.errors,
      };
    }
  } catch (error) {
    checks.environment = {
      status: "fail",
      errors: [error instanceof Error ? error.message : "Environment check failed"],
    };
  }

  // 检查内存使用
  const memoryUsage = process.memoryUsage();
  const memoryPressure = getMemoryPressure(memoryUsage);

  if (memoryPressure > 90) {
    checks.memory = { status: "fail", usage: memoryUsage, pressure: memoryPressure };
  } else if (memoryPressure > 70) {
    checks.memory = { status: "warn", usage: memoryUsage, pressure: memoryPressure };
  } else {
    checks.memory = { status: "pass", usage: memoryUsage, pressure: memoryPressure };
  }

  // 可选：检查磁盘空间
  const diskInfo = getDiskInfo();
  if (diskInfo) {
    checks.disk = {
      status: diskInfo.free > 1024 * 1024 * 100 ? "pass" : "warn",
      path: process.env.BACKUP_DIR || "backups",
      free: diskInfo.free,
      total: diskInfo.total,
    };
  }

  // 确定整体健康状态
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

  if (checks.database.status === "fail" || checks.environment.status === "fail") {
    overallStatus = "unhealthy";
  } else if (checks.memory.status === "warn" || checks.memory.status === "fail") {
    overallStatus = "degraded";
  }

  // 根据状态返回相应的 HTTP 状态码
  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: getAppVersion(),
    environment: process.env.NODE_ENV || "unknown",
    checks,
  };

  return NextResponse.json(response, { status: statusCode });
}
