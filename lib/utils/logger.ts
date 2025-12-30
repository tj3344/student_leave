import { getRawPostgres } from "@/lib/db";
import type { OperationLogInput } from "@/types";
import { headers } from "next/headers";

/**
 * 获取客户端 IP 地址
 */
export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    // 尝试从多个可能的头部获取 IP
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const cfConnectingIp = headersList.get("cf-connecting-ip");

    if (forwardedFor) {
      // x-forwarded-for 可能包含多个 IP，取第一个
      return forwardedFor.split(",")[0].trim();
    }
    if (realIp) {
      return realIp;
    }
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * 记录操作日志
 * @param userId 用户 ID
 * @param action 操作类型
 * @param module 操作模块
 * @param description 操作描述
 */
export async function logOperation(
  userId: number | undefined,
  action: string,
  module: string,
  description?: string
): Promise<void> {
  try {
    const pgClient = getRawPostgres();
    const ipAddress = await getClientIp();

    await pgClient.unsafe(`
      INSERT INTO operation_logs (user_id, action, module, description, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [
      userId || null,
      action,
      module,
      description || null,
      ipAddress
    ]);
  } catch (error) {
    // 日志记录失败不应影响主业务流程，仅打印错误
    console.error("记录操作日志失败:", error);
  }
}

/**
 * 记录登录操作
 */
export async function logLogin(userId: number): Promise<void> {
  await logOperation(userId, "login", "auth", "用户登录");
}

/**
 * 记录登出操作
 */
export async function logLogout(userId: number): Promise<void> {
  await logOperation(userId, "logout", "auth", "用户登出");
}

/**
 * 记录创建操作
 */
export async function logCreate(
  userId: number | undefined,
  module: string,
  description: string
): Promise<void> {
  await logOperation(userId, "create", module, description);
}

/**
 * 记录更新操作
 */
export async function logUpdate(
  userId: number | undefined,
  module: string,
  description: string
): Promise<void> {
  await logOperation(userId, "update", module, description);
}

/**
 * 记录删除操作
 */
export async function logDelete(
  userId: number | undefined,
  module: string,
  description: string
): Promise<void> {
  await logOperation(userId, "delete", module, description);
}

/**
 * 记录导出操作
 */
export async function logExport(
  userId: number | undefined,
  module: string,
  description: string
): Promise<void> {
  await logOperation(userId, "export", module, description);
}

/**
 * 记录导入操作
 */
export async function logImport(
  userId: number | undefined,
  module: string,
  description: string
): Promise<void> {
  await logOperation(userId, "import", module, description);
}

/**
 * 记录备份操作
 */
export async function logBackup(
  userId: number | undefined,
  description: string
): Promise<void> {
  await logOperation(userId, "backup", "backup", description);
}

/**
 * 记录恢复操作
 */
export async function logRestore(
  userId: number | undefined,
  description: string
): Promise<void> {
  await logOperation(userId, "restore", "backup", description);
}

/**
 * 记录批准操作
 */
export async function logApprove(
  userId: number | undefined,
  module: string,
  description: string
): Promise<void> {
  await logOperation(userId, "approve", module, description);
}

/**
 * 记录拒绝操作
 */
export async function logReject(
  userId: number | undefined,
  module: string,
  description: string
): Promise<void> {
  await logOperation(userId, "reject", module, description);
}
