import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 日志配置
 */
const LOG_CONFIG = {
  // 日志文件最大大小（默认 10MB）
  MAX_FILE_SIZE: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10),
  // 保留的日志文件数量（默认 5 个）
  MAX_FILES: parseInt(process.env.LOG_MAX_FILES || '5', 10),
  // 是否启用文件日志（生产环境默认启用）
  ENABLED: process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOG === 'true',
};

/**
 * 获取当前日期的日志文件名
 */
function getLogFileName(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `app-${date}.log`);
}

/**
 * 获取日志文件列表（按修改时间排序）
 */
function getLogFiles(): string[] {
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(file => file.startsWith('app-') && file.endsWith('.log'))
      .map(file => path.join(LOG_DIR, file))
      .sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtimeMs - statA.mtimeMs; // 降序，最新的在前
      });
    return files;
  } catch {
    return [];
  }
}

/**
 * 清理旧的日志文件
 */
function cleanupOldLogs(): void {
  try {
    const files = getLogFiles();

    // 保留的文件数量超过配置时，删除最旧的文件
    if (files.length > LOG_CONFIG.MAX_FILES) {
      const filesToDelete = files.slice(LOG_CONFIG.MAX_FILES);
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file);
        } catch (err) {
          console.error('删除旧日志文件失败:', file, err);
        }
      }
    }
  } catch (err) {
    console.error('清理旧日志文件失败:', err);
  }
}

/**
 * 检查日志文件大小并在需要时轮转
 */
function checkAndRotateLog(currentFile: string): void {
  try {
    if (!fs.existsSync(currentFile)) {
      return;
    }

    const stats = fs.statSync(currentFile);

    // 如果文件超过最大大小，进行轮转
    if (stats.size >= LOG_CONFIG.MAX_FILE_SIZE) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = currentFile.replace('.log', `-${timestamp}.log`);

      // 重命名当前文件
      fs.renameSync(currentFile, rotatedFile);

      // 清理旧日志
      cleanupOldLogs();
    }
  } catch (err) {
    console.error('日志轮转失败:', err);
  }
}

/**
 * 写入日志到文件
 */
export function writeToFile(level: LogLevel, message: string, meta?: unknown): void {
  if (!LOG_CONFIG.ENABLED) {
    return;
  }

  try {
    const currentFile = getLogFileName();

    // 检查并轮转日志
    checkAndRotateLog(currentFile);

    // 格式化日志条目
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    // 异步写入避免阻塞
    fs.appendFile(currentFile, logLine, (err) => {
      if (err) {
        console.error('写入日志文件失败:', err);
      }
    });
  } catch (err) {
    console.error('日志写入失败:', err);
  }
}

/**
 * 记录 DEBUG 级别日志
 */
export function logDebug(message: string, meta?: unknown): void {
  // DEBUG 级别只在开发环境写入文件
  if (process.env.NODE_ENV !== 'production') {
    writeToFile(LogLevel.DEBUG, message, meta);
  }
}

/**
 * 记录 INFO 级别日志
 */
export function logInfo(message: string, meta?: unknown): void {
  writeToFile(LogLevel.INFO, message, meta);
}

/**
 * 记录 WARN 级别日志
 */
export function logWarn(message: string, meta?: unknown): void {
  writeToFile(LogLevel.WARN, message, meta);
}

/**
 * 记录 ERROR 级别日志
 */
export function logError(message: string, meta?: unknown): void {
  writeToFile(LogLevel.ERROR, message, meta);
}

/**
 * 获取日志统计信息
 */
export function getLogStats(): {
  logDir: string;
  fileCount: number;
  totalSize: number;
  files: Array<{ name: string; size: number; modifiedAt: Date }>;
} {
  try {
    const files = getLogFiles();
    let totalSize = 0;

    const fileStats = files.map(file => {
      const stats = fs.statSync(file);
      totalSize += stats.size;
      return {
        name: path.basename(file),
        size: stats.size,
        modifiedAt: stats.mtime,
      };
    });

    return {
      logDir: LOG_DIR,
      fileCount: files.length,
      totalSize,
      files: fileStats,
    };
  } catch {
    return {
      logDir: LOG_DIR,
      fileCount: 0,
      totalSize: 0,
      files: [],
    };
  }
}

/**
 * 清空所有日志文件
 */
export function clearLogs(): void {
  try {
    const files = getLogFiles();
    for (const file of files) {
      fs.unlinkSync(file);
    }
  } catch (err) {
    console.error('清空日志文件失败:', err);
    throw err;
  }
}
