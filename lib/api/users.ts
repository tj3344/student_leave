import { getRawPostgres } from "@/lib/db";
import { hashPassword } from "@/lib/utils/crypto";
import { validateOrderBy, SORT_FIELDS, DEFAULT_SORT_FIELDS } from "@/lib/utils/sql-security";
import type { User, UserInput, UserUpdate, PaginationParams, PaginatedResponse } from "@/types";

/**
 * 用户服务层
 */

/**
 * 获取用户列表（分页）
 */
export async function getUsers(
  params: PaginationParams & { role?: string; roles?: string[]; is_active?: number; has_class?: boolean }
): Promise<PaginatedResponse<Omit<User, "password_hash"> & { class_id?: number; class_name?: string; grade_name?: string }>> {
  const pgClient = getRawPostgres();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE 1=1";
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (params.search) {
    // 使用 ILIKE 进行不区分大小写的搜索
    whereClause += " AND (u.username ILIKE $" + (paramIndex++) + " OR u.real_name ILIKE $" + (paramIndex++) + " OR u.phone ILIKE $" + (paramIndex++) + ")";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  // 支持单个角色或角色数组
  if (params.roles && params.roles.length > 0) {
    const placeholders = params.roles.map(() => `$${paramIndex++}`).join(",");
    whereClause += ` AND u.role IN (${placeholders})`;
    queryParams.push(...params.roles);
  } else if (params.role) {
    whereClause += " AND u.role = $" + (paramIndex++);
    queryParams.push(params.role);
  }

  if (params.is_active !== undefined) {
    whereClause += " AND u.is_active = $" + (paramIndex++);
    queryParams.push(params.is_active === 1);
  }

  if (params.has_class !== undefined) {
    if (params.has_class) {
      whereClause += " AND c.id IS NOT NULL";
    } else {
      whereClause += " AND c.id IS NULL";
    }
  }

  // 排序（使用白名单验证防止 SQL 注入）
  const { orderBy, order } = validateOrderBy(
    params.sort,
    params.order,
    { allowedFields: SORT_FIELDS.users, defaultField: DEFAULT_SORT_FIELDS.users }
  );
  const orderClause = `ORDER BY ${orderBy} ${order}`;

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as count
    FROM users u
    LEFT JOIN classes c ON u.id = c.class_teacher_id
    ${whereClause}
  `;
  const countResult = await pgClient.unsafe(countQuery, queryParams) as { count: number }[];
  const total = countResult[0]?.count || 0;

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
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(limit, offset);
  const data = await pgClient.unsafe(dataQuery, queryParams) as Array<Omit<User, "password_hash"> & { class_id?: number; class_name?: string; grade_name?: string }>;

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
export async function getUserById(
  id: number
): Promise<Omit<User, "password_hash"> | null> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(
    `SELECT id, username, real_name, role, phone, email, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  ) as Omit<User, "password_hash">[];
  return result[0] || null;
}

/**
 * 创建用户
 */
