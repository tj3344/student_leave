import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export function writeToFile(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(meta && { meta }),
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  // 异步写入避免阻塞
  fs.appendFile(LOG_FILE, logLine, (err) => {
    if (err) {
      console.error('写入日志文件失败:', err);
    }
  });
}

export function logInfo(message: string, meta?: unknown): void {
  writeToFile(LogLevel.INFO, message, meta);
}

export function logWarn(message: string, meta?: unknown): void {
  writeToFile(LogLevel.WARN, message, meta);
}

export function logError(message: string, meta?: unknown): void {
  writeToFile(LogLevel.ERROR, message, meta);
}
