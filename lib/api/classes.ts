import { getDb } from "@/lib/db";
import type {
  ClassInput,
  ClassWithDetails,
  PaginationParams,
  PaginatedResponse,
} from "@/types";

/**
 * 获取班级列表
 */
export function getClasses(
  params?: PaginationParams & { grade_id?: number; semester_id?: number }
): PaginatedResponse<ClassWithDetails> | ClassWithDetails[] {
  const db = getDb();

  // 如果没有分页参数，返回所有数据
  if (!params?.page && !params?.limit) {
    let query = `
      SELECT c.*,
             g.name as grade_name,
             u.real_name as class_teacher_name
      FROM classes c
      LEFT JOIN grades g ON c.grade_id = g.id AND c.semester_id = g.semester_id
      LEFT JOIN users u ON c.class_teacher_id = u.id
    `;
    const queryParams: (string | number)[] = [];

    if (params?.semester_id) {
      query += " WHERE c.semester_id = ?";
      queryParams.push(params.semester_id);
    }

    query += " ORDER BY g.sort_order ASC, c.name ASC";

    return db
      .prepare(query)
      .all(...queryParams) as ClassWithDetails[];
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE 1=1";
  const queryParams: (string | number)[] = [];

  if (params?.search) {
    whereClause += " AND c.name LIKE ?";
    queryParams.push(`%${params.search}%`);
  }

  if (params?.grade_id) {
    whereClause += " AND c.grade_id = ?";
    queryParams.push(params.grade_id);
  }

  if (params?.semester_id) {
    whereClause += " AND c.semester_id = ?";
    queryParams.push(params.semester_id);
  }

  // 获取总数
  const countResult = db
    .prepare(`SELECT COUNT(*) as total FROM classes c ${whereClause}`)
    .get(...queryParams) as { total: number };
  const total = countResult.total;

  // 获取数据
  const order = params?.order || "asc";
  const sort = params?.sort || "g.sort_order";
  const data = db
    .prepare(`
      SELECT c.*,
             g.name as grade_name,
             u.real_name as class_teacher_name
      FROM classes c
      LEFT JOIN grades g ON c.grade_id = g.id AND c.semester_id = g.semester_id
      LEFT JOIN users u ON c.class_teacher_id = u.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `)
    .all(...queryParams, limit, offset) as ClassWithDetails[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取班级详情
 */
export function getClassById(id: number): ClassWithDetails | null {
  const db = getDb();
  return db
    .prepare(`
      SELECT c.*,
             g.name as grade_name,
             u.real_name as class_teacher_name
      FROM classes c
      LEFT JOIN grades g ON c.grade_id = g.id
      LEFT JOIN users u ON c.class_teacher_id = u.id
      WHERE c.id = ?
    `)
    .get(id) as ClassWithDetails | null;
}

/**
 * 创建班级
 */
export function createClass(
  input: ClassInput
): { success: boolean; message?: string; classId?: number } {
  const db = getDb();

  // 验证学期和年级是否存在且匹配
  const grade = db.prepare("SELECT id FROM grades WHERE id = ? AND semester_id = ?").get(input.grade_id, input.semester_id);
  if (!grade) {
    return { success: false, message: "该学期下年级不存在" };
  }

  // 如果指定了班主任，验证用户是否存在
  if (input.class_teacher_id) {
    const teacher = db
      .prepare("SELECT id, role FROM users WHERE id = ? AND is_active = 1")
      .get(input.class_teacher_id);
    if (!teacher) {
      return { success: false, message: "班主任用户不存在或已被禁用" };
    }
    // 验证是否是教师角色
    const role = (teacher as { role: string }).role;
    if (role !== "teacher" && role !== "class_teacher") {
      return { success: false, message: "班主任必须是教师角色" };
    }
  }

  // 验证营养餐费用
  if (input.meal_fee <= 0) {
    return { success: false, message: "营养餐费用必须大于0" };
  }

  // 检查班级名称在同一学期的同一年级下是否唯一
  const existing = db
    .prepare("SELECT id FROM classes WHERE semester_id = ? AND grade_id = ? AND name = ?")
    .get(input.semester_id, input.grade_id, input.name);
  if (existing) {
    return { success: false, message: "该年级下已存在同名班级" };
  }

  // 插入班级
  const result = db
    .prepare(
      `INSERT INTO classes (semester_id, grade_id, name, class_teacher_id, meal_fee)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.semester_id, input.grade_id, input.name, input.class_teacher_id || null, input.meal_fee);

  return { success: true, classId: result.lastInsertRowid as number };
}

/**
 * 更新班级
 */
export function updateClass(
  id: number,
  input: Partial<ClassInput>
): { success: boolean; message?: string } {
  const db = getDb();

  // 检查班级是否存在
  const existing = getClassById(id);
  if (!existing) {
    return { success: false, message: "班级不存在" };
  }

  const semesterId = input.semester_id ?? existing.semester_id;
  const gradeId = input.grade_id ?? existing.grade_id;

  // 如果更新年级，验证年级是否存在且学期匹配
  if (input.grade_id !== undefined || input.semester_id !== undefined) {
    const grade = db.prepare("SELECT id FROM grades WHERE id = ? AND semester_id = ?").get(gradeId, semesterId);
    if (!grade) {
      return { success: false, message: "该学期下年级不存在" };
    }
  }

  // 如果更新班主任，验证用户是否存在
  if (input.class_teacher_id !== undefined) {
    if (input.class_teacher_id !== null) {
      const teacher = db
        .prepare("SELECT id, role FROM users WHERE id = ? AND is_active = 1")
        .get(input.class_teacher_id);
      if (!teacher) {
        return { success: false, message: "班主任用户不存在或已被禁用" };
      }
      // 验证是否是教师角色
      const role = (teacher as { role: string }).role;
      if (role !== "teacher" && role !== "class_teacher") {
        return { success: false, message: "班主任必须是教师角色" };
      }
    }
  }

  // 验证营养餐费用
  if (input.meal_fee !== undefined && input.meal_fee <= 0) {
    return { success: false, message: "营养餐费用必须大于0" };
  }

  // 检查班级名称在同一学期的同一年级下是否唯一
  const name = input.name ?? existing.name;
  if (input.name !== undefined || input.grade_id !== undefined || input.semester_id !== undefined) {
    const duplicate = db
      .prepare("SELECT id FROM classes WHERE semester_id = ? AND grade_id = ? AND name = ? AND id != ?")
      .get(semesterId, gradeId, name, id);
    if (duplicate) {
      return { success: false, message: "该年级下已存在同名班级" };
    }
  }

  // 构建更新语句
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.semester_id !== undefined) {
    updates.push("semester_id = ?");
    values.push(input.semester_id);
  }
  if (input.grade_id !== undefined) {
    updates.push("grade_id = ?");
    values.push(input.grade_id);
  }
  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.class_teacher_id !== undefined) {
    updates.push("class_teacher_id = ?");
    values.push(input.class_teacher_id);
  }
  if (input.meal_fee !== undefined) {
    updates.push("meal_fee = ?");
    values.push(input.meal_fee);
  }

  if (updates.length === 0) {
    return { success: true };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  db.prepare(`UPDATE classes SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return { success: true };
}

/**
 * 删除班级
 */
export function deleteClass(id: number): { success: boolean; message?: string } {
  const db = getDb();

  // 检查班级是否存在
  const existing = getClassById(id);
  if (!existing) {
    return { success: false, message: "班级不存在" };
  }

  // 检查是否有关联的学生
  const hasStudents = db
    .prepare("SELECT COUNT(*) as count FROM students WHERE class_id = ? AND is_active = 1")
    .get(id) as { count: number };

  if (hasStudents.count > 0) {
    return { success: false, message: "该班级下存在学生，无法删除" };
  }

  // 删除班级
  db.prepare("DELETE FROM classes WHERE id = ?").run(id);

  return { success: true };
}

/**
 * 更新班级学生数量
 */
export function updateClassStudentCount(classId: number): void {
  const db = getDb();

  const countResult = db
    .prepare("SELECT COUNT(*) as count FROM students WHERE class_id = ? AND is_active = 1")
    .get(classId) as { count: number };

  db.prepare("UPDATE classes SET student_count = ? WHERE id = ?").run(
    countResult.count,
    classId
  );
}

/**
 * 获取班级的学生数量
 */
export function getClassStudentCount(classId: number): number {
  const db = getDb();
  const result = db
    .prepare("SELECT COUNT(*) as count FROM students WHERE class_id = ? AND is_active = 1")
    .get(classId) as { count: number };
  return result.count;
}
