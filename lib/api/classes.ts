import { getDb } from "@/lib/db";
import { validateOrderBy, SORT_FIELDS } from "@/lib/utils/sql-security";
import type {
  ClassInput,
  ClassWithDetails,
  PaginationParams,
  PaginatedResponse,
} from "@/types";

/**
 * 检查教师是否担任班主任
 */
function isTeacherAssignedAsClassTeacher(teacherId: number): boolean {
  const db = getDb();
  const assignedClass = db.prepare(
    "SELECT id FROM classes WHERE class_teacher_id = ?"
  ).get(teacherId);
  return !!assignedClass;
}

/**
 * 将教师角色更新为班主任
 */
function promoteTeacherToClassTeacher(teacherId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE users SET role = 'class_teacher', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(teacherId);
}

/**
 * 将班主任角色降级为教师（如果不担任任何班级的班主任）
 */
function demoteClassTeacherToTeacher(teacherId: number): void {
  const db = getDb();
  if (!isTeacherAssignedAsClassTeacher(teacherId)) {
    db.prepare(
      "UPDATE users SET role = 'teacher', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(teacherId);
  }
}

/**
 * 获取班级列表
 */
export function getClasses(
  params?: PaginationParams & { grade_id?: number; semester_id?: number; class_teacher_id?: number }
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
    const whereConditions: string[] = [];

    if (params?.semester_id) {
      whereConditions.push("c.semester_id = ?");
      queryParams.push(params.semester_id);
    }

    if (params?.class_teacher_id) {
      whereConditions.push("c.class_teacher_id = ?");
      queryParams.push(params.class_teacher_id);
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
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
    // 使用 COLLATE NOCASE 索引优化搜索
    whereClause += " AND c.name LIKE ? COLLATE NOCASE";
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

  if (params?.class_teacher_id) {
    whereClause += " AND c.class_teacher_id = ?";
    queryParams.push(params.class_teacher_id);
  }

  // 获取总数
  const countResult = db
    .prepare(`SELECT COUNT(*) as total FROM classes c ${whereClause}`)
    .get(...queryParams) as { total: number };
  const total = countResult.total;

  // 获取数据（使用白名单验证防止 SQL 注入）
  const { orderBy, order } = validateOrderBy(
    params?.sort,
    params?.order,
    { allowedFields: SORT_FIELDS.classes, defaultField: "c.created_at" }
  );
  const data = db
    .prepare(`
      SELECT c.*,
             g.name as grade_name,
             u.real_name as class_teacher_name
      FROM classes c
      LEFT JOIN grades g ON c.grade_id = g.id AND c.semester_id = g.semester_id
      LEFT JOIN users u ON c.class_teacher_id = u.id
      ${whereClause}
      ORDER BY ${orderBy} ${order}
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

    // 检查该教师是否已是其他班级的班主任（一对一约束）
    const existingClass = db.prepare(
      "SELECT id FROM classes WHERE class_teacher_id = ?"
    ).get(input.class_teacher_id) as { id: number } | undefined;

    if (existingClass) {
      return { success: false, message: "该教师已是其他班级的班主任" };
    }
  }

  // 检查班级名称在同一学期的同一年级下是否唯一
  const existing = db
    .prepare("SELECT id FROM classes WHERE semester_id = ? AND grade_id = ? AND name = ?")
    .get(input.semester_id, input.grade_id, input.name);
  if (existing) {
    return { success: false, message: "该年级下已存在同名班级" };
  }

  // 插入班级（meal_fee 默认为 0，实际餐费标准从 fee_configs 表获取）
  const result = db
    .prepare(
      `INSERT INTO classes (semester_id, grade_id, name, class_teacher_id, meal_fee)
       VALUES (?, ?, ?, ?, 0)`
    )
    .run(input.semester_id, input.grade_id, input.name, input.class_teacher_id || null);

  // 如果指定了班主任且角色是 teacher，更新为 class_teacher
  if (input.class_teacher_id) {
    const teacher = db.prepare("SELECT role FROM users WHERE id = ?")
      .get(input.class_teacher_id) as { role: string } | undefined;

    if (teacher && teacher.role === "teacher") {
      promoteTeacherToClassTeacher(input.class_teacher_id);
    }
  }

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

  // 如果更新班主任，验证用户是否存在且未被其他班级使用
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

      // 检查该教师是否已是其他班级的班主任（一对一约束）
      const existingClass = db.prepare(
        "SELECT id FROM classes WHERE class_teacher_id = ? AND id != ?"
      ).get(input.class_teacher_id, id) as { id: number } | undefined;

      if (existingClass) {
        return { success: false, message: "该教师已是其他班级的班主任" };
      }
    }
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

  // 保存旧的班主任ID，用于后续角色处理
  const oldClassTeacherId = existing.class_teacher_id;

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

  if (updates.length === 0) {
    return { success: true };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  db.prepare(`UPDATE classes SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  // 处理班主任变更时的角色更新
  if (input.class_teacher_id !== undefined) {
    const newTeacherId = input.class_teacher_id;

    // 新班主任：如果是 teacher 角色，更新为 class_teacher
    if (newTeacherId !== null) {
      const teacher = db.prepare("SELECT role FROM users WHERE id = ?")
        .get(newTeacherId) as { role: string } | undefined;

      if (teacher && teacher.role === "teacher") {
        promoteTeacherToClassTeacher(newTeacherId);
      }
    }

    // 旧班主任：如果更换了班主任，检查是否需要降级
    if (oldClassTeacherId && oldClassTeacherId !== newTeacherId) {
      demoteClassTeacherToTeacher(oldClassTeacherId);
    }
  }

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

  // 保存班级的班主任ID，用于后续角色处理
  const classTeacherId = existing.class_teacher_id;

  // 删除班级
  db.prepare("DELETE FROM classes WHERE id = ?").run(id);

  // 如果班级有班主任，检查是否需要将其角色降级
  if (classTeacherId) {
    demoteClassTeacherToTeacher(classTeacherId);
  }

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

/**
 * 批量创建或更新班级
 */
export function batchCreateOrUpdateClasses(
  inputs: ClassInput[]
): {
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; input: ClassInput; message: string }>;
} {
  const db = getDb();
  const errors: Array<{ row: number; input: ClassInput; message: string }> = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    try {
      // 检查班级是否存在（同一学期+年级+名称）
      const existing = db
        .prepare(
          "SELECT id FROM classes WHERE semester_id = ? AND grade_id = ? AND name = ?"
        )
        .get(input.semester_id, input.grade_id, input.name) as { id: number } | undefined;

      if (existing) {
        // 更新现有班级
        const updateResult = updateClass(existing.id, {
          class_teacher_id: input.class_teacher_id,
        });
        if (updateResult.success) {
          updated++;
        } else {
          errors.push({ row: i + 1, input, message: updateResult.message || '更新失败' });
        }
      } else {
        // 创建新班级
        const createResult = createClass(input);
        if (createResult.success) {
          created++;
        } else {
          errors.push({ row: i + 1, input, message: createResult.message || '创建失败' });
        }
      }
    } catch {
      errors.push({ row: i + 1, input, message: '处理失败' });
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

/**
 * 根据学期名称和年级名称获取对应的 ID
 */
export function getSemesterAndGradeIds(
  semesterName: string,
  gradeName: string
): { semester_id?: number; grade_id?: number; error?: string } {
  const db = getDb();

  // 获取学期 ID
  const semester = db
    .prepare("SELECT id FROM semesters WHERE name = ?")
    .get(semesterName) as { id: number } | undefined;

  if (!semester) {
    return { error: `学期"${semesterName}"不存在` };
  }

  // 获取年级 ID（必须在指定学期下）
  const grade = db
    .prepare("SELECT id FROM grades WHERE name = ? AND semester_id = ?")
    .get(gradeName, semester.id) as { id: number } | undefined;

  if (!grade) {
    return { error: `学期"${semesterName}"下不存在年级"${gradeName}"` };
  }

  return {
    semester_id: semester.id,
    grade_id: grade.id,
  };
}

/**
 * 根据班主任姓名获取用户 ID
 */
export function getClassTeacherId(
  teacherName: string
): { teacher_id?: number; error?: string } {
  const db = getDb();

  const teacher = db
    .prepare("SELECT id, role FROM users WHERE real_name = ? AND is_active = 1")
    .get(teacherName) as { id: number; role: string } | undefined;

  if (!teacher) {
    return { error: `班主任"${teacherName}"不存在或已被禁用` };
  }

  if (teacher.role !== 'teacher' && teacher.role !== 'class_teacher') {
    return { error: `用户"${teacherName}"不是教师角色` };
  }

  return { teacher_id: teacher.id };
}
