/**
 * 环境变量验证模块
 *
 * 用于在应用启动时验证必需的环境变量是否正确配置
 */

import type { EnvironmentConfig } from "@/types";

/**
 * 环境变量验证错误
 */
export class EnvironmentValidationError extends Error {
  public readonly missingVars: string[];

  constructor(missingVars: string[]) {
    const message = `缺少必需的环境变量: ${missingVars.join(", ")}`;
    super(message);
    this.name = "EnvironmentValidationError";
    this.missingVars = missingVars;
  }
}

/**
 * 环境变量验证结果
 */
export interface EnvironmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: EnvironmentConfig;
}

/**
 * 验证单个环境变量
 */
function validateEnvVar(
  name: string,
  required: boolean = true,
  validator?: (value: string) => boolean
): { valid: boolean; error?: string } {
  const value = process.env[name];

  if (!value) {
    if (required) {
      return { valid: false, error: `环境变量 ${name} 未设置` };
    }
    return { valid: true };
  }

  if (validator && !validator(value)) {
    return { valid: false, error: `环境变量 ${name} 的值无效` };
  }

  return { valid: true };
}

/**
 * 验证 PostgreSQL 连接字符串格式
 */
function isValidPostgresUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "postgresql:" || url.protocol === "postgres:";
  } catch {
    return false;
  }
}

/**
 * 验证十六进制密钥格式
 */
function isValidHexKey(value: string, expectedLength: number): boolean {
  return /^[0-9a-fA-F]+$/.test(value) && value.length === expectedLength;
}

/**
 * 验证环境变量配置
 */
export function validateEnvironment(): EnvironmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 验证必需的环境变量
  const requiredVars: Array<{
    name: keyof NodeJS.ProcessEnv;
    validator?: (value: string) => boolean;
  }> = [
    { name: "POSTGRES_URL", validator: isValidPostgresUrl },
    { name: "DB_ENCRYPTION_KEY", validator: (v) => isValidHexKey(v, 64) },
    { name: "CSRF_SECRET", validator: (v) => isValidHexKey(v, 64) },
    { name: "SESSION_SECRET" },
    { name: "NODE_ENV" },
    { name: "NEXT_PUBLIC_APP_URL" },
  ];

  for (const { name, validator } of requiredVars) {
    const result = validateEnvVar(name, true, validator);
    if (!result.valid) {
      errors.push(result.error || `${name} 验证失败`);
    }
  }

  // 验证可选环境变量
  const optionalVars: Array<{
    name: keyof NodeJS.ProcessEnv;
    validator?: (value: string) => boolean;
  }> = [
    { name: "LOG_DIR" },
    { name: "LOG_MAX_SIZE", validator: (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0 },
    { name: "LOG_MAX_FILES", validator: (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0 },
    { name: "BACKUP_DIR" },
  ];

  for (const { name, validator } of optionalVars) {
    const result = validateEnvVar(name, false, validator);
    if (!result.valid) {
      warnings.push(result.error || `${name} 配置无效，将使用默认值`);
    }
  }

  // 检查生产环境配置
  if (process.env.NODE_ENV === "production") {
    // 生产环境必须使用 HTTPS
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && appUrl.startsWith("http://")) {
      warnings.push("生产环境建议使用 HTTPS");
    }

    // 检查文件日志是否启用
    if (!process.env.ENABLE_FILE_LOG || process.env.ENABLE_FILE_LOG !== "true") {
      warnings.push("生产环境建议启用文件日志（ENABLE_FILE_LOG=true）");
    }
  }

  // 构建配置对象（如果验证通过）
  let config: EnvironmentConfig | undefined;
  if (errors.length === 0) {
    config = {
      POSTGRES_URL: process.env.POSTGRES_URL!,
      DB_ENCRYPTION_KEY: process.env.DB_ENCRYPTION_KEY!,
      CSRF_SECRET: process.env.CSRF_SECRET!,
      SESSION_SECRET: process.env.SESSION_SECRET!,
      NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
      LOG_DIR: process.env.LOG_DIR,
      LOG_MAX_SIZE: process.env.LOG_MAX_SIZE,
      LOG_MAX_FILES: process.env.LOG_MAX_FILES,
      BACKUP_DIR: process.env.BACKUP_DIR,
      ENABLE_FILE_LOG: process.env.ENABLE_FILE_LOG,
    };
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * 获取并验证环境变量配置
 * 如果验证失败，抛出异常
 */
export function getValidatedConfig(): EnvironmentConfig {
  const result = validateEnvironment();

  // 输出警告
  if (result.warnings.length > 0) {
    console.warn("⚠️  环境变量配置警告:");
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`);
    }
  }

  // 检查错误
  if (!result.isValid || !result.config) {
    console.error("❌ 环境变量验证失败:");
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    throw new EnvironmentValidationError(
      result.errors.map(e => e.replace(/环境变量 (\w+) 未设置/, "$1")).join(", ")
    );
  }

  return result.config;
}

/**
 * 打印环境配置摘要（隐藏敏感信息）
 */
export function printConfigSummary(): void {
  const config = getValidatedConfig();

  console.log("📋 环境配置摘要:");
  console.log(`  NODE_ENV: ${config.NODE_ENV}`);
  console.log(`  NEXT_PUBLIC_APP_URL: ${config.NEXT_PUBLIC_APP_URL}`);
  console.log(`  POSTGRES_URL: ${maskConnectionString(config.POSTGRES_URL)}`);
  console.log(`  DB_ENCRYPTION_KEY: ${maskSecret(config.DB_ENCRYPTION_KEY)}`);
  console.log(`  CSRF_SECRET: ${maskSecret(config.CSRF_SECRET)}`);
  console.log(`  SESSION_SECRET: ${maskSecret(config.SESSION_SECRET)}`);
  console.log(`  LOG_DIR: ${config.LOG_DIR || "默认 (logs/)"}`);
  console.log(`  BACKUP_DIR: ${config.BACKUP_DIR || "默认 (backups/)"}`);
  console.log(`  ENABLE_FILE_LOG: ${config.ENABLE_FILE_LOG || "否"}`);
}

/**
 * 隐藏数据库连接字符串中的敏感信息
 */
function maskConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    // 隐藏密码
    if (url.password) {
      url.password = "***";
    }
    // 隐藏用户名（可选）
    // url.username = "***";
    return url.toString();
  } catch {
    return "***";
  }
}

/**
 * 隐藏密钥
 */
function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return "***";
  }
  return `${secret.substring(0, 8)}...${secret.substring(secret.length - 4)}`;
}

/**
 * 启动时验证环境变量（自动调用）
 */
export function initEnvironmentCheck(): void {
  try {
    const result = validateEnvironment();

    if (result.warnings.length > 0) {
      console.warn("⚠️  环境变量配置警告:");
      for (const warning of result.warnings) {
        console.warn(`  - ${warning}`);
      }
    }

    if (!result.isValid) {
      console.error("❌ 环境变量验证失败:");
      for (const error of result.errors) {
        console.error(`  - ${error}`);
      }
      throw new EnvironmentValidationError(
        result.errors.map(e => e.replace(/环境变量 (\w+) 未设置/, "$1")).join(", ")
      );
    }

    console.log("✅ 环境变量验证通过");
  } catch (error) {
    console.error("❌ 环境变量初始化失败:", error);
    throw error;
  }
}
