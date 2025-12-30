import { NextResponse } from "next/server";

/**
 * GET /api/init - Return init status/instructions
 */
export async function GET() {
  return NextResponse.json({
    message: "Database initialization requires POST request",
    usage: "curl -X POST http://your-server:3000/api/init",
    currentDbType: "postgresql",
  });
}

/**
 * POST /api/init - Initialize the database
 * Note: PostgreSQL database is initialized via migration scripts.
 */
export async function POST() {
  try {
    return NextResponse.json({
      success: true,
      message: "PostgreSQL database is already initialized via migration scripts",
      details: {
        tables: "Tables created via migration scripts",
        indexes: "Indexes created via migration scripts",
        triggers: "Triggers initialized via setup-postgres.cjs",
        config: "System configuration migrated from SQLite",
        data: "Data migrated from SQLite via migrate-to-postgres-sql.cjs",
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
