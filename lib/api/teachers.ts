import { getRawPostgres } from "@/lib/db";
import { hashPassword } from "@/lib/utils/crypto";
import { validateOrderBy, SORT_FIELDS, DEFAULT_SORT_FIELDS } from "@/lib/utils/sql-security";
import { promoteTeacherToClassTeacher, demoteClassTeacherToTeacher } from "./classes";
import type { User, UserInput, UserUpdate, PaginationParams, PaginatedResponse } from "@/types";

/**
 * 教师服务层
 * 专门处理教师和班主任的 CRUD 操作
 */

/**
 * 教师带班级信息的类型
 */
export interface TeacherWithClass extends Omit<User, "password_hash"> {
  class_id?: number;
  class_name?: string;
  grade_name?: string;
  semester_name?: string;
}

/**
 * 获取教师列表（分页，支持班级分配状态过滤）
 */
export async function getTeachers(
  params: PaginationParams & {
    role?: string;
    is_active?: number;
    has_class?: boolean; // 是否已分配班级
  }
): Promise<PaginatedResponse<TeacherWithClass>> {
  const pgClient = getRawPostgres();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE u.role IN ('teacher', 'class_teacher')";
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (params.search) {
    // 使用 ILIKE 进行不区分大小写的搜索
    whereClause += " AND (u.username ILIKE $" + (paramIndex++) + " OR u.real_name ILIKE $" + (paramIndex++) + " OR u.phone ILIKE $" + (paramIndex++) + ")";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (params.role) {
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
    { allowedFields: SORT_FIELDS.teachers, defaultField: DEFAULT_SORT_FIELDS.teachers }
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
      g.name as grade_name,
      s.name as semester_name
    FROM users u
    LEFT JOIN classes c ON u.id = c.class_teacher_id
    LEFT JOIN grades g ON c.grade_id = g.id
    LEFT JOIN semesters s ON c.semester_id = s.id
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(limit, offset);
  const data = await pgClient.unsafe(dataQuery, queryParams) as TeacherWithClass[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 根据ID获取教师详情（包含班级信息）
 */
export async function getTeacherById(id: number): Promise<TeacherWithClass | null> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(`
      SELECT
        u.id, u.username, u.real_name, u.role, u.phone, u.email,
        u.is_active, u.created_at, u.updated_at,
        c.id as class_id,
        c.name as class_name,
        g.name as grade_name,
        s.name as semester_name
      FROM users u
      LEFT JOIN classes c ON u.id = c.class_teacher_id
      LEFT JOIN grades g ON c.grade_id = g.id
      LEFT JOIN semesters s ON c.semester_id = s.id
      WHERE u.id = $1 AND u.role IN ('teacher', 'class_teacher')
    `, [id]) as TeacherWithClass[];

  return result[0] || null;
}

/**
 * 创建教师
 */
export async function createTeacher(input: UserInput & { password?: string }): Promise<{
  success: boolean;
  message?: string;
  teacherId?: number;
}> {
  const pgClient = getRawPostgres();

  // 验证角色只能是教师或班主任
  if (input.role !== "teacher" && input.role !== "class_teacher") {
    return { success: false, message: "教师角色只能是教师或班主任" };
  }

  // 检查用户名是否已存在
  const existingUser = await pgClient.unsafe("SELECT id FROM users WHERE username = $1", [input.username]);
  if (existingUser.length > 0) {
    return { success: false, message: "用户名已存在" };
  }

  // 如果没有提供密码，使用默认密码
  const password = input.password || "123456";
  const password_hash = await hashPassword(password);

  // 插入教师
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

  return { success: true, teacherId: result[0]?.id };
}

/**
 * 更新教师
 */
export async function updateTeacher(
  id: number,
  input: Partial<UserUpdate> & { password?: string }
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查教师是否存在
  const existingTeacherResult = await pgClient.unsafe("SELECT id, role FROM users WHERE id = $1", [id]) as { id: number; role: string }[];
  if (existingTeacherResult.length === 0) {
    return { success: false, message: "教师不存在" };
  }

  // 验证角色只能是教师或班主任
  if (input.role !== undefined && input.role !== "teacher" && input.role !== "class_teacher") {
    return { success: false, message: "教师角色只能是教师或班主任" };
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
 * 删除教师
 */
export async function deleteTeacher(id: number): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查教师是否存在
  const existingTeacherResult = await pgClient.unsafe("SELECT id, role FROM users WHERE id = $1", [id]) as { id: number; role: string }[];
  if (existingTeacherResult.length === 0) {
    return { success: false, message: "教师不存在" };
  }

  // 验证角色
  if (existingTeacherResult[0].role !== "teacher" && existingTeacherResult[0].role !== "class_teacher") {
    return { success: false, message: "该用户不是教师角色" };
  }

  // 检查是否是当前学期的班主任
  const { getCurrentSemester } = await import("./semesters");
  const currentSemester = await getCurrentSemester();
  if (currentSemester) {
    const classTeacherCheckResult = await pgClient.unsafe(
      "SELECT id FROM classes WHERE class_teacher_id = $1 AND semester_id = $2",
      [id, currentSemester.id]
    );
    if (classTeacherCheckResult.length > 0) {
      return { success: false, message: "该教师是当前学期的班主任，请先解除班级分配" };
    }
  }

  // 检查是否有请假记录
  const leaveCheckResult = await pgClient.unsafe("SELECT id FROM leave_records WHERE applicant_id = $1 OR reviewer_id = $2", [id, id]);
  if (leaveCheckResult.length > 0) {
    return { success: false, message: "该教师有请假记录，无法删除" };
  }

  // 删除教师
  await pgClient.unsafe("DELETE FROM users WHERE id = $1", [id]);

  return { success: true };
}

/**
 * 为教师分配/解除班主任角色（通过更新班级）
 */
export async function assignTeacherToClass(
  teacherId: number,
  classId: number | null
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 验证教师是否存在且是教师角色
  const teacherResult = await pgClient.unsafe(
    "SELECT id, role FROM users WHERE id = $1 AND is_active = true",
    [teacherId]
  ) as { id: number; role: string }[];

  const teacher = teacherResult[0];

  if (!teacher) {
    return { success: false, message: "教师不存在或已被禁用" };
  }

  if (teacher.role !== "teacher" && teacher.role !== "class_teacher") {
    return { success: false, message: "该用户不是教师角色" };
  }

  // 如果是分配班级
  if (classId !== null) {
    // 检查班级是否存在并获取学期ID
    const classInfo = await pgClient.unsafe(
      "SELECT id, semester_id FROM classes WHERE id = $1",
      [classId]
    ) as { id: number; semester_id: number }[];
    if (classInfo.length === 0) {
      return { success: false, message: "班级不存在" };
    }

    // 检查该教师是否已是该学期其他班级的班主任（同一学期内一对一约束）
    const existingClass = await pgClient.unsafe(
      "SELECT id FROM classes WHERE class_teacher_id = $1 AND semester_id = $2 AND id != $3",
      [teacherId, classInfo[0].semester_id, classId]
    ) as { id: number }[];

    if (existingClass.length > 0) {
      return { success: false, message: "该教师已是该学期其他班级的班主任" };
    }

    // 更新班级的班主任
    await pgClient.unsafe("UPDATE classes SET class_teacher_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [teacherId, classId]
    );

    // 将教师角色更新为班主任（复用已有函数）
    await promoteTeacherToClassTeacher(teacherId);
  } else {
    // 解除班主任分配：找到该教师担任班主任的班级并清除
    const existingClass = await pgClient.unsafe(
      "SELECT id FROM classes WHERE class_teacher_id = $1",
      [teacherId]
    ) as { id: number }[];

    if (existingClass.length > 0) {
      await pgClient.unsafe("UPDATE classes SET class_teacher_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [existingClass[0].id]
      );

      // 将班主任角色降级为教师（如果不担任其他班级）
      await demoteClassTeacherToTeacher(teacherId);
    }
  }

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
 * 切换教师状态（启用/禁用）
 */
export async function toggleTeacherStatus(id: number): Promise<{ success: boolean; message?: string; isActive?: number }> {
  const pgClient = getRawPostgres();

  // 检查教师是否存在
  const teacherResult = await pgClient.unsafe(
    "SELECT id, is_active, role FROM users WHERE id = $1 AND role IN ('teacher', 'class_teacher')",
    [id]
  ) as { id: number; is_active: boolean; role: string }[];

  if (teacherResult.length === 0) {
    return { success: false, message: "教师不存在" };
  }

  const newStatus = !teacherResult[0].is_active;

  // 如果要禁用，检查是否是班主任
  if (!newStatus) {
    const classCheckResult = await pgClient.unsafe("SELECT id FROM classes WHERE class_teacher_id = $1", [id]);
    if (classCheckResult.length > 0) {
      return { success: false, message: "该教师是班主任，请先解除班级分配" };
    }
  }

  await pgClient.unsafe("UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
    newStatus,
    id
  ]);

  return { success: true, isActive: newStatus ? 1 : 0 };
}
