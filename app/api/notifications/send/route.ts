import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { createNotification, createNotificationBatch } from "@/lib/api/notifications";
import { hasPermission, PERMISSIONS, OPERATION_MODULES } from "@/lib/constants";
import { logCreate } from "@/lib/utils/logger";
import type { NotificationInput, NotificationCreateBatch } from "@/types";

/**
 * POST /api/notifications/send - 发送通知
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.NOTIFICATION_SEND)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = await request.json();
    const isBatch = body.receiver_ids && Array.isArray(body.receiver_ids);

    if (isBatch) {
      // 批量发送
      const input = body as NotificationCreateBatch;
      if (
        !input.receiver_ids ||
        input.receiver_ids.length === 0 ||
        !input.title ||
        !input.content
      ) {
        return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
      }

      const result = await createNotificationBatch(currentUser.id, input);

      // 记录日志
      await logCreate(
        currentUser.id,
        OPERATION_MODULES.NOTIFICATIONS,
        `批量发送通知：${input.title}，接收者 ${result.created} 人`
      );

      return NextResponse.json({
        success: true,
        created: result.created,
        failed: result.failed,
        errors: result.errors,
      });
    } else {
      // 单个发送
      const input = body as NotificationInput;
      if (!input.receiver_id || !input.title || !input.content) {
        return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
      }

      const result = await createNotification(currentUser.id, input);

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      // 记录日志
      await logCreate(
        currentUser.id,
        OPERATION_MODULES.NOTIFICATIONS,
        `发送通知：${input.title}`
      );

      return NextResponse.json({ success: true, notificationId: result.notificationId });
    }
  } catch (error) {
    console.error("发送通知失败:", error);
    return NextResponse.json({ error: "发送通知失败" }, { status: 500 });
  }
}
