import path from "path";
import fs from "fs";

/**
 * 路径安全验证工具
 *
 * 用于防止路径遍历攻击（Path Traversal），确保文件操作在允许的目录范围内
 */

/**
 * 验证文件路径是否安全（防止路径遍历攻击）
 *
 * @param requestedPath - 请求的文件路径
 * @param allowedBaseDir - 允许的基础目录（白名单）
 * @returns 规范化后的安全路径，如果不安全则返回 null
 *
 * @example
 * ```ts
 * const safePath = validatePath("../../etc/passwd", "/app/backups");
 * // 返回 null（因为路径在允许目录外）
 *
 * const safePath = validatePath("backup-2024.sql", "/app/backups");
 * // 返回 "/app/backups/backup-2024.sql"
 * ```
 */
export function validatePath(requestedPath: string, allowedBaseDir: string): string | null {
  try {
    // 规范化基础目录
    const normalizedBaseDir = path.normalize(allowedBaseDir);

    // 解析请求的路径
    const resolvedPath = path.resolve(normalizedBaseDir, requestedPath);

    // 规范化解析后的路径（消除 ../ 等）
    const normalizedResolvedPath = path.normalize(resolvedPath);

    // 验证解析后的路径是否在基础目录内
    // 使用 path.relative 检查是否有 .. 开头（表示跳出基础目录）
    const relativePath = path.relative(normalizedBaseDir, normalizedResolvedPath);

    // 如果相对路径以 .. 开头，说明路径跳出了基础目录
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return null;
    }

    // 确保最终路径在基础目录内
    if (!normalizedResolvedPath.startsWith(normalizedBaseDir + path.sep) &&
        normalizedResolvedPath !== normalizedBaseDir) {
      return null;
    }

    return normalizedResolvedPath;
  } catch {
    return null;
  }
}

/**
 * 验证文件路径并检查文件是否存在
 *
 * @param requestedPath - 请求的文件路径
 * @param allowedBaseDir - 允许的基础目录
 * @returns 文件信息，如果路径不安全或文件不存在则返回 null
 */
export function validateFilePath(requestedPath: string, allowedBaseDir: string): {
  safePath: string;
  exists: boolean;
  isFile: boolean;
} | null {
  const safePath = validatePath(requestedPath, allowedBaseDir);

  if (!safePath) {
    return null;
  }

  try {
    const exists = fs.existsSync(safePath);
    const isFile = exists ? fs.statSync(safePath).isFile() : false;

    return {
      safePath,
      exists,
      isFile,
    };
  } catch {
    return null;
  }
}

/**
 * 获取备份目录路径（从环境变量或使用默认值）
 */
export function getBackupDirectory(): string {
  return process.env.BACKUP_DIR || path.join(process.cwd(), "data", "backups");
}

/**
 * 验证备份文件路径
 *
 * @param fileName - 请求的备份文件名
 * @returns 验证结果
 */
export function validateBackupPath(fileName: string): {
  safePath: string | null;
  exists: boolean;
  isFile: boolean;
  error?: string;
} {
  // 安全检查：文件名只允许字母、数字、连字符、下划线和点
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "");

  if (safeFileName !== fileName) {
    return {
      safePath: null,
      exists: false,
      isFile: false,
      error: "文件名包含非法字符",
    };
  }

  const backupDir = getBackupDirectory();
  const result = validateFilePath(safeFileName, backupDir);

  if (!result) {
    return {
      safePath: null,
      exists: false,
      isFile: false,
      error: "路径验证失败",
    };
  }

  return {
    safePath: result.safePath,
    exists: result.exists,
    isFile: result.isFile,
  };
}
