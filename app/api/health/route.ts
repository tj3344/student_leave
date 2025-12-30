import { NextResponse } from "next/server";
import { getRawPostgres } from "@/lib/db";

export async function GET() {
  try {
    // 检查数据库连接
    const pgClient = getRawPostgres();
    await pgClient.unsafe("SELECT 1");

    // 返回健康状态
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
