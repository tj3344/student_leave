import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/utils/crypto";
import type { User, UserInput, UserUpdate, PaginationParams, PaginatedResponse } from "@/types";

/**
 * 用户服务层
 */

/**
 * 获取用户列表（分页）
 */
export function getUsers(
  params: PaginationParams & { role?: string; roles?: string[]; is_active?: number; has_class?: boolean }
): PaginatedResponse<Omit<User, "password_hash"> & { class_id?: number; class_name?: string; grade_name?: string }> {
  const db = getDb();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE 1=1";
  const queryParams: (string | number)[] = [];

  if (params.search) {
    whereClause += " AND (u.username LIKE ? OR u.real_name LIKE ? OR u.phone LIKE ?)";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  // 支持单个角色或角色数组
  if (params.roles && params.roles.length > 0) {
    const placeholders = params.roles.map(() => "?").join(",");
    whereClause += ` AND u.role IN (${placeholders})`;
    queryParams.push(...params.roles);
  } else if (params.role) {
    whereClause += " AND u.role = ?";
    queryParams.push(params.role);
  }

  if (params.is_active !== undefined) {
    whereClause += " AND u.is_active = ?";
    queryParams.push(params.is_active);
  }

  if (params.has_class !== undefined) {
    if (params.has_class) {
      whereClause += " AND c.id IS NOT NULL";
    } else {
      whereClause += " AND c.id IS NULL";
    }
  }

  // 排序
  const orderBy = params.sort || "u.created_at";
  const order = params.order || "desc";
  const orderClause = `ORDER BY ${orderBy} ${order}`;

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as count
    FROM users u
    LEFT JOIN classes c ON u.id = c.class_teacher_id
    ${whereClause}
  `;
  const countResult = db.prepare(countQuery).get(...queryParams) as { count: number };
  const total = countResult.count;

  // 获取数据
  const dataQuery = `
    SELECT
      u.id, u.username, u.real_name, u.role, u.phone, u.email,
      u.is_active, u.created_at, u.updated_at,
      c.id as class_id,
      c.name as class_name,
      g.name as grade_name
    FROM users u
    LEFT JOIN classes c ON u.id = c.class_teacher_id
    LEFT JOIN grades g ON c.grade_id = g.id
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;
  const data = db
    .prepare(dataQuery)
    .all(...queryParams, limit, offset) as Array<Omit<User, "password_hash"> & { class_id?: number; class_name?: string; grade_name?: string }>;

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 根据ID获取用户
 */
export function getUserById(
  id: number
): Omit<User, "password_hash"> | null {
  const db = getDb();
  const user = db
    .prepare(
      `SELECT id, username, real_name, role, phone, email, is_active, created_at, updated_at
       FROM users WHERE id = ?`
    )
    .get(id) as Omit<User, "password_hash"> | undefined;

  return user || null;
}

/**
 * 创建用户
 */
export async function createUser(input: UserInput & { password?: string }): Promise<{
  success: boolean;
  message?: string;
  userId?: number;
}> {
  const db = getDb();

  // 检查用户名是否已存在
  const existingUser = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(input.username);
  if (existingUser) {
    return { success: false, message: "用户名已存在" };
  }

  // 如果没有提供密码，使用默认密码
  const password = input.password || "123456";
  const password_hash = await hashPassword(password);

  // 插入用户
  const result = db
    .prepare(
      `INSERT INTO users (username, password_hash, real_name, role, phone, email)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.username,
      password_hash,
      input.real_name,
      input.role,
      input.phone || null,
      input.email || null
    );

  return { success: true, userId: result.lastInsertRowid as number };
}

/**
 * 更新用户
 */
export async function updateUser(
  id: number,
  input: UserUpdate & { password?: string }
): Promise<{ success: boolean; message?: string }> {
  const db = getDb();

  // 检查用户是否存在
  const existingUser = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existingUser) {
    return { success: false, message: "用户不存在" };
  }

  // 构建更新语句
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (input.real_name !== undefined) {
    updates.push("real_name = ?");
    params.push(input.real_name);
  }
  if (input.role !== undefined) {
    updates.push("role = ?");
    params.push(input.role);
  }
  if (input.phone !== undefined) {
    updates.push("phone = ?");
    params.push(input.phone);
  }
  if (input.email !== undefined) {
    updates.push("email = ?");
    params.push(input.email);
  }
  if (input.is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(input.is_active);
  }
  if (input.password) {
    updates.push("password_hash = ?");
    params.push(await hashPassword(input.password));
  }

  if (updates.length === 0) {
    return { success: false, message: "没有要更新的字段" };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  return { success: true };
}

/**
 * 删除用户
 */
export function deleteUser(id: number): { success: boolean; message?: string } {
  const db = getDb();

  // 检查用户是否存在
  const existingUser = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existingUser) {
    return { success: false, message: "用户不存在" };
  }

  // 检查是否是班主任
  const classTeacherCheck = db
    .prepare("SELECT id FROM classes WHERE class_teacher_id = ?")
    .get(id);
  if (classTeacherCheck) {
    return { success: false, message: "该用户是班主任，无法删除" };
  }

  // 检查是否有请假记录
  const leaveCheck = db
    .prepare("SELECT id FROM leave_records WHERE applicant_id = ? OR reviewer_id = ?")
    .get(id, id);
  if (leaveCheck) {
    return { success: false, message: "该用户有请假记录，无法删除" };
  }

  // 删除用户
  db.prepare("DELETE FROM users WHERE id = ?").run(id);

  return { success: true };
}

/**
 * 重置用户密码
 */
export function resetUserPassword(
  id: number,
  newPassword: string = "123456"
): { success: boolean; message?: string } {
  const db = getDb();

  // 检查用户是否存在
  const existingUser = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existingUser) {
    return { success: false, message: "用户不存在" };
  }

  // 更新密码
  const password_hash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    password_hash,
    id
  );

  return { success: true };
}

/**
 * 获取所有教师（用于下拉选择）
 */
export function getAllTeachers(): Array<{ id: number; real_name: string; username: string }> {
  const db = getDb();
  const teachers = db
    .prepare(
      `SELECT id, real_name, username
       FROM users
       WHERE role IN ('teacher', 'class_teacher') AND is_active = 1
       ORDER BY real_name`
    )
    .all() as Array<{ id: number; real_name: string; username: string }>;

  return teachers;
}

/**
 * 获取所有班主任（用于下拉选择）
 */
export function getAllClassTeachers(): Array<{ id: number; real_name: string; username: string }> {
  const db = getDb();
  const teachers = db
    .prepare(
      `SELECT id, real_name, username
       FROM users
       WHERE role = 'class_teacher' AND is_active = 1
       ORDER BY real_name`
    )
    .all() as Array<{ id: number; real_name: string; username: string }>;

  return teachers;
}

/**
 * 切换用户状态（启用/禁用）
 */
export function toggleUserStatus(id: number): { success: boolean; message?: string; isActive?: number } {
  const db = getDb();

  // 检查用户是否存在
  const user = db
    .prepare("SELECT id, is_active FROM users WHERE id = ?")
    .get(id) as { id: number; is_active: number } | undefined;

  if (!user) {
    return { success: false, message: "用户不存在" };
  }

  const newStatus = user.is_active ? 0 : 1;
  db.prepare("UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    newStatus,
    id
  );

  return { success: true, isActive: newStatus };
}

/**
 * 批量创建/更新用户
 */
export async function batchCreateOrUpdateUsers(
  inputs: Array<{ username: string; password?: string; real_name: string; role: string; phone?: string; email?: string }>
): Promise<{
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; input: typeof inputs[0]; message: string }>;
}> {
  const db = getDb();
  const errors: Array<{ row: number; input: typeof inputs[0]; message: string }> = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const rowNum = i + 1;

    // 检查用户名是否已存在
    const existingUser = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(input.username);

    if (existingUser) {
      // 更新现有用户
      try {
        const updateResult = await updateUser((existingUser as { id: number }).id, {
          real_name: input.real_name,
          role: input.role as "admin" | "teacher" | "class_teacher",
          phone: input.phone,
          email: input.email,
          password: input.password,
        });
        if (updateResult.success) {
          updated++;
        } else {
          errors.push({ row: rowNum, input, message: updateResult.message || "更新失败" });
        }
      } catch {
        errors.push({ row: rowNum, input, message: "更新失败" });
      }
    } else {
      // 创建新用户
      try {
        const createResult = await createUser({
          ...input,
          role: input.role as "admin" | "teacher" | "class_teacher",
          password: input.password || "123456", // 确保有默认密码
        });
        if (createResult.success) {
          created++;
        } else {
          errors.push({ row: rowNum, input, message: createResult.message || "创建失败" });
        }
      } catch {
        errors.push({ row: rowNum, input, message: "创建失败" });
      }
    }
  }

  return {
    success: true,
    created,
    updated,
    failed: errors.length,
    errors,
  };
}
