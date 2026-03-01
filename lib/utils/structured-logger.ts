/**
 * 结构化日志工具
 *
 * 提供统一的日志记录接口，支持日志级别、敏感信息脱敏和结构化输出
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志级别名称映射
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
};

/**
 * 获取当前环境的最小日志级别
 */
function getMinLogLevel(): LogLevel {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    return LogLevel.WARN; // 生产环境只记录 WARN 和 ERROR
  }
  if (nodeEnv === "test") {
    return LogLevel.ERROR; // 测试环境只记录 ERROR
  }
  return LogLevel.DEBUG; // 开发环境记录所有级别
}

/**
 * 敏感信息脱敏模式
 */
const SANITIZE_PATTERNS = [
  // 密码相关
  { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password":"***"' },
  { pattern: /"pwd"\s*:\s*"[^"]*"/gi, replacement: '"pwd":"***"' },
  { pattern: /"passwd"\s*:\s*"[^"]*"/gi, replacement: '"passwd":"***"' },
  // 手机号（中国大陆）
  { pattern: /(\d{3})\d{4}(\d{4})/g, replacement: "$1****$2" },
  // 身份证号
  { pattern: /(\d{6})\d{8}(\d{4})/g, replacement: "$1********$2" },
  // 邮箱
  { pattern: /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, replacement: "***@$2" },
  // API 密钥
  { pattern: /"api[_-]?key"\s*:\s*"[^"]*"/gi, replacement: '"api_key":"***"' },
  { pattern: /"token"\s*:\s*"[^"]*"/gi, replacement: '"token":"***"' },
  // 数据库连接字符串
  { pattern: /postgresql:\/\/[^@]+@/gi, replacement: "postgresql://***@" },
  // Session ID
  { pattern: /"session"\s*:\s*"[^"]*"/gi, replacement: '"session":"***"' },
];

/**
 * 脱敏处理
 * @param data 要脱敏的数据
 * @returns 脱敏后的数据
 */
function sanitize(data: unknown): unknown {
  if (typeof data === "string") {
    let result = data;
    for (const { pattern, replacement } of SANITIZE_PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  if (typeof data === "object" && data !== null) {
    if (Array.isArray(data)) {
      return data.map(sanitize);
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // 检查键名是否敏感
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("pwd") ||
        lowerKey.includes("passwd") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("token") ||
        lowerKey.includes("api_key") ||
        lowerKey.includes("apikey")
      ) {
        sanitized[key] = "***";
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * 日志条目结构
 */
interface LogEntry {
  level: string;
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * 格式化日志条目为 JSON
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): string {
  const entry: LogEntry = {
    level: LOG_LEVEL_NAMES[level],
    timestamp: new Date().toISOString(),
    message,
  };

  if (context) {
    entry.context = sanitize(context) as Record<string, unknown>;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: sanitize(error.message) as string,
    };
    // 只在开发环境包含堆栈信息
    if (process.env.NODE_ENV !== "production" && error.stack) {
      entry.error.stack = error.stack;
    }
  }

  return JSON.stringify(entry);
}

/**
 * 输出日志到控制台
 */
function outputLog(level: LogLevel, message: string, entry: string): void {
  const minLevel = getMinLogLevel();
  if (level < minLevel) {
    return;
  }

  // 根据级别选择输出方法
  const consoleMethod = level >= LogLevel.ERROR ? console.error : level >= LogLevel.WARN ? console.warn : console.log;

  consoleMethod(entry);
}

/**
 * 记录 DEBUG 级别日志
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  const entry = formatLogEntry(LogLevel.DEBUG, message, context);
  outputLog(LogLevel.DEBUG, message, entry);
}

/**
 * 记录 INFO 级别日志
 */
export function info(message: string, context?: Record<string, unknown>): void {
  const entry = formatLogEntry(LogLevel.INFO, message, context);
  outputLog(LogLevel.INFO, message, entry);
}

/**
 * 记录 WARN 级别日志
 */
export function warn(message: string, context?: Record<string, unknown>): void {
  const entry = formatLogEntry(LogLevel.WARN, message, context);
  outputLog(LogLevel.WARN, message, entry);
}

/**
 * 记录 ERROR 级别日志
 */
export function error(message: string, error?: Error, context?: Record<string, unknown>): void {
  const entry = formatLogEntry(LogLevel.ERROR, message, context, error);
  outputLog(LogLevel.ERROR, message, entry);
}

/**
 * 创建带上下文的日志记录器
 * @param baseContext 基础上下文，会自动添加到每条日志
 * @returns 日志记录器对象
 */
export function createLogger(baseContext: Record<string, unknown> = {}) {
  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: Record<string, unknown>) =>
      info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: Record<string, unknown>) =>
      warn(message, { ...baseContext, ...context }),
    error: (message: string, error?: Error, context?: Record<string, unknown>) =>
      error(message, error, { ...baseContext, ...context }),
  };
}

/**
 * 导出默认日志记录器
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  createLogger,
};

export default logger;
