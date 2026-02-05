import { getRawPostgres } from "@/lib/db";
import { validateOrderBy, SORT_FIELDS, DEFAULT_SORT_FIELDS } from "@/lib/utils/sql-security";
import type { Student, StudentInput, PaginationParams, PaginatedResponse, StudentWithDetails } from "@/types";

/**
 * 学生服务层
 */

/**
 * 获取学生列表（分页）
 */
export async function getStudents(
  params: PaginationParams & { class_id?: number; grade_id?: number; is_active?: number; semester_id?: number }
): Promise<PaginatedResponse<StudentWithDetails>> {
  const pgClient = getRawPostgres();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE 1=1";
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (params.search) {
    whereClause += " AND (s.student_no ILIKE $" + (paramIndex++) + " OR s.name ILIKE $" + (paramIndex++) + " OR s.parent_phone ILIKE $" + (paramIndex++) + ")";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (params.class_id) {
    whereClause += " AND s.class_id = $" + (paramIndex++);
    queryParams.push(params.class_id);
  }

  if (params.grade_id) {
    whereClause += " AND c.grade_id = $" + (paramIndex++);
    queryParams.push(params.grade_id);
  }

  if (params.is_active !== undefined) {
    whereClause += " AND s.is_active = $" + (paramIndex++);
    queryParams.push(params.is_active === 1);
  }

  if (params.semester_id) {
    whereClause += " AND c.semester_id = $" + (paramIndex++);
    queryParams.push(params.semester_id);
  }

  // 排序（使用白名单验证防止 SQL 注入）
  const { orderBy, order } = validateOrderBy(
    params.sort,
    params.order,
    { allowedFields: SORT_FIELDS.students, defaultField: DEFAULT_SORT_FIELDS.students }
  );
  const orderClause = `ORDER BY ${orderBy} ${order}`;

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as count
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    ${whereClause}
  `;
  const countResult = await pgClient.unsafe(countQuery, queryParams) as { count: number }[];
  const total = countResult[0]?.count || 0;

  // 获取数据
  const dataQuery = `
    SELECT
      s.*,
      c.name as class_name,
      g.name as grade_name,
      CASE WHEN s.is_nutrition_meal = true THEN '是' ELSE '否' END as nutrition_meal_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(limit, offset);
  const data = await pgClient.unsafe(dataQuery, queryParams) as StudentWithDetails[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 根据ID获取学生
 */
export async function getStudentById(id: number): Promise<StudentWithDetails | null> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(`
      SELECT
        s.*,
        c.name as class_name,
        g.name as grade_name,
        g.id as grade_id,
        ct.real_name as class_teacher_name,
        ct.phone as class_teacher_phone,
        CASE WHEN s.is_nutrition_meal = true THEN '是' ELSE '否' END as nutrition_meal_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN grades g ON c.grade_id = g.id
      LEFT JOIN users ct ON c.class_teacher_id = ct.id
      WHERE s.id = $1
    `, [id]) as StudentWithDetails[];

  return result[0] || null;
}

/**
 * 根据学号获取学生
 */
export async function getStudentByNo(studentNo: string): Promise<Student | null> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe("SELECT * FROM students WHERE student_no = $1", [studentNo]) as Student[];
  return result[0] || null;
}

/**
 * 创建学生
 */
export async function createStudent(input: StudentInput): Promise<{
  success: boolean;
  message?: string;
  studentId?: number;
}> {
  const pgClient = getRawPostgres();

  // 检查学号是否已存在
  const existingStudent = await pgClient.unsafe("SELECT id FROM students WHERE student_no = $1", [input.student_no]);
  if (existingStudent.length > 0) {
    return { success: false, message: "学号已存在" };
  }

  // 检查班级是否存在
  const classExists = await pgClient.unsafe("SELECT id FROM classes WHERE id = $1", [input.class_id]);
  if (classExists.length === 0) {
    return { success: false, message: "班级不存在" };
  }

  // 插入学生
  const result = await pgClient.unsafe(
    `INSERT INTO students (
      student_no, name, gender, class_id, birth_date,
      parent_name, parent_phone, address, is_nutrition_meal,
      enrollment_date, is_active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id`,
    [
      input.student_no,
      input.name,
      input.gender || null,
      input.class_id,
      input.birth_date || null,
      input.parent_name || null,
      input.parent_phone || null,
      input.address || null,
      input.is_nutrition_meal || false,
      input.enrollment_date || null,
      true
    ]
  );

  // 学生数量通过数据库触发器自动维护，无需手动更新

  return { success: true, studentId: result[0]?.id };
}

/**
 * 更新学生
 */
export async function updateStudent(
  id: number,
  input: Partial<StudentInput> & { is_active?: number }
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查学生是否存在
  const existingStudentResult = await pgClient.unsafe("SELECT id, class_id FROM students WHERE id = $1", [id]) as
    { id: number; class_id: number }[];
  if (existingStudentResult.length === 0) {
    return { success: false, message: "学生不存在" };
  }

  // 如果修改学号，检查是否与其他学生冲突
  if (input.student_no) {
    const duplicateCheck = await pgClient.unsafe("SELECT id FROM students WHERE student_no = $1 AND id != $2", [input.student_no, id]);
    if (duplicateCheck.length > 0) {
      return { success: false, message: "学号已存在" };
    }
  }

  // 构建更新语句
  const updates: string[] = [];
  const params: (string | number | boolean)[] = [];
  let paramIndex = 1;

  if (input.student_no !== undefined) {
    updates.push(`student_no = $${paramIndex++}`);
    params.push(input.student_no);
  }
  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(input.name);
  }
  if (input.gender !== undefined) {
    updates.push(`gender = $${paramIndex++}`);
    params.push(input.gender);
  }
  if (input.class_id !== undefined) {
    updates.push(`class_id = $${paramIndex++}`);
    params.push(input.class_id);
  }
  if (input.birth_date !== undefined) {
    updates.push(`birth_date = $${paramIndex++}`);
    params.push(input.birth_date);
  }
  if (input.parent_name !== undefined) {
    updates.push(`parent_name = $${paramIndex++}`);
    params.push(input.parent_name);
  }
  if (input.parent_phone !== undefined) {
    updates.push(`parent_phone = $${paramIndex++}`);
    params.push(input.parent_phone);
  }
  if (input.address !== undefined) {
    updates.push(`address = $${paramIndex++}`);
    params.push(input.address);
  }
  if (input.is_nutrition_meal !== undefined) {
    updates.push(`is_nutrition_meal = $${paramIndex++}`);
    params.push(input.is_nutrition_meal);
  }
  if (input.enrollment_date !== undefined) {
    updates.push(`enrollment_date = $${paramIndex++}`);
    params.push(input.enrollment_date);
  }
  if (input.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(input.is_active === 1);
  }

  if (updates.length === 0) {
    return { success: false, message: "没有要更新的字段" };
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  await pgClient.unsafe(`UPDATE students SET ${updates.join(", ")} WHERE id = $${paramIndex}`, params);

  // 学生数量通过数据库触发器自动维护，无需手动更新

  return { success: true };
}

/**
 * 删除学生
 */
export async function deleteStudent(id: number): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查学生是否存在
  const existingStudentResult = await pgClient.unsafe("SELECT id, class_id FROM students WHERE id = $1", [id]) as
    { id: number; class_id: number }[];
  if (existingStudentResult.length === 0) {
    return { success: false, message: "学生不存在" };
  }

  // 检查是否有请假记录
  const leaveCheck = await pgClient.unsafe("SELECT id FROM leave_records WHERE student_id = $1", [id]);
  if (leaveCheck.length > 0) {
    return { success: false, message: "该学生有请假记录，无法删除" };
  }

  // 删除学生
  await pgClient.unsafe("DELETE FROM students WHERE id = $1", [id]);

  // 学生数量通过数据库触发器自动维护，无需手动更新

  return { success: true };
}

