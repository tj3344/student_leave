import { getDb } from "@/lib/db";
import type {
  FeeConfigInput,
  FeeConfigWithDetails,
  PaginationParams,
  PaginatedResponse,
  StudentRefundRecord,
  ClassRefundSummaryFull,
} from "@/types";

/**
 * 获取费用配置列表
 */
export function getFeeConfigs(
  params?: PaginationParams & { semester_id?: number; class_id?: number }
): PaginatedResponse<FeeConfigWithDetails> | FeeConfigWithDetails[] {
  const db = getDb();

  // 如果没有分页参数，返回所有数据
  if (!params?.page && !params?.limit) {
    let query = `
      SELECT fc.*,
             c.name as class_name,
             g.name as grade_name,
             s.name as semester_name,
             u.real_name as class_teacher_name
      FROM fee_configs fc
      LEFT JOIN classes c ON fc.class_id = c.id
      LEFT JOIN grades g ON c.grade_id = g.id
      LEFT JOIN semesters s ON fc.semester_id = s.id
      LEFT JOIN users u ON c.class_teacher_id = u.id
    `;
    const queryParams: (string | number)[] = [];
    const whereConditions: string[] = [];

    if (params?.semester_id) {
      whereConditions.push("fc.semester_id = ?");
      queryParams.push(params.semester_id);
    }

    if (params?.class_id) {
      whereConditions.push("fc.class_id = ?");
      queryParams.push(params.class_id);
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " ORDER BY s.start_date DESC, g.sort_order ASC, c.name ASC";

    return db.prepare(query).all(...queryParams) as FeeConfigWithDetails[];
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE 1=1";
  const queryParams: (string | number)[] = [];

  if (params?.semester_id) {
    whereClause += " AND fc.semester_id = ?";
    queryParams.push(params.semester_id);
  }

  if (params?.class_id) {
    whereClause += " AND fc.class_id = ?";
    queryParams.push(params.class_id);
  }

  // 获取总数
  const countResult = db
    .prepare(`SELECT COUNT(*) as total FROM fee_configs fc ${whereClause}`)
    .get(...queryParams) as { total: number };
  const total = countResult.total;

  // 获取数据
  const data = db
    .prepare(`
      SELECT fc.*,
             c.name as class_name,
             g.name as grade_name,
             s.name as semester_name,
             u.real_name as class_teacher_name
      FROM fee_configs fc
      LEFT JOIN classes c ON fc.class_id = c.id
      LEFT JOIN grades g ON c.grade_id = g.id
      LEFT JOIN semesters s ON fc.semester_id = s.id
      LEFT JOIN users u ON c.class_teacher_id = u.id
      ${whereClause}
      ORDER BY s.start_date DESC, g.sort_order ASC, c.name ASC
      LIMIT ? OFFSET ?
    `)
    .all(...queryParams, limit, offset) as FeeConfigWithDetails[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取单个费用配置
 */
export function getFeeConfigById(id: number): FeeConfigWithDetails | null {
  const db = getDb();
  return db
    .prepare(`
      SELECT fc.*,
             c.name as class_name,
             g.name as grade_name,
             s.name as semester_name,
             u.real_name as class_teacher_name
      FROM fee_configs fc
      LEFT JOIN classes c ON fc.class_id = c.id
      LEFT JOIN grades g ON c.grade_id = g.id
      LEFT JOIN semesters s ON fc.semester_id = s.id
      LEFT JOIN users u ON c.class_teacher_id = u.id
      WHERE fc.id = ?
    `)
    .get(id) as FeeConfigWithDetails | null;
}

/**
 * 创建费用配置
 */
export function createFeeConfig(
  input: FeeConfigInput
): { success: boolean; message?: string; configId?: number } {
  const db = getDb();

  // 验证班级是否存在
  const classExists = db.prepare("SELECT id FROM classes WHERE id = ?").get(input.class_id);
  if (!classExists) {
    return { success: false, message: "班级不存在" };
  }

  // 验证学期是否存在
  const semesterExists = db.prepare("SELECT id FROM semesters WHERE id = ?").get(input.semester_id);
  if (!semesterExists) {
    return { success: false, message: "学期不存在" };
  }

  // 验证餐费标准
  if (input.meal_fee_standard <= 0) {
    return { success: false, message: "餐费标准必须大于0" };
  }

  // 验证天数
  if (input.prepaid_days < 0) {
    return { success: false, message: "预收天数不能为负数" };
  }
  if (input.actual_days < 0) {
    return { success: false, message: "实收天数不能为负数" };
  }
  if (input.suspension_days < 0) {
    return { success: false, message: "停课天数不能为负数" };
  }

  // 检查是否已存在该班级学期的费用配置
  const existing = db
    .prepare("SELECT id FROM fee_configs WHERE class_id = ? AND semester_id = ?")
    .get(input.class_id, input.semester_id);
  if (existing) {
    return { success: false, message: "该班级在此学期已存在费用配置" };
  }

  // 插入费用配置
  const result = db
    .prepare(
      `INSERT INTO fee_configs (class_id, semester_id, meal_fee_standard, prepaid_days, actual_days, suspension_days)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(input.class_id, input.semester_id, input.meal_fee_standard, input.prepaid_days, input.actual_days, input.suspension_days);

  return { success: true, configId: result.lastInsertRowid as number };
}

/**
 * 更新费用配置
 */
export function updateFeeConfig(
  id: number,
  input: Partial<FeeConfigInput>
): { success: boolean; message?: string } {
  const db = getDb();

  // 检查费用配置是否存在
  const existing = getFeeConfigById(id);
  if (!existing) {
    return { success: false, message: "费用配置不存在" };
  }

  const classId = input.class_id ?? existing.class_id;
  const semesterId = input.semester_id ?? existing.semester_id;

  // 验证班级是否存在
  if (input.class_id !== undefined) {
    const classExists = db.prepare("SELECT id FROM classes WHERE id = ?").get(input.class_id);
    if (!classExists) {
      return { success: false, message: "班级不存在" };
    }
  }

  // 验证学期是否存在
  if (input.semester_id !== undefined) {
    const semesterExists = db.prepare("SELECT id FROM semesters WHERE id = ?").get(input.semester_id);
    if (!semesterExists) {
      return { success: false, message: "学期不存在" };
    }
  }

  // 验证餐费标准
  if (input.meal_fee_standard !== undefined && input.meal_fee_standard <= 0) {
    return { success: false, message: "餐费标准必须大于0" };
  }

  // 验证天数
  if (input.prepaid_days !== undefined && input.prepaid_days < 0) {
    return { success: false, message: "预收天数不能为负数" };
  }
  if (input.actual_days !== undefined && input.actual_days < 0) {
    return { success: false, message: "实收天数不能为负数" };
  }
  if (input.suspension_days !== undefined && input.suspension_days < 0) {
    return { success: false, message: "停课天数不能为负数" };
  }

  // 检查是否已存在该班级学期的费用配置（排除当前记录）
  if (input.class_id !== undefined || input.semester_id !== undefined) {
    const duplicate = db
      .prepare("SELECT id FROM fee_configs WHERE class_id = ? AND semester_id = ? AND id != ?")
      .get(classId, semesterId, id);
    if (duplicate) {
      return { success: false, message: "该班级在此学期已存在费用配置" };
    }
  }

  // 构建更新语句
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (input.class_id !== undefined) {
    updates.push("class_id = ?");
    values.push(input.class_id);
  }
  if (input.semester_id !== undefined) {
    updates.push("semester_id = ?");
    values.push(input.semester_id);
  }
  if (input.meal_fee_standard !== undefined) {
    updates.push("meal_fee_standard = ?");
    values.push(input.meal_fee_standard);
  }
  if (input.prepaid_days !== undefined) {
    updates.push("prepaid_days = ?");
    values.push(input.prepaid_days);
  }
  if (input.actual_days !== undefined) {
    updates.push("actual_days = ?");
    values.push(input.actual_days);
  }
  if (input.suspension_days !== undefined) {
    updates.push("suspension_days = ?");
    values.push(input.suspension_days);
  }

  if (updates.length === 0) {
    return { success: true };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  db.prepare(`UPDATE fee_configs SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return { success: true };
}

/**
 * 删除费用配置
 */
export function deleteFeeConfig(id: number): { success: boolean; message?: string } {
  const db = getDb();

  // 检查费用配置是否存在
  const existing = getFeeConfigById(id);
  if (!existing) {
    return { success: false, message: "费用配置不存在" };
  }

  // 删除费用配置
  db.prepare("DELETE FROM fee_configs WHERE id = ?").run(id);

  return { success: true };
}

/**
 * 获取学生退费记录列表
 * 退费金额 = 餐费标准 × (预收天数 - 实收天数 + 停课天数 + 请假天数)
 * 营养餐学生不退费
 */
export function getStudentRefundRecords(
  params: PaginationParams & { semester_id?: number; class_id?: number }
): PaginatedResponse<StudentRefundRecord> {
  const db = getDb();

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE s.is_active = 1";
  const queryParams: (string | number)[] = [];

  // 根据 semester_id 筛选条件，动态构建 JOIN
  // 如果指定了学期，JOIN 该学期的费用配置
  // 如果没指定学期，JOIN 班级所在学期的费用配置
  const feeConfigJoin = params?.semester_id
    ? "LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = ?"
    : "LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = c.semester_id";

  if (params?.semester_id) {
    queryParams.push(params.semester_id);
  }

  if (params?.class_id) {
    whereClause += " AND s.class_id = ?";
    queryParams.push(params.class_id);
  }

  // 请假记录的 JOIN 条件也需要根据学期动态调整
  const leaveRecordJoin = params?.semester_id
    ? "LEFT JOIN leave_records lr ON s.id = lr.student_id AND lr.semester_id = ? AND lr.status = 'approved'"
    : "LEFT JOIN leave_records lr ON s.id = lr.student_id AND lr.semester_id = c.semester_id AND lr.status = 'approved'";

  if (params?.semester_id) {
    queryParams.push(params.semester_id);
  }

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as total
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    ${feeConfigJoin}
    ${leaveRecordJoin}
    ${whereClause}
  `;

  const total = (db.prepare(countQuery).get(...queryParams) as { total: number }).total;

  // 获取数据
  const dataQuery = `
    SELECT
      s.id as student_id,
      s.student_no,
      s.name as student_name,
      c.name as class_name,
      g.name as grade_name,
      s.is_nutrition_meal,
      COALESCE(SUM(lr.leave_days), 0) as leave_days,
      COALESCE(fc.prepaid_days, 0) as prepaid_days,
      COALESCE(fc.actual_days, 0) as actual_days,
      COALESCE(fc.suspension_days, 0) as suspension_days,
      COALESCE(fc.meal_fee_standard, 0) as meal_fee_standard,
      CASE
        WHEN s.is_nutrition_meal = 1 THEN 0
        ELSE COALESCE(fc.meal_fee_standard, 0) *
          (COALESCE(fc.prepaid_days, 0) - COALESCE(fc.actual_days, 0) +
           COALESCE(fc.suspension_days, 0) + COALESCE(SUM(lr.leave_days), 0))
      END as refund_amount
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    ${feeConfigJoin}
    ${leaveRecordJoin}
    ${whereClause}
    GROUP BY s.id, s.student_no, s.name, c.name, g.name, s.is_nutrition_meal,
             fc.prepaid_days, fc.actual_days, fc.suspension_days, fc.meal_fee_standard
    HAVING refund_amount > 0 OR COALESCE(SUM(lr.leave_days), 0) > 0
    ORDER BY g.sort_order ASC, c.name ASC, s.student_no ASC
    LIMIT ? OFFSET ?
  `;

  const data = db.prepare(dataQuery).all(...queryParams, limit, offset) as StudentRefundRecord[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取班级退费汇总
 */
export function getClassRefundSummary(
  params?: { semester_id?: number; class_id?: number }
): ClassRefundSummaryFull[] {
  const db = getDb();

  // 先获取每个学生的请假天数
  let studentLeaveQuery = `
    SELECT
      s.id as student_id,
      s.class_id,
      s.is_nutrition_meal,
      COALESCE(SUM(lr.leave_days), 0) as leave_days
    FROM students s
    LEFT JOIN leave_records lr ON s.id = lr.student_id AND lr.status = 'approved'
    WHERE s.is_active = 1
  `;

  const studentLeaveParams: (string | number)[] = [];
  const studentLeaveConditions: string[] = [];

  if (params?.semester_id) {
    studentLeaveConditions.push("lr.semester_id = ?");
    studentLeaveParams.push(params.semester_id);
  }

  if (studentLeaveConditions.length > 0) {
    studentLeaveQuery += " AND " + studentLeaveConditions.join(" AND ");
  }

  studentLeaveQuery += " GROUP BY s.id, s.class_id, s.is_nutrition_meal";

  // 主查询：获取班级退费汇总
  let query = `
    SELECT
      c.id as class_id,
      c.name as class_name,
      g.name as grade_name,
      u.real_name as class_teacher_name,
      COALESCE(fc.meal_fee_standard, 0) as meal_fee_standard,
      COALESCE(fc.prepaid_days, 0) as prepaid_days,
      COALESCE(fc.actual_days, 0) as actual_days,
      COALESCE(fc.suspension_days, 0) as suspension_days,
      COALESCE(SUM(sl.leave_days), 0) as total_leave_days,
      COUNT(DISTINCT sl.student_id) as student_count,
      SUM(CASE
        WHEN sl.is_nutrition_meal = 0 THEN
          COALESCE(fc.meal_fee_standard, 0) *
          (COALESCE(fc.prepaid_days, 0) - COALESCE(fc.actual_days, 0) +
           COALESCE(fc.suspension_days, 0) + COALESCE(sl.leave_days, 0))
        ELSE 0
      END) as total_refund_amount,
      COUNT(CASE WHEN sl.is_nutrition_meal = 0 THEN 1 END) as refund_students_count
    FROM classes c
    LEFT JOIN grades g ON c.grade_id = g.id
    LEFT JOIN users u ON c.class_teacher_id = u.id
    LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = c.semester_id
    LEFT JOIN (${studentLeaveQuery}) sl ON c.id = sl.class_id
  `;

  const queryParams: (string | number)[] = [];
  const whereConditions: string[] = [];

  if (params?.semester_id) {
    whereConditions.push("c.semester_id = ?");
    queryParams.push(params.semester_id);
  }

  if (params?.class_id) {
    whereConditions.push("c.id = ?");
    queryParams.push(params.class_id);
  }

  if (whereConditions.length > 0) {
    query += " WHERE " + whereConditions.join(" AND ");
  }

  query += `
    GROUP BY c.id, c.name, g.name, u.real_name,
             fc.prepaid_days, fc.actual_days, fc.suspension_days, fc.meal_fee_standard
    ORDER BY g.sort_order ASC, c.name ASC
  `;

  // 传递子查询参数
  return db.prepare(query).all(...studentLeaveParams, ...queryParams) as ClassRefundSummaryFull[];
}
