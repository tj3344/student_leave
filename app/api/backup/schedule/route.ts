import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import type { BackupConfig } from "@/types";

/**
 * GET /api/backup/schedule - 获取自动备份配置
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_CONFIG)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { getDb } = await import("@/lib/db");
    const db = getDb();

    let config = db.prepare("SELECT * FROM backup_config WHERE id = 1").get() as BackupConfig | undefined;

    // 如果没有配置，创建默认配置
    if (!config) {
      db.prepare(
        `
        INSERT INTO backup_config (id, enabled, schedule_type, schedule_time, backup_type, modules, retention_days)
        VALUES (1, 0, 'daily', '02:00', 'full', ?, 30)
      `
      ).run(JSON.stringify(["users", "semesters", "grades", "classes", "students", "leave_records", "fee_configs"]));

      config = db.prepare("SELECT * FROM backup_config WHERE id = 1").get() as BackupConfig;
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("获取自动备份配置失败:", error);
    return NextResponse.json(
      { error: "获取自动备份配置失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/backup/schedule - 更新自动备份配置
 */
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.SYSTEM_CONFIG)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = await request.json();
    const { enabled, schedule_type, schedule_time, backup_type, modules, retention_days } = body;

    // 验证必填字段
    if (!schedule_type || !schedule_time || !backup_type || !modules || modules.length === 0) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const { getDb } = await import("@/lib/db");
    const db = getDb();

    // 检查配置是否存在
    const existing = db.prepare("SELECT id FROM backup_config WHERE id = 1").get() as { id: number } | undefined;

    if (existing) {
      // 更新配置
      db.prepare(
        `
        UPDATE backup_config
        SET enabled = ?, schedule_type = ?, schedule_time = ?, backup_type = ?, modules = ?, retention_days = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `
      ).run(
        enabled ? 1 : 0,
        schedule_type,
        schedule_time,
        backup_type,
        JSON.stringify(modules),
        retention_days || 30
      );
    } else {
      // 创建配置
      db.prepare(
        `
        INSERT INTO backup_config (id, enabled, schedule_type, schedule_time, backup_type, modules, retention_days)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        enabled ? 1 : 0,
        schedule_type,
        schedule_time,
        backup_type,
        JSON.stringify(modules),
        retention_days || 30
      );
    }

    return NextResponse.json({ success: true, message: "自动备份配置更新成功" });
  } catch (error) {
    console.error("更新自动备份配置失败:", error);
    return NextResponse.json(
      { error: "更新自动备份配置失败" },
      { status: 500 }
    );
  }
}
