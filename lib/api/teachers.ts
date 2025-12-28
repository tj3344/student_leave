import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/utils/crypto";
import { validateOrderBy, SORT_FIELDS, DEFAULT_SORT_FIELDS } from "@/lib/utils/sql-security";
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
export function getTeachers(
  params: PaginationParams & {
    role?: string;
    is_active?: number;
    has_class?: boolean; // 是否已分配班级
  }
): PaginatedResponse<TeacherWithClass> {
  const db = getDb();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE u.role IN ('teacher', 'class_teacher')";
  const queryParams: (string | number)[] = [];

  if (params.search) {
    whereClause += " AND (u.username LIKE ? OR u.real_name LIKE ? OR u.phone LIKE ?)";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (params.role) {
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
  const countResult = db.prepare(countQuery).get(...queryParams) as { count: number };
  const total = countResult.count;

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
    LIMIT ? OFFSET ?
  `;
  const data = db
    .prepare(dataQuery)
    .all(...queryParams, limit, offset) as TeacherWithClass[];

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
export function getTeacherById(id: number): TeacherWithClass | null {
  const db = getDb();
  const teacher = db
    .prepare(`
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
      WHERE u.id = ? AND u.role IN ('teacher', 'class_teacher')
    `)
    .get(id) as TeacherWithClass | undefined;

  return teacher || null;
}

/**
 * 创建教师
 */
export async function createTeacher(input: UserInput & { password?: string }): Promise<{
  success: boolean;
  message?: string;
  teacherId?: number;
}> {
  const db = getDb();

  // 验证角色只能是教师或班主任
  if (input.role !== "teacher" && input.role !== "class_teacher") {
    return { success: false, message: "教师角色只能是教师或班主任" };
  }

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

  // 插入教师
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

  return { success: true, teacherId: result.lastInsertRowid as number };
}

/**
 * 更新教师
 */
export async function updateTeacher(
  id: number,
  input: Partial<UserUpdate> & { password?: string }
): Promise<{ success: boolean; message?: string }> {
  const db = getDb();

  // 检查教师是否存在
  const existingTeacher = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id) as { id: number; role: string } | undefined;
  if (!existingTeacher) {
    return { success: false, message: "教师不存在" };
  }

  // 验证角色只能是教师或班主任
  if (input.role !== undefined && input.role !== "teacher" && input.role !== "class_teacher") {
    return { success: false, message: "教师角色只能是教师或班主任" };
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
 * 删除教师
 */
export function deleteTeacher(id: number): { success: boolean; message?: string } {
  const db = getDb();

  // 检查教师是否存在
  const existingTeacher = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id) as { id: number; role: string } | undefined;
  if (!existingTeacher) {
    return { success: false, message: "教师不存在" };
  }

  // 验证角色
  if (existingTeacher.role !== "teacher" && existingTeacher.role !== "class_teacher") {
    return { success: false, message: "该用户不是教师角色" };
  }

  // 检查是否是班主任
  const classTeacherCheck = db
    .prepare("SELECT id FROM classes WHERE class_teacher_id = ?")
    .get(id);
  if (classTeacherCheck) {
    return { success: false, message: "该教师是班主任，请先解除班级分配" };
  }

  // 检查是否有请假记录
  const leaveCheck = db
    .prepare("SELECT id FROM leave_records WHERE applicant_id = ? OR reviewer_id = ?")
    .get(id, id);
  if (leaveCheck) {
    return { success: false, message: "该教师有请假记录，无法删除" };
  }

  // 删除教师
  db.prepare("DELETE FROM users WHERE id = ?").run(id);

  return { success: true };
}

/**
 * 为教师分配/解除班主任角色（通过更新班级）
 */
export function assignTeacherToClass(
  teacherId: number,
  classId: number | null
): { success: boolean; message?: string } {
  const db = getDb();

  // 验证教师是否存在且是教师角色
  const teacher = db.prepare(
    "SELECT id, role FROM users WHERE id = ? AND is_active = 1"
  ).get(teacherId) as { id: number; role: string } | undefined;

  if (!teacher) {
    return { success: false, message: "教师不存在或已被禁用" };
  }

  if (teacher.role !== "teacher" && teacher.role !== "class_teacher") {
    return { success: false, message: "该用户不是教师角色" };
  }

  // 如果是分配班级
  if (classId !== null) {
    // 检查班级是否存在
    const classExists = db.prepare("SELECT id FROM classes WHERE id = ?").get(classId);
    if (!classExists) {
      return { success: false, message: "班级不存在" };
    }

    // 检查该教师是否已是其他班级的班主任
    const existingClass = db.prepare(
      "SELECT id FROM classes WHERE class_teacher_id = ? AND id != ?"
    ).get(teacherId, classId) as { id: number } | undefined;

    if (existingClass) {
      return { success: false, message: "该教师已是其他班级的班主任" };
    }

    // 更新班级的班主任
    db.prepare("UPDATE classes SET class_teacher_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(teacherId, classId);

    // 将教师角色更新为班主任
    db.prepare("UPDATE users SET role = 'class_teacher' WHERE id = ?").run(teacherId);
  } else {
    // 解除班主任分配：找到该教师担任班主任的班级并清除
    const existingClass = db.prepare(
      "SELECT id FROM classes WHERE class_teacher_id = ?"
    ).get(teacherId) as { id: number } | undefined;

    if (existingClass) {
      db.prepare("UPDATE classes SET class_teacher_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(existingClass.id);
    }
  }

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
 * 切换教师状态（启用/禁用）
 */
export function toggleTeacherStatus(id: number): { success: boolean; message?: string; isActive?: number } {
  const db = getDb();

  // 检查教师是否存在
  const teacher = db
    .prepare("SELECT id, is_active, role FROM users WHERE id = ? AND role IN ('teacher', 'class_teacher')")
    .get(id) as { id: number; is_active: number; role: string } | undefined;

  if (!teacher) {
    return { success: false, message: "教师不存在" };
  }

  const newStatus = teacher.is_active ? 0 : 1;

  // 如果要禁用，检查是否是班主任
  if (newStatus === 0) {
    const classCheck = db.prepare("SELECT id FROM classes WHERE class_teacher_id = ?").get(id);
    if (classCheck) {
      return { success: false, message: "该教师是班主任，请先解除班级分配" };
    }
  }

  db.prepare("UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    newStatus,
    id
  );

  return { success: true, isActive: newStatus };
}
