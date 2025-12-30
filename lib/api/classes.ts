import { getRawPostgres } from "@/lib/db";
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
async function isTeacherAssignedAsClassTeacher(teacherId: number): Promise<boolean> {
  const pgClient = getRawPostgres();
  const assignedClass = await pgClient.unsafe(
    "SELECT id FROM classes WHERE class_teacher_id = $1",
    [teacherId]
  );
  return assignedClass.length > 0;
}

/**
 * 将教师角色更新为班主任
 */
async function promoteTeacherToClassTeacher(teacherId: number): Promise<void> {
  const pgClient = getRawPostgres();
  await pgClient.unsafe(
    "UPDATE users SET role = 'class_teacher', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
    [teacherId]
  );
}

/**
 * 将班主任角色降级为教师（如果不担任任何班级的班主任）
 */
async function demoteClassTeacherToTeacher(teacherId: number): Promise<void> {
  const pgClient = getRawPostgres();
  const isAssigned = await isTeacherAssignedAsClassTeacher(teacherId);
  if (!isAssigned) {
    await pgClient.unsafe(
      "UPDATE users SET role = 'teacher', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [teacherId]
    );
  }
}

/**
 * 获取班级列表
 */
export async function getClasses(
  params?: PaginationParams & { grade_id?: number; semester_id?: number; class_teacher_id?: number }
): Promise<PaginatedResponse<ClassWithDetails> | ClassWithDetails[]> {
  const pgClient = getRawPostgres();

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
    let paramIndex = 1;

    if (params?.semester_id) {
      whereConditions.push(`c.semester_id = $${paramIndex++}`);
      queryParams.push(params.semester_id);
    }

    if (params?.grade_id) {
      whereConditions.push(`c.grade_id = $${paramIndex++}`);
      queryParams.push(params.grade_id);
    }

    if (params?.class_teacher_id) {
      whereConditions.push(`c.class_teacher_id = $${paramIndex++}`);
      queryParams.push(params.class_teacher_id);
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " ORDER BY g.sort_order ASC, c.name ASC";

    return await pgClient.unsafe(query, queryParams) as ClassWithDetails[];
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE 1=1";
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (params?.search) {
    // 使用 ILIKE 进行不区分大小写的搜索
    whereClause += " AND c.name ILIKE $" + (paramIndex++);
    queryParams.push(`%${params.search}%`);
  }

  if (params?.grade_id) {
    whereClause += " AND c.grade_id = $" + (paramIndex++);
    queryParams.push(params.grade_id);
  }

  if (params?.semester_id) {
    whereClause += " AND c.semester_id = $" + (paramIndex++);
    queryParams.push(params.semester_id);
  }

  if (params?.class_teacher_id) {
    whereClause += " AND c.class_teacher_id = $" + (paramIndex++);
    queryParams.push(params.class_teacher_id);
  }

  // 获取总数
  const countResult = await pgClient.unsafe(
    `SELECT COUNT(*) as total FROM classes c ${whereClause}`,
    queryParams
  ) as { total: number }[];
  const total = countResult[0]?.total || 0;

  // 获取数据（使用白名单验证防止 SQL 注入）
  const { orderBy, order } = validateOrderBy(
    params?.sort,
    params?.order,
    { allowedFields: SORT_FIELDS.classes, defaultField: "c.created_at" }
  );
  const data = await pgClient.unsafe(`
      SELECT c.*,
             g.name as grade_name,
             u.real_name as class_teacher_name
      FROM classes c
      LEFT JOIN grades g ON c.grade_id = g.id AND c.semester_id = g.semester_id
      LEFT JOIN users u ON c.class_teacher_id = u.id
      ${whereClause}
      ORDER BY ${orderBy} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...queryParams, limit, offset]) as ClassWithDetails[];

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
export async function getClassById(id: number): Promise<ClassWithDetails | null> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(`
      SELECT c.*,
             g.name as grade_name,
             u.real_name as class_teacher_name
      FROM classes c
      LEFT JOIN grades g ON c.grade_id = g.id
      LEFT JOIN users u ON c.class_teacher_id = u.id
      WHERE c.id = $1
    `, [id]) as ClassWithDetails[];
  return result[0] || null;
}

/**
 * 创建班级
 */
export async function createClass(
  input: ClassInput
): Promise<{ success: boolean; message?: string; classId?: number }> {
  const pgClient = getRawPostgres();

  // 验证学期和年级是否存在且匹配
  const grade = await pgClient.unsafe("SELECT id FROM grades WHERE id = $1 AND semester_id = $2", [input.grade_id, input.semester_id]);
  if (grade.length === 0) {
    return { success: false, message: "该学期下年级不存在" };
  }

  // 如果指定了班主任，验证用户是否存在
  if (input.class_teacher_id) {
    const teacher = await pgClient.unsafe("SELECT id, role FROM users WHERE id = $1 AND is_active = true", [input.class_teacher_id]);
    if (teacher.length === 0) {
      return { success: false, message: "班主任用户不存在或已被禁用" };
    }
    // 验证是否是教师角色
    const role = (teacher[0] as { role: string }).role;
    if (role !== "teacher" && role !== "class_teacher") {
      return { success: false, message: "班主任必须是教师角色" };
    }

    // 检查该教师是否已是其他班级的班主任（一对一约束）
    const existingClass = await pgClient.unsafe(
      "SELECT id FROM classes WHERE class_teacher_id = $1",
      [input.class_teacher_id]
    );

    if (existingClass.length > 0) {
      return { success: false, message: "该教师已是其他班级的班主任" };
    }
  }

  // 检查班级名称在同一学期的同一年级下是否唯一
  const existing = await pgClient.unsafe(
    "SELECT id FROM classes WHERE semester_id = $1 AND grade_id = $2 AND name = $3",
    [input.semester_id, input.grade_id, input.name]
  );
  if (existing.length > 0) {
    return { success: false, message: "该年级下已存在同名班级" };
  }

  // 插入班级（meal_fee 默认为 0，实际餐费标准从 fee_configs 表获取）
  const result = await pgClient.unsafe(
    `INSERT INTO classes (semester_id, grade_id, name, class_teacher_id, meal_fee)
     VALUES ($1, $2, $3, $4, 0)
     RETURNING id`,
    [input.semester_id, input.grade_id, input.name, input.class_teacher_id || null]
  );

  const classId = result[0]?.id;

  // 如果指定了班主任且角色是 teacher，更新为 class_teacher
  if (input.class_teacher_id && classId) {
    const teacher = await pgClient.unsafe("SELECT role FROM users WHERE id = $1", [input.class_teacher_id]) as { role: string }[];

    if (teacher.length > 0 && teacher[0].role === "teacher") {
      await promoteTeacherToClassTeacher(input.class_teacher_id);
    }
  }

  return { success: true, classId };
}

/**
 * 更新班级
 */
export async function updateClass(
  id: number,
  input: Partial<ClassInput>
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查班级是否存在
  const existing = await getClassById(id);
  if (!existing) {
    return { success: false, message: "班级不存在" };
  }

  const semesterId = input.semester_id ?? existing.semester_id;
  const gradeId = input.grade_id ?? existing.grade_id;

  // 如果更新年级，验证年级是否存在且学期匹配
  if (input.grade_id !== undefined || input.semester_id !== undefined) {
    const grade = await pgClient.unsafe("SELECT id FROM grades WHERE id = $1 AND semester_id = $2", [gradeId, semesterId]);
    if (grade.length === 0) {
      return { success: false, message: "该学期下年级不存在" };
    }
  }

  // 如果更新班主任，验证用户是否存在且未被其他班级使用
  if (input.class_teacher_id !== undefined) {
    if (input.class_teacher_id !== null) {
      const teacher = await pgClient.unsafe("SELECT id, role FROM users WHERE id = $1 AND is_active = true", [input.class_teacher_id]);
      if (teacher.length === 0) {
        return { success: false, message: "班主任用户不存在或已被禁用" };
      }
      // 验证是否是教师角色
      const role = (teacher[0] as { role: string }).role;
      if (role !== "teacher" && role !== "class_teacher") {
        return { success: false, message: "班主任必须是教师角色" };
      }

      // 检查该教师是否已是其他班级的班主任（一对一约束）
      const existingClass = await pgClient.unsafe(
        "SELECT id FROM classes WHERE class_teacher_id = $1 AND id != $2",
        [input.class_teacher_id, id]
      );

      if (existingClass.length > 0) {
        return { success: false, message: "该教师已是其他班级的班主任" };
      }
    }
  }

  // 检查班级名称在同一学期的同一年级下是否唯一
  const name = input.name ?? existing.name;
  if (input.name !== undefined || input.grade_id !== undefined || input.semester_id !== undefined) {
    const duplicate = await pgClient.unsafe(
      "SELECT id FROM classes WHERE semester_id = $1 AND grade_id = $2 AND name = $3 AND id != $4",
      [semesterId, gradeId, name, id]
    );
    if (duplicate.length > 0) {
      return { success: false, message: "该年级下已存在同名班级" };
    }
  }

  // 保存旧的班主任ID，用于后续角色处理
  const oldClassTeacherId = existing.class_teacher_id;

  // 构建更新语句
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (input.semester_id !== undefined) {
    updates.push(`semester_id = $${paramIndex++}`);
    values.push(input.semester_id);
  }
  if (input.grade_id !== undefined) {
    updates.push(`grade_id = $${paramIndex++}`);
    values.push(input.grade_id);
  }
  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.class_teacher_id !== undefined) {
    updates.push(`class_teacher_id = $${paramIndex++}`);
    values.push(input.class_teacher_id);
  }

  if (updates.length === 0) {
    return { success: true };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await pgClient.unsafe(`UPDATE classes SET ${updates.join(", ")} WHERE id = $${paramIndex}`, values);

  // 处理班主任变更时的角色更新
  if (input.class_teacher_id !== undefined) {
    const newTeacherId = input.class_teacher_id;

    // 新班主任：如果是 teacher 角色，更新为 class_teacher
    if (newTeacherId !== null) {
      const teacher = await pgClient.unsafe("SELECT role FROM users WHERE id = $1", [newTeacherId]) as { role: string }[];

      if (teacher.length > 0 && teacher[0].role === "teacher") {
        await promoteTeacherToClassTeacher(newTeacherId);
      }
    }

    // 旧班主任：如果更换了班主任，检查是否需要降级
    if (oldClassTeacherId && oldClassTeacherId !== newTeacherId) {
      await demoteClassTeacherToTeacher(oldClassTeacherId);
    }
  }

  return { success: true };
}

/**
 * 删除班级
 */
export async function deleteClass(id: number): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查班级是否存在
  const existing = await getClassById(id);
  if (!existing) {
    return { success: false, message: "班级不存在" };
  }

  // 检查是否有关联的学生
  const hasStudents = await pgClient.unsafe(
    "SELECT COUNT(*) as count FROM students WHERE class_id = $1 AND is_active = true",
    [id]
  ) as { count: number }[];

  if (hasStudents[0]?.count > 0) {
    return { success: false, message: "该班级下存在学生，无法删除" };
  }

  // 保存班级的班主任ID，用于后续角色处理
  const classTeacherId = existing.class_teacher_id;

  // 删除班级
  await pgClient.unsafe("DELETE FROM classes WHERE id = $1", [id]);

  // 如果班级有班主任，检查是否需要将其角色降级
  if (classTeacherId) {
    await demoteClassTeacherToTeacher(classTeacherId);
  }

  return { success: true };
}

/**
 * 更新班级学生数量
 */
export async function updateClassStudentCount(classId: number): Promise<void> {
  const pgClient = getRawPostgres();

  const countResult = await pgClient.unsafe(
    "SELECT COUNT(*) as count FROM students WHERE class_id = $1 AND is_active = true",
    [classId]
  ) as { count: number }[];

  await pgClient.unsafe("UPDATE classes SET student_count = $1 WHERE id = $2", [
    countResult[0]?.count || 0,
    classId
  ]);
}

/**
 * 获取班级的学生数量
 */
export async function getClassStudentCount(classId: number): Promise<number> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(
    "SELECT COUNT(*) as count FROM students WHERE class_id = $1 AND is_active = true",
    [classId]
  ) as { count: number }[];
  return result[0]?.count || 0;
}

/**
 * 批量创建或更新班级
 */
export async function batchCreateOrUpdateClasses(
  inputs: ClassInput[]
): Promise<{
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; input: ClassInput; message: string }>;
}> {
  const errors: Array<{ row: number; input: ClassInput; message: string }> = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    try {
      // 检查班级是否存在（同一学期+年级+名称）
      const existing = await getRawPostgres().unsafe(
        "SELECT id FROM classes WHERE semester_id = $1 AND grade_id = $2 AND name = $3",
        [input.semester_id, input.grade_id, input.name]
      ) as { id: number }[];

      if (existing.length > 0) {
        // 更新现有班级
        const updateResult = await updateClass(existing[0].id, {
          class_teacher_id: input.class_teacher_id,
        });
        if (updateResult.success) {
          updated++;
        } else {
          errors.push({ row: i + 1, input, message: updateResult.message || '更新失败' });
        }
      } else {
        // 创建新班级
        const createResult = await createClass(input);
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
export async function getSemesterAndGradeIds(
  semesterName: string,
  gradeName: string
): Promise<{ semester_id?: number; grade_id?: number; error?: string }> {
  const pgClient = getRawPostgres();

  // 获取学期 ID
  const semester = await pgClient.unsafe("SELECT id FROM semesters WHERE name = $1", [semesterName]) as { id: number }[];

  if (semester.length === 0) {
    return { error: `学期"${semesterName}"不存在` };
  }

  // 获取年级 ID（必须在指定学期下）
  const grade = await pgClient.unsafe("SELECT id FROM grades WHERE name = $1 AND semester_id = $2", [gradeName, semester[0].id]) as { id: number }[];

  if (grade.length === 0) {
    return { error: `学期"${semesterName}"下不存在年级"${gradeName}"` };
  }

  return {
    semester_id: semester[0].id,
    grade_id: grade[0].id,
  };
}

/**
 * 根据班主任姓名获取用户 ID
 */
export async function getClassTeacherId(
  teacherName: string
): Promise<{ teacher_id?: number; error?: string }> {
  const pgClient = getRawPostgres();

  const teacher = await pgClient.unsafe(
    "SELECT id, role FROM users WHERE real_name = $1 AND is_active = true",
    [teacherName]
  ) as { id: number; role: string }[];

  if (teacher.length === 0) {
    return { error: `班主任"${teacherName}"不存在或已被禁用` };
  }

  if (teacher[0].role !== 'teacher' && teacher[0].role !== 'class_teacher') {
    return { error: `用户"${teacherName}"不是教师角色` };
  }

  return { teacher_id: teacher[0].id };
}
