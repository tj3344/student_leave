import { cookies } from "next/headers";
import { getRawPostgres } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/utils/crypto";
import type { User, UserRole } from "@/types";
import type { LoginInput, UserCreateInput } from "@/lib/utils/validation";
import { loginSchema, userCreateSchema } from "@/lib/utils/validation";
import { hasPermission as checkPermission, ROLES } from "@/lib/constants";
import { logLogin } from "@/lib/utils/logger";

// 允许登录的角色
const ALLOWED_LOGIN_ROLES: UserRole[] = [ROLES.ADMIN, ROLES.CLASS_TEACHER];

const SESSION_COOKIE_NAME = "student_leave_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 天

/**
 * 用户登录
 */
export async function login(
  input: LoginInput
): Promise<{ success: boolean; message?: string; user?: Omit<User, "password_hash"> }> {
  // 验证输入
  const validated = loginSchema.parse(input);

  const pgClient = getRawPostgres();

  // 查询用户
  const users = await pgClient.unsafe(
    "SELECT * FROM users WHERE username = $1 AND is_active = true",
    [validated.username]
  );
  const user = users[0] as User | undefined;

  if (!user) {
    console.log("[LOGIN] User not found:", validated.username);
    return { success: false, message: "用户名或密码错误" };
  }

  console.log("[LOGIN] User found:", user.username, "Role:", user.role);

  // 验证密码
  const isValid = await verifyPassword(validated.password, user.password_hash);
  console.log("[LOGIN] Password valid:", isValid);
  if (!isValid) {
    return { success: false, message: "用户名或密码错误" };
  }

  // 检查角色权限
  if (!ALLOWED_LOGIN_ROLES.includes(user.role)) {
    console.log("[LOGIN] Role not allowed:", user.role);
    return { success: false, message: "无权限登录，仅管理员和班主任可登录" };
  }

  // 设置会话
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, user.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  // 返回用户信息（不包含密码）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...userWithoutPassword } = user;

  // 记录登录日志
  await logLogin(user.id);

  return { success: true, user: userWithoutPassword };
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * 获取当前登录用户
 */
export async function getCurrentUser(): Promise<Omit<User, "password_hash"> | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  const userId = parseInt(sessionCookie.value, 10);
  if (isNaN(userId)) {
    return null;
  }

  const pgClient = getRawPostgres();
  const users = await pgClient.unsafe(
    "SELECT * FROM users WHERE id = $1 AND is_active = true",
    [userId]
  );
  const user = users[0] as User | undefined;

  if (!user) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * 创建用户
 */
export async function createUser(
  input: UserCreateInput
): Promise<{ success: boolean; message?: string; userId?: number }> {
  // 验证输入
  const validated = userCreateSchema.parse(input);

  const pgClient = getRawPostgres();

  // 检查用户名是否已存在
  const existingUsers = await pgClient.unsafe("SELECT id FROM users WHERE username = $1", [validated.username]);
  if (existingUsers.length > 0) {
    return { success: false, message: "用户名已存在" };
  }

  // 加密密码
  const password_hash = await hashPassword(validated.password);

  // 插入用户
  const result = await pgClient.unsafe(
    `INSERT INTO users (username, password_hash, real_name, role, phone, email, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      validated.username,
      password_hash,
      validated.real_name,
      validated.role,
      validated.phone || null,
      validated.email || null
    ]
  );

  return { success: true, userId: result[0]?.id };
}

/**
 * 修改密码
 */
export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 获取用户
  const users = await pgClient.unsafe("SELECT password_hash FROM users WHERE id = $1", [userId]);
  const user = users[0] as { password_hash: string } | undefined;

  if (!user) {
    return { success: false, message: "用户不存在" };
  }

  // 验证旧密码
  const isValid = await verifyPassword(oldPassword, user.password_hash);
  if (!isValid) {
    return { success: false, message: "原密码错误" };
  }

  // 加密新密码
  const password_hash = await hashPassword(newPassword);

  // 更新密码
  await pgClient.unsafe(
    "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [password_hash, userId]
  );

  return { success: true };
}

/**
 * 检查用户权限
 */
export function hasPermission(user: Omit<User, "password_hash">, permission: string): boolean {
  return checkPermission(user.role, permission);
}