/**
 * 获取班级学生列表
 */
export async function getStudentsByClass(classId: number): Promise<Student[]> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(
    `SELECT * FROM students WHERE class_id = $1 AND is_active = true ORDER BY student_no`,
    [classId]
  ) as Student[];

  return result;
}

/**
 * 切换学生状态（启用/禁用）
 */
export async function toggleStudentStatus(id: number): Promise<{ success: boolean; message?: string; isActive?: number }> {
  const pgClient = getRawPostgres();

  // 检查学生是否存在
  const studentResult = await pgClient.unsafe("SELECT id, is_active, class_id FROM students WHERE id = $1", [id]) as
    { id: number; is_active: boolean; class_id: number }[];

  if (studentResult.length === 0) {
    return { success: false, message: "学生不存在" };
  }

  const newStatus = !studentResult[0].is_active;
  await pgClient.unsafe("UPDATE students SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
    newStatus,
    id
  ]);

  // 学生数量通过数据库触发器自动维护，无需手动更新

  return { success: true, isActive: newStatus ? 1 : 0 };
}

/**
 * 批量创建学生
 */
export async function batchCreateStudents(
  students: StudentInput[]
): Promise<{ success: boolean; message?: string; createdCount?: number; errors?: string[] }> {
  const pgClient = getRawPostgres();
  const errors: string[] = [];
  let createdCount = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];

    // 检查学号是否已存在
    const existingStudent = await pgClient.unsafe("SELECT id FROM students WHERE student_no = $1", [student.student_no]);
    if (existingStudent.length > 0) {
      errors.push(`第${i + 1}行：学号 ${student.student_no} 已存在`);
      continue;
    }

    // 检查班级是否存在
    const classExists = await pgClient.unsafe("SELECT id FROM classes WHERE id = $1", [student.class_id]);
    if (classExists.length === 0) {
      errors.push(`第${i + 1}行：班级不存在`);
      continue;
    }

    // 插入学生
    try {
      await pgClient.unsafe(
        `INSERT INTO students (
          student_no, name, gender, class_id, birth_date,
          parent_name, parent_phone, address, is_nutrition_meal,
          enrollment_date, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          student.student_no,
          student.name,
          student.gender || null,
          student.class_id,
          student.birth_date || null,
          student.parent_name || null,
          student.parent_phone || null,
          student.address || null,
          student.is_nutrition_meal || false,
          student.enrollment_date || null,
          true
        ]
      );
      createdCount++;
    } catch (error) {
      errors.push(`第${i + 1}行：${error instanceof Error ? error.message : "插入失败"}`);
    }
  }

  // 学生数量通过数据库触发器自动维护，无需手动更新

  return {
    success: true,
    createdCount,
    message: `成功创建 ${createdCount} 个学生`,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 获取学生统计信息
 */
export async function getStudentStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  nutritionMeal: number;
}> {
  const pgClient = getRawPostgres();

  const totalResult = await pgClient.unsafe("SELECT COUNT(*) as count FROM students") as { count: number }[];
  const total = totalResult[0]?.count || 0;

  const activeResult = await pgClient.unsafe("SELECT COUNT(*) as count FROM students WHERE is_active = true") as { count: number }[];
  const active = activeResult[0]?.count || 0;

  const inactive = total - active;

  const nutritionMealResult = await pgClient.unsafe("SELECT COUNT(*) as count FROM students WHERE is_nutrition_meal = true AND is_active = true") as { count: number }[];
  const nutritionMeal = nutritionMealResult[0]?.count || 0;

  return {
    total,
    active,
    inactive,
    nutritionMeal,
  };
}

/**
 * 根据学期名称、年级名称、班级名称获取班级ID
 */
export async function getClassIdByNames(
  semesterName: string,
  gradeName: string,
  className: string
): Promise<{ class_id?: number; error?: string }> {
  const pgClient = getRawPostgres();

  const result = await pgClient.unsafe(`
      SELECT c.id
      FROM classes c
      INNER JOIN grades g ON c.grade_id = g.id
      INNER JOIN semesters s ON g.semester_id = s.id
      WHERE s.name = $1 AND g.name = $2 AND c.name = $3
    `, [semesterName, gradeName, className]) as { id: number }[];

  if (result.length === 0) {
    return { error: `未找到班级：${semesterName}-${gradeName}-${className}` };
  }

  return { class_id: result[0]?.id };
}

/**
 * 批量创建/更新学生（优化版：减少数据库查询）
 */
export async function batchCreateOrUpdateStudents(
  inputs: StudentInput[]
): Promise<{
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; input: StudentInput; message: string }>;
}> {
  const errors: Array<{ row: number; input: StudentInput; message: string }> = [];
  let created = 0;
  let updated = 0;

  // 复用数据库连接
  const pgClient = getRawPostgres();

  try {
    // 批量验证班级是否存在（减少查询次数）
    const uniqueClassIds = [...new Set(inputs.map(i => i.class_id))];
    const classIdsStr = uniqueClassIds.join(',');
    const existingClasses = await pgClient.unsafe(
      `SELECT id FROM classes WHERE id = ANY($1::int[])`,
      [uniqueClassIds]
    ) as { id: number }[];
    const validClassIds = new Set(existingClasses.map(c => c.id));

    // 批量检查学号是否存在（减少查询次数）
    const uniqueStudentNos = [...new Set(inputs.map(i => i.student_no))];
    const existingStudentsMap = new Map<string, number>();

    if (uniqueStudentNos.length > 0) {
      const existingStudents = await pgClient.unsafe(
        `SELECT id, student_no FROM students WHERE student_no = ANY($1::text[])`,
        [uniqueStudentNos]
      ) as { id: number; student_no: string }[];

      for (const student of existingStudents) {
        existingStudentsMap.set(student.student_no, student.id);
      }
    }

    // 分离需要创建和更新的学生
    const toCreate: StudentInput[] = [];
    const toUpdate: Array<{ id: number; input: StudentInput; rowNum: number }> = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const rowNum = i + 1;

      // 检查班级是否存在
      if (!validClassIds.has(input.class_id)) {
        errors.push({ row: rowNum, input, message: "班级不存在" });
        continue;
      }

      // 检查学号是否已存在
      const existingId = existingStudentsMap.get(input.student_no);

      if (existingId) {
        toUpdate.push({ id: existingId, input, rowNum });
      } else {
        toCreate.push({ ...input, rowNum });
      }
    }

    // 批量创建学生
    if (toCreate.length > 0) {
      for (const { rowNum, ...input } of toCreate) {
        try {
          const result = await pgClient.unsafe(
            `INSERT INTO students (
              student_no, name, gender, class_id, birth_date,
              parent_name, parent_phone, address, is_nutrition_meal,
              enrollment_date, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              input.student_no,
              input.name,
              input.gender || null,
              input.class_id,
              input.birth_date || null,
              input.parent_name || null,
              input.parent_phone || null,
              input.address || null,
              input.is_nutrition_meal || false,
              input.enrollment_date || null,
              true
            ]
          );
          created++;
        } catch (err) {
          errors.push({ row: rowNum, input, message: err instanceof Error ? err.message : "创建失败" });
        }
      }
    }

    // 批量更新学生
    if (toUpdate.length > 0) {
      for (const { id, input, rowNum } of toUpdate) {
        try {
          // 构建更新语句
          const updates: string[] = [];
          const params: (string | number | boolean)[] = [];
          let paramIndex = 1;

          if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            params.push(input.name);
          }
          if (input.gender !== undefined) {
            updates.push(`gender = $${paramIndex++}`);
            params.push(input.gender);
          }
          if (input.class_id !== undefined) {
            updates.push(`class_id = $${paramIndex++}`);
            params.push(input.class_id);
          }
          if (input.birth_date !== undefined) {
            updates.push(`birth_date = $${paramIndex++}`);
            params.push(input.birth_date);
          }
          if (input.parent_name !== undefined) {
            updates.push(`parent_name = $${paramIndex++}`);
            params.push(input.parent_name);
          }
          if (input.parent_phone !== undefined) {
            updates.push(`parent_phone = $${paramIndex++}`);
            params.push(input.parent_phone);
          }
          if (input.address !== undefined) {
            updates.push(`address = $${paramIndex++}`);
            params.push(input.address);
          }
          if (input.is_nutrition_meal !== undefined) {
            updates.push(`is_nutrition_meal = $${paramIndex++}`);
            params.push(input.is_nutrition_meal);
          }
          if (input.enrollment_date !== undefined) {
            updates.push(`enrollment_date = $${paramIndex++}`);
            params.push(input.enrollment_date);
          }

          if (updates.length > 0) {
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            params.push(id);

            await pgClient.unsafe(
              `UPDATE students SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
              params
            );
            updated++;
          }
        } catch (err) {
          errors.push({ row: rowNum, input, message: err instanceof Error ? err.message : "更新失败" });
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
  } catch (err) {
    // 如果发生错误，回退到逐个处理的方式
    console.error('批量操作失败，回退到逐个处理:', err);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const rowNum = i + 1;

      try {
        // 检查班级是否存在
        const classExists = await pgClient.unsafe("SELECT id FROM classes WHERE id = $1", [input.class_id]);
        if (classExists.length === 0) {
          errors.push({ row: rowNum, input, message: "班级不存在" });
          continue;
        }

        // 检查学号是否已存在
        const existingStudent = await pgClient.unsafe("SELECT id FROM students WHERE student_no = $1", [input.student_no]);

        if (existingStudent.length > 0) {
          // 更新现有学生
          const updateResult = await updateStudent((existingStudent[0] as { id: number }).id, input);
          if (updateResult.success) {
            updated++;
          } else {
            errors.push({ row: rowNum, input, message: updateResult.message || "更新失败" });
          }
        } else {
          // 创建新学生
          const createResult = await createStudent(input);
          if (createResult.success) {
            created++;
          } else {
            errors.push({ row: rowNum, input, message: createResult.message || "创建失败" });
          }
        }
      } catch {
        errors.push({ row: rowNum, input, message: "处理失败" });
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
}
