import { getDb } from "@/lib/db";
import type { Student, StudentInput, PaginationParams, PaginatedResponse, StudentWithDetails } from "@/types";

/**
 * 学生服务层
 */

/**
 * 获取学生列表（分页）
 */
export function getStudents(
  params: PaginationParams & { class_id?: number; grade_id?: number; is_active?: number }
): PaginatedResponse<StudentWithDetails> {
  const db = getDb();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE 1=1";
  const queryParams: (string | number)[] = [];

  if (params.search) {
    whereClause += " AND (s.student_no LIKE ? OR s.name LIKE ? OR s.parent_phone LIKE ?)";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (params.class_id) {
    whereClause += " AND s.class_id = ?";
    queryParams.push(params.class_id);
  }

  if (params.grade_id) {
    whereClause += " AND c.grade_id = ?";
    queryParams.push(params.grade_id);
  }

  if (params.is_active !== undefined) {
    whereClause += " AND s.is_active = ?";
    queryParams.push(params.is_active);
  }

  // 排序
  const orderBy = params.sort || "s.created_at";
  const order = params.order || "desc";
  const orderClause = `ORDER BY ${orderBy} ${order}`;

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as count
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    ${whereClause}
  `;
  const countResult = db.prepare(countQuery).get(...queryParams) as { count: number };
  const total = countResult.count;

  // 获取数据
  const dataQuery = `
    SELECT
      s.*,
      c.name as class_name,
      g.name as grade_name,
      CASE WHEN s.is_nutrition_meal = 1 THEN '是' ELSE '否' END as nutrition_meal_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;
  const data = db.prepare(dataQuery).all(...queryParams, limit, offset) as StudentWithDetails[];

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
export function getStudentById(id: number): StudentWithDetails | null {
  const db = getDb();
  const student = db
    .prepare(`
      SELECT
        s.*,
        c.name as class_name,
        g.name as grade_name,
        g.id as grade_id,
        ct.real_name as class_teacher_name,
        ct.phone as class_teacher_phone,
        CASE WHEN s.is_nutrition_meal = 1 THEN '是' ELSE '否' END as nutrition_meal_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN grades g ON c.grade_id = g.id
      LEFT JOIN users ct ON c.class_teacher_id = ct.id
      WHERE s.id = ?
    `)
    .get(id) as StudentWithDetails | undefined;

  return student || null;
}

/**
 * 根据学号获取学生
 */
export function getStudentByNo(studentNo: string): Student | null {
  const db = getDb();
  const student = db
    .prepare("SELECT * FROM students WHERE student_no = ?")
    .get(studentNo) as Student | undefined;

  return student || null;
}

/**
 * 创建学生
 */
export function createStudent(input: StudentInput): {
  success: boolean;
  message?: string;
  studentId?: number;
} {
  const db = getDb();

  // 检查学号是否已存在
  const existingStudent = db
    .prepare("SELECT id FROM students WHERE student_no = ?")
    .get(input.student_no);
  if (existingStudent) {
    return { success: false, message: "学号已存在" };
  }

  // 检查班级是否存在
  const classExists = db.prepare("SELECT id FROM classes WHERE id = ?").get(input.class_id);
  if (!classExists) {
    return { success: false, message: "班级不存在" };
  }

  // 插入学生
  const result = db
    .prepare(
      `INSERT INTO students (
        student_no, name, gender, class_id, birth_date,
        parent_name, parent_phone, address, is_nutrition_meal,
        enrollment_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.student_no,
      input.name,
      input.gender || null,
      input.class_id,
      input.birth_date || null,
      input.parent_name || null,
      input.parent_phone || null,
      input.address || null,
      input.is_nutrition_meal || 0,
      input.enrollment_date || null,
      1
    );

  // 更新班级学生数量
  db.prepare(
    `UPDATE classes SET student_count = (
      SELECT COUNT(*) FROM students WHERE class_id = ? AND is_active = 1
    ) WHERE id = ?`
  ).run(input.class_id, input.class_id);

  return { success: true, studentId: result.lastInsertRowid as number };
}

/**
 * 更新学生
 */
export function updateStudent(
  id: number,
  input: Partial<StudentInput> & { is_active?: number }
): { success: boolean; message?: string } {
  const db = getDb();

  // 检查学生是否存在
  const existingStudent = db.prepare("SELECT id, class_id FROM students WHERE id = ?").get(id) as
    | { id: number; class_id: number }
    | undefined;
  if (!existingStudent) {
    return { success: false, message: "学生不存在" };
  }

  // 如果修改学号，检查是否与其他学生冲突
  if (input.student_no) {
    const duplicateCheck = db
      .prepare("SELECT id FROM students WHERE student_no = ? AND id != ?")
      .get(input.student_no, id);
    if (duplicateCheck) {
      return { success: false, message: "学号已存在" };
    }
  }

  // 构建更新语句
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (input.student_no !== undefined) {
    updates.push("student_no = ?");
    params.push(input.student_no);
  }
  if (input.name !== undefined) {
    updates.push("name = ?");
    params.push(input.name);
  }
  if (input.gender !== undefined) {
    updates.push("gender = ?");
    params.push(input.gender);
  }
  if (input.class_id !== undefined) {
    updates.push("class_id = ?");
    params.push(input.class_id);
  }
  if (input.birth_date !== undefined) {
    updates.push("birth_date = ?");
    params.push(input.birth_date);
  }
  if (input.parent_name !== undefined) {
    updates.push("parent_name = ?");
    params.push(input.parent_name);
  }
  if (input.parent_phone !== undefined) {
    updates.push("parent_phone = ?");
    params.push(input.parent_phone);
  }
  if (input.address !== undefined) {
    updates.push("address = ?");
    params.push(input.address);
  }
  if (input.is_nutrition_meal !== undefined) {
    updates.push("is_nutrition_meal = ?");
    params.push(input.is_nutrition_meal);
  }
  if (input.enrollment_date !== undefined) {
    updates.push("enrollment_date = ?");
    params.push(input.enrollment_date);
  }
  if (input.is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(input.is_active);
  }

  if (updates.length === 0) {
    return { success: false, message: "没有要更新的字段" };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  db.prepare(`UPDATE students SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  // 更新相关班级的学生数量
  const classId = input.class_id ?? existingStudent.class_id;
  db.prepare(
    `UPDATE classes SET student_count = (
      SELECT COUNT(*) FROM students WHERE class_id = ? AND is_active = 1
    ) WHERE id = ?`
  ).run(classId, classId);

  // 如果班级发生变化，更新原班级的学生数量
  if (input.class_id && input.class_id !== existingStudent.class_id) {
    db.prepare(
      `UPDATE classes SET student_count = (
        SELECT COUNT(*) FROM students WHERE class_id = ? AND is_active = 1
      ) WHERE id = ?`
    ).run(existingStudent.class_id, existingStudent.class_id);
  }

  return { success: true };
}

/**
 * 删除学生
 */
export function deleteStudent(id: number): { success: boolean; message?: string } {
  const db = getDb();

  // 检查学生是否存在
  const existingStudent = db
    .prepare("SELECT id, class_id FROM students WHERE id = ?")
    .get(id) as { id: number; class_id: number } | undefined;
  if (!existingStudent) {
    return { success: false, message: "学生不存在" };
  }

  // 检查是否有请假记录
  const leaveCheck = db
    .prepare("SELECT id FROM leave_records WHERE student_id = ?")
    .get(id);
  if (leaveCheck) {
    return { success: false, message: "该学生有请假记录，无法删除" };
  }

  // 删除学生
  db.prepare("DELETE FROM students WHERE id = ?").run(id);

  // 更新班级学生数量
  db.prepare(
    `UPDATE classes SET student_count = (
      SELECT COUNT(*) FROM students WHERE class_id = ? AND is_active = 1
    ) WHERE id = ?`
  ).run(existingStudent.class_id, existingStudent.class_id);

  return { success: true };
}

/**
 * 获取班级学生列表
 */
export function getStudentsByClass(classId: number): Student[] {
  const db = getDb();
  const students = db
    .prepare(
      `SELECT * FROM students WHERE class_id = ? AND is_active = 1 ORDER BY student_no`
    )
    .all(classId) as Student[];

  return students;
}

/**
 * 切换学生状态（启用/禁用）
 */
export function toggleStudentStatus(id: number): { success: boolean; message?: string; isActive?: number } {
  const db = getDb();

  // 检查学生是否存在
  const student = db
    .prepare("SELECT id, is_active, class_id FROM students WHERE id = ?")
    .get(id) as { id: number; is_active: number; class_id: number } | undefined;

  if (!student) {
    return { success: false, message: "学生不存在" };
  }

  const newStatus = student.is_active ? 0 : 1;
  db.prepare("UPDATE students SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    newStatus,
    id
  );

  // 更新班级学生数量
  db.prepare(
    `UPDATE classes SET student_count = (
      SELECT COUNT(*) FROM students WHERE class_id = ? AND is_active = 1
    ) WHERE id = ?`
  ).run(student.class_id, student.class_id);

  return { success: true, isActive: newStatus };
}

/**
 * 批量创建学生
 */
export function batchCreateStudents(
  students: StudentInput[]
): { success: boolean; message?: string; createdCount?: number; errors?: string[] } {
  const db = getDb();
  const errors: string[] = [];
  let createdCount = 0;

  // 使用事务确保数据一致性
  const transaction = db.transaction(() => {
    for (let i = 0; i < students.length; i++) {
      const student = students[i];

      // 检查学号是否已存在
      const existingStudent = db
        .prepare("SELECT id FROM students WHERE student_no = ?")
        .get(student.student_no);
      if (existingStudent) {
        errors.push(`第${i + 1}行：学号 ${student.student_no} 已存在`);
        continue;
      }

      // 检查班级是否存在
      const classExists = db.prepare("SELECT id FROM classes WHERE id = ?").get(student.class_id);
      if (!classExists) {
        errors.push(`第${i + 1}行：班级不存在`);
        continue;
      }

      // 插入学生
      try {
        db.prepare(
          `INSERT INTO students (
            student_no, name, gender, class_id, birth_date,
            parent_name, parent_phone, address, is_nutrition_meal,
            enrollment_date, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          student.student_no,
          student.name,
          student.gender || null,
          student.class_id,
          student.birth_date || null,
          student.parent_name || null,
          student.parent_phone || null,
          student.address || null,
          student.is_nutrition_meal || 0,
          student.enrollment_date || null,
          1
        );
        createdCount++;
      } catch (error) {
        errors.push(`第${i + 1}行：${error instanceof Error ? error.message : "插入失败"}`);
      }
    }

    // 更新所有相关班级的学生数量
    const classIds = [...new Set(students.map((s) => s.class_id))];
    for (const classId of classIds) {
      db.prepare(
        `UPDATE classes SET student_count = (
          SELECT COUNT(*) FROM students WHERE class_id = ? AND is_active = 1
        ) WHERE id = ?`
      ).run(classId, classId);
    }
  });

  try {
    transaction();
    return {
      success: true,
      createdCount,
      message: `成功创建 ${createdCount} 个学生`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "批量创建失败",
    };
  }
}

/**
 * 获取学生统计信息
 */
export function getStudentStats(): {
  total: number;
  active: number;
  inactive: number;
  nutritionMeal: number;
} {
  const db = getDb();

  const total = (db.prepare("SELECT COUNT(*) as count FROM students").get() as { count: number }).count;
  const active = (db.prepare("SELECT COUNT(*) as count FROM students WHERE is_active = 1").get() as { count: number })
    .count;
  const inactive = total - active;
  const nutritionMeal = (db.prepare("SELECT COUNT(*) as count FROM students WHERE is_nutrition_meal = 1 AND is_active = 1").get() as { count: number }).count;

  return {
    total,
    active,
    inactive,
    nutritionMeal,
  };
}
