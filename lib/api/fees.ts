import { getRawPostgres } from "@/lib/db";
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
export async function getFeeConfigs(
  params?: PaginationParams & { semester_id?: number; class_id?: number }
): Promise<PaginatedResponse<FeeConfigWithDetails> | FeeConfigWithDetails[]> {
  const pgClient = getRawPostgres();

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
    let paramIndex = 1;

    if (params?.semester_id) {
      whereConditions.push(`fc.semester_id = $${paramIndex++}`);
      queryParams.push(params.semester_id);
    }

    if (params?.class_id) {
      whereConditions.push(`fc.class_id = $${paramIndex++}`);
      queryParams.push(params.class_id);
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " ORDER BY s.start_date DESC, g.sort_order ASC, c.name ASC";

    return await pgClient.unsafe(query, queryParams) as FeeConfigWithDetails[];
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE 1=1";
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (params?.semester_id) {
    whereClause += " AND fc.semester_id = $" + (paramIndex++);
    queryParams.push(params.semester_id);
  }

  if (params?.class_id) {
    whereClause += " AND fc.class_id = $" + (paramIndex++);
    queryParams.push(params.class_id);
  }

  // 获取总数
  const countResult = await pgClient.unsafe(`SELECT COUNT(*) as total FROM fee_configs fc ${whereClause}`, queryParams) as { total: number }[];
  const total = countResult[0]?.total || 0;

  // 获取数据
  const data = await pgClient.unsafe(`
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
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, [...queryParams, limit, offset]) as FeeConfigWithDetails[];

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
export async function getFeeConfigById(id: number): Promise<FeeConfigWithDetails | null> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(`
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
    WHERE fc.id = $1
  `, [id]) as FeeConfigWithDetails[];
  return result[0] || null;
}

/**
 * 创建费用配置
 */
export async function createFeeConfig(
  input: FeeConfigInput
): Promise<{ success: boolean; message?: string; configId?: number }> {
  const pgClient = getRawPostgres();

  // 验证班级是否存在
  const classExists = await pgClient.unsafe("SELECT id FROM classes WHERE id = $1", [input.class_id]);
  if (classExists.length === 0) {
    return { success: false, message: "班级不存在" };
  }

  // 验证学期是否存在
  const semesterExists = await pgClient.unsafe("SELECT id FROM semesters WHERE id = $1", [input.semester_id]);
  if (semesterExists.length === 0) {
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
  const existing = await pgClient.unsafe(
    "SELECT id FROM fee_configs WHERE class_id = $1 AND semester_id = $2",
    [input.class_id, input.semester_id]
  );
  if (existing.length > 0) {
    return { success: false, message: "该班级在此学期已存在费用配置" };
  }

  // 插入费用配置
  const result = await pgClient.unsafe(
    `INSERT INTO fee_configs (class_id, semester_id, meal_fee_standard, prepaid_days, actual_days, suspension_days, created_at, updated_at)
     IALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id`,
    [input.class_id, input.semester_id, input.meal_fee_standard, input.prepaid_days, input.actual_days, input.suspension_days]
  );

  return { success: true, configId: result[0]?.id };
}

/**
 * 更新费用配置
 */
export async function updateFeeConfig(
  id: number,
  input: Partial<FeeConfigInput>
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查费用配置是否存在
  const existing = await getFeeConfigById(id);
  if (!existing) {
    return { success: false, message: "费用配置不存在" };
  }

  const classId = input.class_id ?? existing.class_id;
  const semesterId = input.semester_id ?? existing.semester_id;

  // 验证班级是否存在
  if (input.class_id !== undefined) {
    const classExists = await pgClient.unsafe("SELECT id FROM classes WHERE id = $1", [input.class_id]);
    if (classExists.length === 0) {
      return { success: false, message: "班级不存在" };
    }
  }

  // 验证学期是否存在
  if (input.semester_id !== undefined) {
    const semesterExists = await pgClient.unsafe("SELECT id FROM semesters WHERE id = $1", [input.semester_id]);
    if (semesterExists.length === 0) {
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
    const duplicate = await pgClient.unsafe(
      "SELECT id FROM fee_configs WHERE class_id = $1 AND semester_id = $2 AND id != $3",
      [classId, semesterId, id]
    );
    if (duplicate.length > 0) {
      return { success: false, message: "该班级在此学期已存在费用配置" };
    }
  }

  // 构建更新语句
  const updates: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (input.class_id !== undefined) {
    updates.push(`class_id = $${paramIndex++}`);
    values.push(input.class_id);
  }
  if (input.semester_id !== undefined) {
    updates.push(`semester_id = $${paramIndex++}`);
    values.push(input.semester_id);
  }
  if (input.meal_fee_standard !== undefined) {
    updates.push(`meal_fee_standard = $${paramIndex++}`);
    values.push(input.meal_fee_standard);
  }
  if (input.prepaid_days !== undefined) {
    updates.push(`prepaid_days = $${paramIndex++}`);
    values.push(input.prepaid_days);
  }
  if (input.actual_days !== undefined) {
    updates.push(`actual_days = $${paramIndex++}`);
    values.push(input.actual_days);
  }
  if (input.suspension_days !== undefined) {
    updates.push(`suspension_days = $${paramIndex++}`);
    values.push(input.suspension_days);
  }

  if (updates.length === 0) {
    return { success: true };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await pgClient.unsafe(`UPDATE fee_configs SET ${updates.join(", ")} WHERE id = $${paramIndex}`, values);

  return { success: true };
}

/**
 * 删除费用配置
 */
export async function deleteFeeConfig(id: number): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查费用配置是否存在
  const existing = await getFeeConfigById(id);
  if (!existing) {
    return { success: false, message: "费用配置不存在" };
  }

  // 删除费用配置
  await pgClient.unsafe("DELETE FROM fee_configs WHERE id = $1", [id]);

  return { success: true };
}

/**
 * 获取学生退费记录列表
 * 退费金额 = 餐费标准 × (预收天数 - 实收天数 + 停课天数 + 请假天数)
 * 营养餐学生不退费
 */
export async function getStudentRefundRecords(
  params?: PaginationParams & { semester_id?: number; class_id?: number }
): Promise<PaginatedResponse<StudentRefundRecord> | StudentRefundRecord[]> {
  const pgClient = getRawPostgres();

  // 调试日志：记录传入的参数
  console.log("[getStudentRefundRecords] params:", params);

  // 如果没有分页参数，返回所有数据
  if (!params?.page && !params?.limit) {
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    // 根据 semester_id 筛选条件，动态构建 JOIN
    // 当指定学期时，严格按学期过滤；否则不限制学期以获取所有数据
    const feeConfigJoin = params?.semester_id
      ? "LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = $" + (paramIndex++)
      : "LEFT JOIN fee_configs fc ON c.id = fc.class_id";

    if (params?.semester_id) {
      queryParams.push(params.semester_id);
    }

    // 构建查询条件
    let whereClause = "WHERE s.is_active = true";

    if (params?.class_id) {
      whereClause += " AND s.class_id = $" + (paramIndex++);
      queryParams.push(params.class_id);
    }

    // 请假记录的 JOIN 条件也需要根据学期动态调整
    // 当指定学期时，严格按学期过滤；否则不限制学期以获取所有数据
    const leaveRecordJoin = params?.semester_id
      ? "LEFT JOIN leave_records lr ON s.id = lr.student_id AND lr.semester_id = $" + (paramIndex++) + " AND lr.status = 'approved'"
      : "LEFT JOIN leave_records lr ON s.id = lr.student_id AND lr.status = 'approved'";

    if (params?.semester_id) {
      queryParams.push(params.semester_id);
    }

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
        COALESCE(fc.meal_fee_standard, '0') as meal_fee_standard,
        CASE
          WHEN s.is_nutrition_meal = true THEN 0
          ELSE COALESCE(CAST(fc.meal_fee_standard AS NUMERIC), 0) *
            (COALESCE(fc.prepaid_days, 0) - COALESCE(fc.actual_days, 0) +
             COALESCE(fc.suspension_days, 0) + COALESCE(SUM(lr.leave_days), 0))
        END as refund_amount
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN grades g ON c.grade_id = g.id
      ${feeConfigJoin}
      ${leaveRecordJoin}
      ${whereClause}
      GROUP BY s.id, s.student_no, s.name, c.name, g.name, g.sort_order, s.is_nutrition_meal,
               fc.prepaid_days, fc.actual_days, fc.suspension_days, fc.meal_fee_standard
      HAVING (CASE
          WHEN s.is_nutrition_meal = true THEN 0
          ELSE COALESCE(CAST(fc.meal_fee_standard AS NUMERIC), 0) *
            (COALESCE(fc.prepaid_days, 0) - COALESCE(fc.actual_days, 0) +
             COALESCE(fc.suspension_days, 0) + COALESCE(SUM(lr.leave_days), 0))
        END) > 0 OR COALESCE(SUM(lr.leave_days), 0) > 0
      ORDER BY g.sort_order ASC, c.name ASC, s.student_no ASC
    `;

    return await pgClient.unsafe(dataQuery, queryParams) as StudentRefundRecord[];
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE s.is_active = true";
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  // 根据 semester_id 筛选条件，动态构建 JOIN
  // 当指定学期时，严格按学期过滤；否则不限制学期以获取所有数据
  const feeConfigJoin = params?.semester_id
    ? "LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = $" + (paramIndex++)
    : "LEFT JOIN fee_configs fc ON c.id = fc.class_id";

  if (params?.semester_id) {
    queryParams.push(params.semester_id);
  }

  if (params?.class_id) {
    whereClause += " AND s.class_id = $" + (paramIndex++);
    queryParams.push(params.class_id);
  }

  // 请假记录的 JOIN 条件也需要根据学期动态调整
  // 当指定学期时，严格按学期过滤；否则不限制学期以获取所有数据
  const leaveRecordJoin = params?.semester_id
    ? "LEFT JOIN leave_records lr ON s.id = lr.student_id AND lr.semester_id = $" + (paramIndex++) + " AND lr.status = 'approved'"
    : "LEFT JOIN leave_records lr ON s.id = lr.student_id AND lr.status = 'approved'";

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

  const totalResult = await pgClient.unsafe(countQuery, queryParams) as { total: string | number }[];
  const total = totalResult[0]?.total ? Number(totalResult[0].total) : 0;

  // 获取数据（注意：meal_fee_standard 是 text 类型，需要转换为 numeric）
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
      COALESCE(fc.meal_fee_standard, '0') as meal_fee_standard,
      CASE
        WHEN s.is_nutrition_meal = true THEN 0
        ELSE COALESCE(CAST(fc.meal_fee_standard AS NUMERIC), 0) *
          (COALESCE(fc.prepaid_days, 0) - COALESCE(fc.actual_days, 0) +
           COALESCE(fc.suspension_days, 0) + COALESCE(SUM(lr.leave_days), 0))
      END as refund_amount
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    ${feeConfigJoin}
    ${leaveRecordJoin}
    ${whereClause}
    GROUP BY s.id, s.student_no, s.name, c.name, g.name, g.sort_order, s.is_nutrition_meal,
             fc.prepaid_days, fc.actual_days, fc.suspension_days, fc.meal_fee_standard
    HAVING (CASE
        WHEN s.is_nutrition_meal = true THEN 0
        ELSE COALESCE(CAST(fc.meal_fee_standard AS NUMERIC), 0) *
          (COALESCE(fc.prepaid_days, 0) - COALESCE(fc.actual_days, 0) +
           COALESCE(fc.suspension_days, 0) + COALESCE(SUM(lr.leave_days), 0))
      END) > 0 OR COALESCE(SUM(lr.leave_days), 0) > 0
    ORDER BY g.sort_order ASC, c.name ASC, s.student_no ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(limit, offset);
  const data = await pgClient.unsafe(dataQuery, queryParams) as StudentRefundRecord[];

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
export async function getClassRefundSummary(
  params?: { semester_id?: number; class_id?: number }
): Promise<ClassRefundSummaryFull[]> {
  const pgClient = getRawPostgres();

  // 先获取每个学生的请假天数
  let studentLeaveQuery = `
    SELECT
      s.id as student_id,
      s.class_id,
      s.is_nutrition_meal,
      COALESCE(SUM(lr.leave_days), 0) as leave_days
    FROM students s
    LEFT JOIN leave_records lr ON s.id = lr.student_id AND lr.status = 'approved'
    WHERE s.is_active = true
  `;

  const studentLeaveParams: (string | number)[] = [];
  const studentLeaveConditions: string[] = [];
  let paramIndex = 1;

  if (params?.semester_id) {
    studentLeaveConditions.push("lr.semester_id = $" + (paramIndex++));
    studentLeaveParams.push(params.semester_id);
  }

  if (studentLeaveConditions.length > 0) {
    studentLeaveQuery += " AND " + studentLeaveConditions.join(" AND ");
  }

  studentLeaveQuery += " GROUP BY s.id, s.class_id, s.is_nutrition_meal";

  const queryParams: (string | number)[] = [];
  const whereConditions: string[] = [];

  // 主查询：获取班级退费汇总（注意：meal_fee_standard 是 text 类型，需要转换为 numeric）
  let query = `
    SELECT
      c.id as class_id,
      c.name as class_name,
      g.name as grade_name,
      u.real_name as class_teacher_name,
      COALESCE(fc.meal_fee_standard, '0') as meal_fee_standard,
      COALESCE(fc.prepaid_days, 0) as prepaid_days,
      COALESCE(fc.actual_days, 0) as actual_days,
      COALESCE(fc.suspension_days, 0) as suspension_days,
      COALESCE(SUM(sl.leave_days), 0) as total_leave_days,
      COUNT(DISTINCT sl.student_id) as student_count,
      SUM(CASE
        WHEN sl.is_nutrition_meal = false THEN
          COALESCE(CAST(fc.meal_fee_standard AS NUMERIC), 0) *
          (COALESCE(fc.prepaid_days, 0) - COALESCE(fc.actual_days, 0) +
           COALESCE(fc.suspension_days, 0) + COALESCE(sl.leave_days, 0))
        ELSE 0
      END) as total_refund_amount,
      COUNT(CASE WHEN sl.is_nutrition_meal = false THEN 1 END) as refund_students_count
    FROM classes c
    LEFT JOIN grades g ON c.grade_id = g.id
    LEFT JOIN users u ON c.class_teacher_id = u.id
    LEFT JOIN fee_configs fc ON c.id = fc.class_id
    LEFT JOIN (${studentLeaveQuery}) sl ON c.id = sl.class_id
  `;

  // WHERE 条件（如果指定学期或班级）
  if (params?.semester_id) {
    whereConditions.push(`c.semester_id = $${paramIndex++}`);
    queryParams.push(params.semester_id);
  }

  if (params?.class_id) {
    whereConditions.push(`c.id = $${paramIndex++}`);
    queryParams.push(params.class_id);
  }

  if (whereConditions.length > 0) {
    query += " WHERE " + whereConditions.join(" AND ");
  }

  query += `
    GROUP BY c.id, c.name, g.name, g.sort_order, u.real_name,
             fc.prepaid_days, fc.actual_days, fc.suspension_days, fc.meal_fee_standard
    ORDER BY g.sort_order ASC, c.name ASC
  `;

  // 传递子查询参数
  return await pgClient.unsafe(query, [...studentLeaveParams, ...queryParams]) as ClassRefundSummaryFull[];
}

/**
 * 根据学期名称、年级名称、班级名称获取班级ID
 */
export async function getClassIdByNames(
  semesterName: string,
  gradeName: string,
  className: string
): Promise<{ class_id?: number; semester_id?: number; error?: string }> {
  const pgClient = getRawPostgres();

  // 获取学期 ID
  const semesterResult = await pgClient.unsafe("SELECT id FROM semesters WHERE name = $1", [semesterName]) as { id: number }[];

  if (semesterResult.length === 0) {
    return { error: `学期"${semesterName}"不存在` };
  }

  const semester = semesterResult[0];

  // 获取年级 ID（必须在指定学期下）
  const gradeResult = await pgClient.unsafe("SELECT id FROM grades WHERE name = $1 AND semester_id = $2", [gradeName, semester.id]) as { id: number }[];

  if (gradeResult.length === 0) {
    return { error: `学期"${semesterName}"下不存在年级"${gradeName}"` };
  }

  const grade = gradeResult[0];

  // 获取班级 ID（必须在指定学期的指定年级下）
  const clsResult = await pgClient.unsafe("SELECT id FROM classes WHERE name = $1 AND semester_id = $2 AND grade_id = $3", [className, semester.id, grade.id]) as { id: number }[];

  const cls = clsResult[0];

  if (!cls) {
    return { error: `学期"${semesterName}"的"${gradeName}"下不存在班级"${className}"` };
  }

  return {
    class_id: cls.id,
    semester_id: semester.id,
  };
}

/**
 * 批量创建或更新费用配置
 */
export async function batchCreateOrUpdateFeeConfigs(
  inputs: FeeConfigInput[]
): Promise<{
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; input: FeeConfigInput; message: string }>;
}> {
  const errors: Array<{ row: number; input: FeeConfigInput; message: string }> = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    try {
      // 检查费用配置是否存在（同一班级+学期）
      const existingResult = await getRawPostgres().unsafe(
        "SELECT id FROM fee_configs WHERE class_id = $1 AND semester_id = $2",
        [input.class_id, input.semester_id]
      ) as { id: number }[];

      if (existingResult.length > 0) {
        // 更新现有费用配置
        const updateResult = await updateFeeConfig(existingResult[0].id, {
          meal_fee_standard: input.meal_fee_standard,
          prepaid_days: input.prepaid_days,
          actual_days: input.actual_days,
          suspension_days: input.suspension_days,
        });
        if (updateResult.success) {
          updated++;
        } else {
          errors.push({ row: i + 1, input, message: updateResult.message || '更新失败' });
        }
      } else {
        // 创建新费用配置
        const createResult = await createFeeConfig(input);
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
