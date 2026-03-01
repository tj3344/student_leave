/**
 * 速率限制工具
 * 用于防止API滥用和DoS攻击
 */

/**
 * 速率限制配置
 */
interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 最大请求次数 */
  maxRequests: number;
}

/**
 * 速率限制记录
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * 内存存储的速率限制记录
 * 格式: Map<key, RateLimitRecord>
 * key 可以是 IP地址、用户ID等
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * 默认速率限制配置
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 3, // 最多3次请求
};

/**
 * 导入操作的速率限制配置（更严格）
 */
const IMPORT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 3, // 最多3次导入
};

/**
 * 导出操作的速率限制配置
 */
const EXPORT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 10, // 最多10次导出
};

/**
 * 清理过期的速率限制记录
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * 检查速率限制
 * @param key - 限制键（如用户ID、IP地址等）
 * @param config - 速率限制配置
 * @returns 如果允许请求返回 { allowed: true }，否则返回 { allowed: false, retryAfter }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  // 清理过期记录
  cleanupExpiredRecords();

  const now = Date.now();
  const record = rateLimitStore.get(key);

  // 如果没有记录或已过期，创建新记录
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
    };
  }

  // 检查是否超过限制
  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      retryAfter,
    };
  }

  // 增加计数
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
  };
}

/**
 * 组合键生成器（用户ID + 操作类型）
 */
export function getUserOperationKey(userId: number, operation: string): string {
  return `user:${userId}:op:${operation}`;
}

/**
 * IP地址键生成器（IP + 操作类型）
 */
export function getIpOperationKey(ip: string, operation: string): string {
  return `ip:${ip}:op:${operation}`;
}

/**
 * 导入操作速率限制检查
 */
export function checkImportRateLimit(
  userId: number,
  userIp?: string
): { allowed: boolean; retryAfter?: number; error?: string } {
  // 检查用户级别限制
  const userLimit = checkRateLimit(
    getUserOperationKey(userId, 'import'),
    IMPORT_RATE_LIMIT_CONFIG
  );

  if (!userLimit.allowed) {
    return {
      allowed: false,
      retryAfter: userLimit.retryAfter,
      error: `导入操作过于频繁，请在${userLimit.retryAfter}秒后重试`,
    };
  }

  // 如果提供了IP，也检查IP级别限制
  if (userIp) {
    const ipLimit = checkRateLimit(
      getIpOperationKey(userIp, 'import'),
      IMPORT_RATE_LIMIT_CONFIG
    );

    if (!ipLimit.allowed) {
      return {
        allowed: false,
        retryAfter: ipLimit.retryAfter,
        error: `该IP地址的导入操作过于频繁，请在${ipLimit.retryAfter}秒后重试`,
      };
    }
  }

  return { allowed: true };
}

/**
 * 导出操作速率限制检查
 */
export function checkExportRateLimit(
  userId: number,
  userIp?: string
): { allowed: boolean; retryAfter?: number; error?: string } {
  // 检查用户级别限制
  const userLimit = checkRateLimit(
    getUserOperationKey(userId, 'export'),
    EXPORT_RATE_LIMIT_CONFIG
  );

  if (!userLimit.allowed) {
    return {
      allowed: false,
      retryAfter: userLimit.retryAfter,
      error: `导出操作过于频繁，请在${userLimit.retryAfter}秒后重试`,
    };
  }

  // 如果提供了IP，也检查IP级别限制
  if (userIp) {
    const ipLimit = checkRateLimit(
      getIpOperationKey(userIp, 'export'),
      EXPORT_RATE_LIMIT_CONFIG
    );

    if (!ipLimit.allowed) {
      return {
        allowed: false,
        retryAfter: ipLimit.retryAfter,
        error: `该IP地址的导出操作过于频繁，请在${ipLimit.retryAfter}秒后重试`,
      };
    }
  }

  return { allowed: true };
}

/**
 * 获取客户端IP地址（从请求头中提取）
 */
export function getClientIp(request: Request): string {
  // 尝试从各种请求头中获取真实IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for 可能包含多个IP，取第一个
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // 如果无法从请求头获取，返回空字符串
  return '';
}

/**
 * 导出速率限制配置（供外部使用）
 */
