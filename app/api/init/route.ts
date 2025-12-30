import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db";

/**
 * GET /api/init - Return init status/instructions
 */
export async function GET() {
  return NextResponse.json({
    message: "Database initialization requires POST request",
    usage: "curl -X POST http://your-server:3000/api/init",
  });
}

/**
 * POST /api/init - Initialize the database
 * Creates tables, indexes, triggers, and default admin user
 * This endpoint is only for initial setup
 */
export async function POST() {
  try {
    // Run complete database initialization
    // This includes: creating tables, indexes, triggers, system config, and default admin user
    await runMigrations();

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
      details: {
        tables: "Created all required tables",
        indexes: "Created all indexes",
        triggers: "Initialized student count triggers",
        config: "Initialized system configuration",
        admin: "Default admin user created (username: admin, password: admin123)",
      },
    });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Initialization failed" },
      { status: 500 }
    );
  }
}