export async function createUser(input: UserInput & { password?: string }): Promise<{
  success: boolean;
  message?: string;
  userId?: number;
}> {
  const pgClient = getRawPostgres();

  // 检查用户名是否已存在
  const existingUser = await pgClient.unsafe("SELECT id FROM users WHERE username = $1", [input.username]);
  if (existingUser.length > 0) {
    return { success: false, message: "用户名已存在" };
  }

  // 如果没有提供密码，使用默认密码
  const password = input.password || "123456";
  const password_hash = await hashPassword(password);

  // 插入用户
  const result = await pgClient.unsafe(
    `INSERT INTO users (username, password_hash, real_name, role, phone, email, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      input.username,
      password_hash,
      input.real_name,
      input.role,
      input.phone || null,
      input.email || null
    ]
  );

  return { success: true, userId: result[0]?.id };
}

/**
 * 更新用户
 */
export async function updateUser(
  id: number,
  input: UserUpdate & { password?: string }
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查用户是否存在
  const existingUserResult = await pgClient.unsafe("SELECT id FROM users WHERE id = $1", [id]);
  if (existingUserResult.length === 0) {
    return { success: false, message: "用户不存在" };
  }

  // 构建更新语句
  const updates: string[] = [];
  const params: (string | number | boolean)[] = [];
  let paramIndex = 1;

  if (input.real_name !== undefined) {
    updates.push(`real_name = $${paramIndex++}`);
    params.push(input.real_name);
  }
  if (input.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    params.push(input.role);
  }
  if (input.phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    params.push(input.phone);
  }
  if (input.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    params.push(input.email);
  }
  if (input.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(input.is_active === 1);
  }
  if (input.password) {
    updates.push(`password_hash = $${paramIndex++}`);
    params.push(await hashPassword(input.password));
  }

  if (updates.length === 0) {
    return { success: false, message: "没有要更新的字段" };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  await pgClient.unsafe(`UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`, params);

  return { success: true };
}

/**
 * 删除用户
 */
export async function deleteUser(id: number): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查用户是否存在
  const existingUserResult = await pgClient.unsafe("SELECT id FROM users WHERE id = $1", [id]);
  if (existingUserResult.length === 0) {
    return { success: false, message: "用户不存在" };
  }

  // 检查是否是班主任
  const classTeacherCheckResult = await pgClient.unsafe("SELECT id FROM classes WHERE class_teacher_id = $1", [id]);
  if (classTeacherCheckResult.length > 0) {
    return { success: false, message: "该用户是班主任，无法删除" };
  }

  // 检查是否有请假记录
  const leaveCheckResult = await pgClient.unsafe("SELECT id FROM leave_records WHERE applicant_id = $1 OR reviewer_id = $2", [id, id]);
  if (leaveCheckResult.length > 0) {
    return { success: false, message: "该用户有请假记录，无法删除" };
  }

  // 删除用户
  await pgClient.unsafe("DELETE FROM users WHERE id = $1", [id]);

  return { success: true };
}

/**
 * 重置用户密码
 */
export async function resetUserPassword(
  id: number,
  newPassword: string = "123456"
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查用户是否存在
  const existingUserResult = await pgClient.unsafe("SELECT id FROM users WHERE id = $1", [id]);
  if (existingUserResult.length === 0) {
    return { success: false, message: "用户不存在" };
  }

  // 更新密码
  const password_hash = await hashPassword(newPassword);
  await pgClient.unsafe("UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
    password_hash,
    id
  ]);

  return { success: true };
}

/**
 * 获取所有教师（用于下拉选择）
 */
export async function getAllTeachers(): Promise<Array<{ id: number; real_name: string; username: string }>> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(
    `SELECT id, real_name, username
     FROM users
     WHERE role IN ('teacher', 'class_teacher') AND is_active = true
     ORDER BY real_name`
  ) as Array<{ id: number; real_name: string; username: string }>;
  return result;
}

/**
 * 获取所有班主任（用于下拉选择）
 */
export async function getAllClassTeachers(): Promise<Array<{ id: number; real_name: string; username: string }>> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(
    `SELECT id, real_name, username
     FROM users
     WHERE role = 'class_teacher' AND is_active = true
     ORDER BY real_name`
  ) as Array<{ id: number; real_name: string; username: string }>;
  return result;
}

/**
 * 切换用户状态（启用/禁用）
 */
export async function toggleUserStatus(id: number): Promise<{ success: boolean; message?: string; isActive?: number }> {
  const pgClient = getRawPostgres();

  // 检查用户是否存在
  const userResult = await pgClient.unsafe("SELECT id, is_active FROM users WHERE id = $1", [id]) as
    { id: number; is_active: boolean }[];

  if (userResult.length === 0) {
    return { success: false, message: "用户不存在" };
  }

  const newStatus = !userResult[0].is_active;
  await pgClient.unsafe("UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
    newStatus,
    id
  ]);

  return { success: true, isActive: newStatus ? 1 : 0 };
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
  const errors: Array<{ row: number; input: typeof inputs[0]; message: string }> = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const rowNum = i + 1;

    // 检查用户名是否已存在
    const existingUserResult = await getRawPostgres().unsafe("SELECT id FROM users WHERE username = $1", [input.username]);

    if (existingUserResult.length > 0) {
      // 更新现有用户
      try {
        const updateResult = await updateUser((existingUserResult[0] as { id: number }).id, {
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