export const RATE_LIMIT_CONFIG = {
  DEFAULT: DEFAULT_RATE_LIMIT_CONFIG,
  IMPORT: IMPORT_RATE_LIMIT_CONFIG,
  EXPORT: EXPORT_RATE_LIMIT_CONFIG,
  // 登录操作（严格限制）
  LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 } as const, // 15分钟5次
  // 密码修改（严格限制）
  PASSWORD_CHANGE: { windowMs: 60 * 60 * 1000, maxRequests: 3 } as const, // 1小时3次
  // 创建操作
  CREATE: { windowMs: 60 * 1000, maxRequests: 20 } as const, // 1分钟20次
  // 更新操作
  UPDATE: { windowMs: 60 * 1000, maxRequests: 30 } as const, // 1分钟30次
  // 删除操作
  DELETE: { windowMs: 60 * 1000, maxRequests: 10 } as const, // 1分钟10次
  // 查询操作（宽松限制）
  QUERY: { windowMs: 60 * 1000, maxRequests: 100 } as const, // 1分钟100次
  // 通知发送
  NOTIFICATION: { windowMs: 60 * 1000, maxRequests: 5 } as const, // 1分钟5次
  // 备份操作
  BACKUP: { windowMs: 60 * 60 * 1000, maxRequests: 3 } as const, // 1小时3次
} as const;

/**
 * 通用的速率限制检查函数
 * @param userId 用户ID
 * @param operation 操作类型
 * @param configName 配置名称（使用 RATE_LIMIT_CONFIG 中的预设）
 * @param request Request 对象（可选，用于获取 IP）
 */
export function checkRateLimitByConfig(
  userId: number,
  operation: string,
  configName: keyof typeof RATE_LIMIT_CONFIG = "DEFAULT",
  request?: Request
): { allowed: boolean; retryAfter?: number; error?: string } {
  const config = RATE_LIMIT_CONFIG[configName];

  // 检查用户级别限制
  const userLimit = checkRateLimit(
    getUserOperationKey(userId, operation),
    config
  );

  if (!userLimit.allowed) {
    return {
      allowed: false,
      retryAfter: userLimit.retryAfter,
      error: `${operation} 操作过于频繁，请在${userLimit.retryAfter}秒后重试`,
    };
  }

  // 如果提供了请求对象，也检查IP级别限制
  if (request) {
    const ip = getClientIp(request);
    if (ip) {
      const ipLimit = checkRateLimit(
        getIpOperationKey(ip, operation),
        config
      );

      if (!ipLimit.allowed) {
        return {
          allowed: false,
          retryAfter: ipLimit.retryAfter,
          error: `${operation} 操作过于频繁（IP限制），请在${ipLimit.retryAfter}秒后重试`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * API 路由速率限制包装器
 * 用于在 API 路由处理函数中自动应用速率限制
 *
 * @example
 * ```ts
 * export const POST = withRateLimit(
 *   async (request: NextRequest) => {
 *     // 你的 API 处理逻辑
 *     return NextResponse.json({ success: true });
 *   },
 *   "CREATE", // 操作类型
 *   "students" // 操作名称
 * );
 * ```
 */
export async function withRateLimit<T extends Request>(
  handler: (request: T, ...args: unknown[]) => Promise<Response>,
  configName: keyof typeof RATE_LIMIT_CONFIG = "DEFAULT",
  operation?: string
): Promise<Response> {
  return async (request: T, ...args: unknown[]) => {
    try {
      // 获取当前用户
      const { getCurrentUser } = await import("@/lib/api/auth");
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        // 未登录用户使用 IP 限制
        const ip = getClientIp(request);
        if (!ip) {
          return new Response(JSON.stringify({ error: "无法识别客户端" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const result = checkRateLimit(
          getIpOperationKey(ip, operation || configName.toLowerCase()),
          RATE_LIMIT_CONFIG[configName]
        );

        if (!result.allowed) {
          return new Response(
            JSON.stringify({
              error: result.error || "请求过于频繁",
              retryAfter: result.retryAfter,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(result.retryAfter || 60),
              },
            }
          );
        }
      } else {
        // 已登录用户使用用户 ID 限制
        const result = checkRateLimitByConfig(
          currentUser.id,
          operation || configName.toLowerCase(),
          configName,
          request
        );

        if (!result.allowed) {
          return new Response(
            JSON.stringify({
              error: result.error || "请求过于频繁",
              retryAfter: result.retryAfter,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(result.retryAfter || 60),
              },
            }
          );
        }
      }

      // 通过速率限制，执行实际处理函数
      return handler(request, ...args);
    } catch (error) {
      // 如果速率限制检查出错，为了安全起见仍然执行处理函数
      // 但记录错误
      console.error("速率限制检查出错:", error);
      return handler(request, ...args);
    }
  };
}
