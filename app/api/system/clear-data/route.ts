import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/api/auth";
import { clearAllData } from "@/lib/api/clear-data";
import { PERMISSIONS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    if (!hasPermission(user, PERMISSIONS.SYSTEM_UPGRADE)) {
      return NextResponse.json({ error: "No permission" }, { status: 403 });
    }
    const body = await request.json();
    if (body.confirm !== true) {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }
    const result = await clearAllData(user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Clear data error:", error);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}
