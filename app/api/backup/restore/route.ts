import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { restoreFromSQL } from "@/lib/utils/backup";

/**
 * POST /api/backup/restore - 恢复备份
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_RESTORE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "请上传备份文件" }, { status: 400 });
    }

    // 验证文件类型
    if (!file.name.endsWith(".sql")) {
      return NextResponse.json({ error: "仅支持 .sql 文件" }, { status: 400 });
    }

    const sqlContent = await file.text();
    const result = await restoreFromSQL(sqlContent);

    if (result.success) {
      // 记录操作日志
      const { getRawPostgres } = await import("@/lib/db");
      const pgClient = getRawPostgres();
      await pgClient.unsafe(
        `
        INSERT INTO operation_logs (user_id, action, module, description)
        VALUES ($1, $2, $3, $4)
      `,
        [
          currentUser.id,
          "restore",
          "backup",
          `恢复数据备份，备份文件: ${file.name}`,
        ]
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("恢复备份失败:", error);
    return NextResponse.json(
      { error: "恢复备份失败", message: String(error) },
      { status: 500 }
    );
  }
}
