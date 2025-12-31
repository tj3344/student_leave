import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 10;

// 数据库连接字符串加密配置
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY
  ? Buffer.from(process.env.DB_ENCRYPTION_KEY, "hex")
  : crypto.randomBytes(32);
const ALGORITHM = "aes-256-gcm";

/**
 * 对密码进行哈希加密
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 加密数据库连接字符串
 * 使用 AES-256-GCM 加密
 * 返回格式: iv:authTag:encryptedText
 */
export function encryptConnectionString(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * 解密数据库连接字符串
 * 输入格式: iv:authTag:encryptedText
 */
export function decryptConnectionString(encrypted: string): string {
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted string format");
    }

    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt connection string: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * 生成加密密钥（用于初始化）
 * 返回 hex 格式的密钥，应存储在环境变量 DB_ENCRYPTION_KEY 中
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
