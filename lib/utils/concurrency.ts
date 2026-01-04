/**
 * 并发控制工具
 * 用于限制同时进行的操作数量，防止资源耗尽
 */

/**
 * 并发控制配置
 */
interface ConcurrencyConfig {
  /** 最大并发数量 */
  maxConcurrent: number;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 并发槽位
 */
interface ConcurrencySlot {
  id: string;
  startTime: number;
}

/**
 * 内存存储的并发记录
 * 格式: Map<operationType, ConcurrencySlot[]>
 */
const concurrencyStore = new Map<string, ConcurrencySlot[]>();

/**
 * 导出操作的并发限制配置
 */
const EXPORT_CONCURRENCY_CONFIG: ConcurrencyConfig = {
  maxConcurrent: 5, // 最多5个并发导出
  timeout: 5 * 60 * 1000, // 5分钟超时
};

/**
 * 导入操作的并发限制配置
 */
const IMPORT_CONCURRENCY_CONFIG: ConcurrencyConfig = {
  maxConcurrent: 3, // 最多3个并发导入
  timeout: 10 * 60 * 1000, // 10分钟超时
};

/**
 * 清理超时的并发记录
 * @param operationType - 操作类型
 * @param config - 并发配置
 */
function cleanupExpiredSlots(operationType: string, config: ConcurrencyConfig): void {
  const slots = concurrencyStore.get(operationType);
  if (!slots) return;

  const now = Date.now();
  const timeout = config.timeout || 5 * 60 * 1000;

  // 移除超时的槽位
  const validSlots = slots.filter(slot => {
    const elapsed = now - slot.startTime;
    return elapsed < timeout;
  });

  concurrencyStore.set(operationType, validSlots);
}

/**
 * 检查并发限制
 * @param operationType - 操作类型（如 'export', 'import'）
 * @param config - 并发配置
 * @returns 如果允许操作返回 { allowed: true }，否则返回 { allowed: false, message }
 */
export function checkConcurrency(
  operationType: string,
  config: ConcurrencyConfig
): { allowed: boolean; message?: string } {
  // 清理超时记录
  cleanupExpiredSlots(operationType, config);

  // 获取当前槽位
  let slots = concurrencyStore.get(operationType);
  if (!slots) {
    slots = [];
    concurrencyStore.set(operationType, slots);
  }

  // 检查是否超过限制
  if (slots.length >= config.maxConcurrent) {
    return {
      allowed: false,
      message: `系统繁忙，当前有 ${slots.length} 个${operationType === 'export' ? '导出' : '导入'}任务正在进行，请稍后重试`
    };
  }

  return { allowed: true };
}

/**
 * 获取并发槽位
 * @param operationType - 操作类型
 * @param config - 并发配置
 * @returns 槽位ID，如果获取失败返回 null
 */
export function acquireSlot(
  operationType: string,
  config: ConcurrencyConfig
): string | null {
  // 检查是否允许获取槽位
  const check = checkConcurrency(operationType, config);
  if (!check.allowed) {
    return null;
  }

  // 创建新槽位
  const slotId = `${operationType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const slot: ConcurrencySlot = {
    id: slotId,
    startTime: Date.now(),
  };

  // 添加到存储
  const slots = concurrencyStore.get(operationType)!;
  slots.push(slot);

  return slotId;
}

/**
 * 释放并发槽位
 * @param operationType - 操作类型
 * @param slotId - 槽位ID
 */
export function releaseSlot(operationType: string, slotId: string): void {
  const slots = concurrencyStore.get(operationType);
  if (!slots) return;

  // 移除指定槽位
  const index = slots.findIndex(slot => slot.id === slotId);
  if (index !== -1) {
    slots.splice(index, 1);
  }
}

/**
 * 导出操作并发限制检查
 * @param userId - 用户ID
 * @returns 检查结果
 */
export function checkExportConcurrency(
  userId: number
): { allowed: boolean; message?: string; slotId?: string } {
  const operationType = 'export';

  // 检查是否允许
  const check = checkConcurrency(operationType, EXPORT_CONCURRENCY_CONFIG);
  if (!check.allowed) {
    return {
      allowed: false,
      message: check.message
    };
  }

  // 获取槽位
  const slotId = acquireSlot(operationType, EXPORT_CONCURRENCY_CONFIG);
  if (!slotId) {
    return {
      allowed: false,
      message: '系统繁忙，请稍后重试'
    };
  }

  return {
    allowed: true,
    slotId
  };
}

/**
 * 释放导出操作槽位
 * @param slotId - 槽位ID
 */
export function releaseExportSlot(slotId: string): void {
  releaseSlot('export', slotId);
}

/**
 * 获取当前并发状态
 * @param operationType - 操作类型
 * @returns 并发状态信息
 */
export function getConcurrencyStatus(operationType: string): {
  current: number;
  max: number;
  available: number;
} {
  cleanupExpiredSlots(operationType, EXPORT_CONCURRENCY_CONFIG);

  const slots = concurrencyStore.get(operationType) || [];
  const maxConcurrent = operationType === 'export'
    ? EXPORT_CONCURRENCY_CONFIG.maxConcurrent
    : IMPORT_CONCURRENCY_CONFIG.maxConcurrent;

  return {
    current: slots.length,
    max: maxConcurrent,
    available: Math.max(0, maxConcurrent - slots.length),
  };
}

/**
 * 导出并发限制配置（供外部使用）
 */
export const CONCURRENCY_CONFIG = {
  EXPORT: EXPORT_CONCURRENCY_CONFIG,
  IMPORT: IMPORT_CONCURRENCY_CONFIG,
} as const;
