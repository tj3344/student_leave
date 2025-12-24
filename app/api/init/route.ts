import { NextResponse } from "next/server";
import { getDb, seedAdminUser } from "@/lib/db";

/**
 * POST /api/init - Initialize the database with default admin user
 * This endpoint is only for development/initial setup
 */
export async function POST() {
  try {
    const db = getDb();

    // Check if users table exists and has users
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

    if (userCount.count > 0) {
      return NextResponse.json({
        success: false,
        message: "Database already has users. Initialization skipped.",
      });
    }

    // Create the default admin user
    await seedAdminUser();

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully. Default admin user created.",
      credentials: {
        username: "admin",
        password: "admin123",
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
