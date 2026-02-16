import { getRawPostgres } from "@/lib/db";
import { getNumberConfig, getBooleanConfig } from "./system-config";
import { validateOrderBy, SORT_FIELDS, DEFAULT_SORT_FIELDS } from "@/lib/utils/sql-security";
import { validateLeaveRequest } from "@/lib/utils/leave-validation";
import type {
  LeaveInput,
  LeaveReview,
  LeaveWithDetails,
  PaginationParams,
  PaginatedResponse,
} from "@/types";

/**
 * 请假服务层
 */

/**
 * 获取请假记录列表（分页）
 */
export async function getLeaves(
  params: PaginationParams & {
    student_id?: number;
    class_id?: number;
    semester_id?: number;
    status?: string;
    applicant_id?: number;
  }
): Promise<PaginatedResponse<LeaveWithDetails>> {
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
    whereClause += " AND (s.student_no ILIKE $" + (paramIndex++) + " OR s.name ILIKE $" + (paramIndex++) + " OR u.real_name ILIKE $" + (paramIndex++) + " OR lr.reason ILIKE $" + (paramIndex++) + ")";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (params.student_id) {
    whereClause += " AND lr.student_id = $" + (paramIndex++);
    queryParams.push(params.student_id);
  }

  if (params.class_id) {
    whereClause += " AND s.class_id = $" + (paramIndex++);
    queryParams.push(params.class_id);
  }

  if (params.semester_id) {
    whereClause += " AND lr.semester_id = $" + (paramIndex++);
    queryParams.push(params.semester_id);
  }

  if (params.status) {
    whereClause += " AND lr.status = $" + (paramIndex++);
    queryParams.push(params.status);
  }

  if (params.applicant_id) {
    whereClause += " AND lr.applicant_id = $" + (paramIndex++);
    queryParams.push(params.applicant_id);
  }

  // 排序（使用白名单验证防止 SQL 注入）
  const { orderBy, order } = validateOrderBy(
    params.sort,
    params.order,
    { allowedFields: SORT_FIELDS.leaves, defaultField: DEFAULT_SORT_FIELDS.leaves }
  );
  const orderClause = `ORDER BY ${orderBy} ${order}`;

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as count
    FROM leave_records lr
    LEFT JOIN students s ON lr.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON lr.applicant_id = u.id
    ${whereClause}
  `;
  const countResult = await pgClient.unsafe(countQuery, queryParams) as { count: number }[];
  const total = countResult[0]?.count || 0;

  // 获取数据
  const dataQuery = `
    SELECT
      lr.*,
      s.name as student_name,
      s.student_no,
      s.is_nutrition_meal,
      c.name as class_name,
      g.name as grade_name,
      u.real_name as applicant_name,
      reviewer.real_name as reviewer_name,
      sem.name as semester_name
    FROM leave_records lr
    LEFT JOIN students s ON lr.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    LEFT JOIN users u ON lr.applicant_id = u.id
    LEFT JOIN users reviewer ON lr.reviewer_id = reviewer.id
    LEFT JOIN semesters sem ON lr.semester_id = sem.id
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  queryParams.push(limit, offset);
  const data = await pgClient.unsafe(dataQuery, queryParams) as LeaveWithDetails[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 根据ID获取请假记录
 */
export async function getLeaveById(id: number): Promise<LeaveWithDetails | null> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe(`
      SELECT
        lr.*,
        s.name as student_name,
        s.student_no,
        s.gender,
        s.parent_name,
        s.parent_phone,
        s.is_nutrition_meal,
        c.name as class_name,
        c.meal_fee,
        c.id as class_id,
        g.name as grade_name,
        u.real_name as applicant_name,
        reviewer.real_name as reviewer_name,
        sem.name as semester_name,
        sem.school_days
      FROM leave_records lr
      LEFT JOIN students s ON lr.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN grades g ON c.grade_id = g.id
      LEFT JOIN users u ON lr.applicant_id = u.id
      LEFT JOIN users reviewer ON lr.reviewer_id = reviewer.id
      LEFT JOIN semesters sem ON lr.semester_id = sem.id
      WHERE lr.id = $1
    `, [id]) as LeaveWithDetails[];

  return result[0] || null;
}

/**
 * 创建请假申请
 */
export async function createLeave(
  input: LeaveInput,
  applicantId: number
): Promise<{ success: boolean; message?: string; leaveId?: number; studentName?: string; studentNo?: string }> {
  const pgClient = getRawPostgres();

  // 从系统配置获取最小请假天数
  const minLeaveDays = await getNumberConfig("leave.min_days", 3);

  // 验证请假天数必须大于最小天数
  if (input.leave_days <= minLeaveDays) {
    return { success: false, message: `请假天数必须大于${minLeaveDays}天` };
  }

  // 验证补请假天数和日期重叠
  const validation = await validateLeaveRequest(
    input.student_id,
    input.semester_id,
    input.start_date,
    input.end_date
  );
  if (!validation.success) {
    return { success: false, message: validation.message };
  }

  // 检查学生是否存在，并获取费用配置
  const studentResult = await pgClient.unsafe(
    `SELECT s.id, s.name, s.student_no, s.is_nutrition_meal, s.class_id,
            c.id as class_id_check, c.semester_id as class_semester_id,
            fc.meal_fee_standard
     FROM students s
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = $1
     WHERE s.id = $2`,
    [input.semester_id, input.student_id]
  ) as {
      id: number;
      name: string;
      student_no: string;
      is_nutrition_meal: boolean;
      class_id: number;
      class_id_check: number | null;
      class_semester_id: number | null;
      meal_fee_standard: number | null;
    }[];

  const student = studentResult[0];

  if (!student) {
    return { success: false, message: "学生不存在" };
  }

  // 获取学期信息验证学期总天数
  const semesterResult = await pgClient.unsafe("SELECT school_days FROM semesters WHERE id = $1", [input.semester_id]) as { school_days: number }[];

  const semester = semesterResult[0];

  if (!semester) {
    return { success: false, message: "学期不存在" };
  }

  if (input.leave_days > semester.school_days) {
    return { success: false, message: `请假天数不能超过学期总天数（${semester.school_days}天）` };
  }

  // 验证请假天数不能超过日期范围的自然天数
  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);
  const dayDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (input.leave_days > dayDiff) {
    return { success: false, message: `请假天数不能超过日期范围（${dayDiff}天）` };
  }

  // 使用手动输入的请假天数
  const leaveDays = input.leave_days;

  // 计算退费金额：退费金额 = 请假天数 × 餐费标准
  const isNutritionMeal = student.is_nutrition_meal;
  // 将字符串转换为数字，无效值默认为 0
  const mealFeeStandard = parseFloat(String(student.meal_fee_standard ?? '0')) || 0;
  const refundAmount = isNutritionMeal ? 0 : leaveDays * mealFeeStandard;

  // 检查是否需要审批
  const requireApproval = await getBooleanConfig("leave.require_approval", true);
  const initialStatus = requireApproval ? "pending" : "approved";

  // 插入请假记录
  const result = await pgClient.unsafe(
    `INSERT INTO leave_records (
      student_id, semester_id, applicant_id, start_date, end_date,
      leave_days, reason, status, is_refund, refund_amount, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id`,
    [
      input.student_id,
      input.semester_id,
      applicantId,
      input.start_date,
      input.end_date,
      leaveDays,
      input.reason,
      initialStatus,
      isNutritionMeal ? false : true,
      isNutritionMeal ? null : refundAmount
    ]
  );

  const leaveId = result[0]?.id;

  // 如果不需要审批，自动设置为已批准状态并记录审核人
  if (!requireApproval && leaveId) {
    await pgClient.unsafe(
      `UPDATE leave_records
       SET reviewer_id = $1, review_time = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [applicantId, leaveId]
    );
  }

  return { success: true, leaveId, studentName: student.name, studentNo: student.student_no };
}

/**
 * 审核请假
 */
export async function reviewLeave(
  id: number,
  review: LeaveReview,
  reviewerId: number
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查请假记录是否存在且状态为待审核
  const leaveResult = await pgClient.unsafe(
    `SELECT lr.*, s.is_nutrition_meal, c.meal_fee, sem.school_days
     FROM leave_records lr
     LEFT JOIN students s ON lr.student_id = s.id
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN semesters sem ON lr.semester_id = sem.id
     WHERE lr.id = $1`,
    [id]
  ) as {
      id: number;
      status: string;
      is_nutrition_meal: boolean;
      meal_fee: number;
      school_days: number;
      leave_days: number;
    }[];

  const leave = leaveResult[0];

  if (!leave) {
    return { success: false, message: "请假记录不存在" };
  }

  if (leave.status !== "pending") {
    return { success: false, message: "该请假记录已被审核" };
  }

  // 更新审核状态
  await pgClient.unsafe(
    `UPDATE leave_records
     SET status = $1, reviewer_id = $2, review_time = CURRENT_TIMESTAMP, review_remark = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [review.status, reviewerId, review.review_remark || null, id]
  );

  return { success: true };
}

/**
 * 删除请假记录
 */
export async function deleteLeave(id: number): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查请假记录是否存在
  const leaveResult = await pgClient.unsafe("SELECT id, status FROM leave_records WHERE id = $1", [id]) as
    { id: number; status: string }[];

  const leave = leaveResult[0];

  if (!leave) {
    return { success: false, message: "请假记录不存在" };
  }

  // 只有待审核和已拒绝的记录可以删除
  if (leave.status === "approved") {
    return { success: false, message: "已批准的请假记录不能删除" };
  }

  await pgClient.unsafe("DELETE FROM leave_records WHERE id = $1", [id]);

  return { success: true };
}

/**
 * 撤销请假审核（将已批准/已拒绝的记录退回到待审核状态）
 */
export async function revokeLeaveApproval(
  id: number,
  adminId: number
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 检查请假记录是否存在
  const leaveResult = await pgClient.unsafe("SELECT id, status FROM leave_records WHERE id = $1", [id]) as
    { id: number; status: string }[];

  const leave = leaveResult[0];

  if (!leave) {
    return { success: false, message: "请假记录不存在" };
  }

  // 只能撤销已批准或已拒绝的记录
  if (leave.status === "pending") {
    return { success: false, message: "该记录已经是待审核状态" };
  }

  // 将状态改为待审核，清除审核信息
  await pgClient.unsafe(
    `UPDATE leave_records
     SET status = 'pending',
         reviewer_id = NULL,
         review_time = NULL,
         review_remark = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id]
  );

  return { success: true };
}

/**
 * 获取待审核的请假记录数量
 */
export async function getPendingLeaveCount(): Promise<number> {
  const pgClient = getRawPostgres();
  const result = await pgClient.unsafe("SELECT COUNT(*) as count FROM leave_records WHERE status = 'pending'") as { count: number }[];
  return result[0]?.count || 0;
}

/**
 * 获取请假统计
 * 优化：使用单条查询获取所有统计数据，避免多次查询
 */
export async function getLeaveStats(semesterId?: number): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalRefundAmount: number;
}> {
  const pgClient = getRawPostgres();

  let whereClause = "WHERE 1=1";
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (semesterId) {
    whereClause += " AND semester_id = $" + (paramIndex++);
    params.push(semesterId);
  }

  // 使用单条查询获取所有统计数据，将 5 次查询优化为 1 次
  const result = await pgClient.unsafe(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN refund_amount ELSE 0 END), 0) as totalRefundAmount
    FROM leave_records
    ${whereClause}
  `, params) as {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalRefundAmount: number;
  }[];

  const r = result[0];

  return {
    total: r?.total || 0,
    pending: r?.pending || 0,
    approved: r?.approved || 0,
    rejected: r?.rejected || 0,
    totalRefundAmount: r?.totalRefundAmount || 0,
  };
}

/**
 * 获取班级的请假记录
 */
export async function getLeavesByClass(classId: number, semesterId?: number): Promise<LeaveWithDetails[]> {
  const pgClient = getRawPostgres();

  let whereClause = "WHERE s.class_id = $1";
  const params: (string | number)[] = [classId];
  let paramIndex = 2;

  if (semesterId) {
    whereClause += " AND lr.semester_id = $" + (paramIndex++);
    params.push(semesterId);
  }

  const leaves = await pgClient.unsafe(`
    SELECT
      lr.*,
      s.name as student_name,
      s.student_no,
      s.is_nutrition_meal,
      c.name as class_name,
      g.name as grade_name,
      u.real_name as applicant_name,
      reviewer.real_name as reviewer_name,
      sem.name as semester_name
    FROM leave_records lr
    LEFT JOIN students s ON lr.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    LEFT JOIN users u ON lr.applicant_id = u.id
    LEFT JOIN users reviewer ON lr.reviewer_id = reviewer.id
    LEFT JOIN semesters sem ON lr.semester_id = sem.id
    ${whereClause}
    ORDER BY lr.created_at DESC
  `, params) as LeaveWithDetails[];

  return leaves;
}

/**
 * 获取学生的请假记录
 */
export async function getLeavesByStudent(studentId: number, semesterId?: number): Promise<LeaveWithDetails[]> {
  const pgClient = getRawPostgres();

  let whereClause = "WHERE lr.student_id = $1";
  const params: (string | number)[] = [studentId];
  let paramIndex = 2;

  if (semesterId) {
    whereClause += " AND lr.semester_id = $" + (paramIndex++);
    params.push(semesterId);
  }

  const leaves = await pgClient.unsafe(`
    SELECT
      lr.*,
      s.name as student_name,
      s.student_no,
      s.is_nutrition_meal,
      c.name as class_name,
      g.name as grade_name,
      u.real_name as applicant_name,
      reviewer.real_name as reviewer_name,
      sem.name as semester_name
    FROM leave_records lr
    LEFT JOIN students s ON lr.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    LEFT JOIN users u ON lr.applicant_id = u.id
    LEFT JOIN users reviewer ON lr.reviewer_id = reviewer.id
    LEFT JOIN semesters sem ON lr.semester_id = sem.id
    ${whereClause}
    ORDER BY lr.created_at DESC
  `, params) as LeaveWithDetails[];

  return leaves;
}

/**
 * 重新计算所有请假记录的退费金额
 * 使用新的费用配置
 * 优化：使用单条 SQL 批量更新，避免 N+1 查询问题
 */
export async function recalculateAllLeaveRefunds(): Promise<{ updated: number; message: string }> {
  const pgClient = getRawPostgres();

  // 使用单条 SQL 批量更新所有记录，避免 N+1 查询问题（注意：meal_fee_standard 是 text 类型，需要转换为 numeric）
  await pgClient.unsafe(`
    UPDATE leave_records
    SET refund_amount =
      CASE
        WHEN s.is_nutrition_meal = true THEN NULL
        ELSE leave_records.leave_days * COALESCE(CAST(fc.meal_fee_standard AS NUMERIC), 0)
      END,
      updated_at = CURRENT_TIMESTAMP
    FROM leave_records
    LEFT JOIN students s ON leave_records.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = leave_records.semester_id
    WHERE leave_records.is_refund = true
  `);

  // PostgreSQL 不提供 changes 信息，需要额外查询
  const countResult = await pgClient.unsafe("SELECT COUNT(*) as count FROM leave_records WHERE is_refund = true") as { count: number }[];
  const updated = countResult[0]?.count || 0;

  return {
    updated,
    message: `已更新 ${updated} 条请假记录的退费金额`,
  };
}

/**
 * 更新请假记录
 */
export async function updateLeave(
  id: number,
  input: LeaveInput
): Promise<{ success: boolean; message?: string }> {
  const pgClient = getRawPostgres();

  // 从系统配置获取最小请假天数
  const minLeaveDays = await getNumberConfig("leave.min_days", 3);

  // 验证请假天数必须大于最小天数
  if (input.leave_days <= minLeaveDays) {
    return { success: false, message: `请假天数必须大于${minLeaveDays}天` };
  }

  // 检查请假记录是否存在
  const existingLeaveResult = await pgClient.unsafe(
    `SELECT lr.*, s.is_nutrition_meal, c.id as class_id
     FROM leave_records lr
     LEFT JOIN students s ON lr.student_id = s.id
     LEFT JOIN classes c ON s.class_id = c.id
     WHERE lr.id = $1`,
    [id]
  ) as {
      id: number;
      status: string;
      student_id: number;
      semester_id: number;
      is_nutrition_meal: boolean;
      class_id: number;
    }[];

  const existingLeave = existingLeaveResult[0];

  if (!existingLeave) {
    return { success: false, message: "请假记录不存在" };
  }

  // 验证补请假天数和日期重叠（排除自身记录）
  const validation = validateLeaveRequest(
    input.student_id,
    input.semester_id,
    input.start_date,
    input.end_date,
    id  // 排除当前编辑的记录
  );
  if (!validation.success) {
    return { success: false, message: validation.message };
  }

  // 只能编辑待审核和已拒绝状态的记录（除非明确指定了新状态）
  const newStatus = input.status;
  if (existingLeave.status === "approved" && !newStatus) {
    return { success: false, message: "已批准的请假记录不能编辑" };
  }

  // 检查学生是否存在，并获取费用配置
  const studentResult = await pgClient.unsafe(
    `SELECT s.id, s.is_nutrition_meal, s.class_id,
            c.id as class_id_check, c.semester_id as class_semester_id,
            fc.meal_fee_standard
     FROM students s
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = $1
     WHERE s.id = $2`,
    [input.semester_id, input.student_id]
  ) as {
      id: number;
      is_nutrition_meal: boolean;
      class_id: number;
      class_id_check: number | null;
      class_semester_id: number | null;
      meal_fee_standard: number | null;
    }[];

  const student = studentResult[0];

  if (!student) {
    return { success: false, message: "学生不存在" };
  }

  // 获取学期信息验证学期总天数
  const semesterResult = await pgClient.unsafe("SELECT school_days FROM semesters WHERE id = $1", [input.semester_id]) as { school_days: number }[];

  const semester = semesterResult[0];

  if (!semester) {
    return { success: false, message: "学期不存在" };
  }

  if (input.leave_days > semester.school_days) {
    return { success: false, message: `请假天数不能超过学期总天数（${semester.school_days}天）` };
  }

  // 验证请假天数不能超过日期范围的自然天数
  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);
  const dayDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (input.leave_days > dayDiff) {
    return { success: false, message: `请假天数不能超过日期范围（${dayDiff}天）` };
  }

  // 计算退费金额
  const isNutritionMeal = student.is_nutrition_meal;
  // 将字符串转换为数字，无效值默认为 0
  const mealFeeStandard = parseFloat(String(student.meal_fee_standard ?? '0')) || 0;
  const refundAmount = isNutritionMeal ? 0 : input.leave_days * mealFeeStandard;

  // 构建更新 SQL，根据是否包含状态字段来决定更新哪些列
  if (newStatus) {
    // 包含状态更新 - 需要清除审核信息
    await pgClient.unsafe(
      `UPDATE leave_records
       SET student_id = $1, semester_id = $2, start_date = $3, end_date = $4,
           leave_days = $5, reason = $6, status = $7, is_refund = $8, refund_amount = $9,
           reviewer_id = NULL, review_time = NULL, review_remark = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        input.student_id,
        input.semester_id,
        input.start_date,
        input.end_date,
        input.leave_days,
        input.reason,
        newStatus,
        isNutritionMeal ? false : true,
        isNutritionMeal ? null : refundAmount,
        id
      ]
    );
  } else {
    // 不包含状态更新
    await pgClient.unsafe(
      `UPDATE leave_records
       SET student_id = $1, semester_id = $2, start_date = $3, end_date = $4,
           leave_days = $5, reason = $6, is_refund = $7, refund_amount = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        input.student_id,
        input.semester_id,
        input.start_date,
        input.end_date,
        input.leave_days,
        input.reason,
        isNutritionMeal ? false : true,
        isNutritionMeal ? null : refundAmount,
        id
      ]
    );
  }

  return { success: true };
}

/**
 * 根据学生信息获取学生ID和学期ID
 * 验证学生是否存在以及班级学期关联是否正确
 */
export async function getStudentIdByInfo(
  studentNo: string,
  studentName: string,
  semesterName: string,
  gradeName: string,
  className: string
): Promise<{ student_id?: number; semester_id?: number; error?: string }> {
  const pgClient = getRawPostgres();

  // 查找学期
  const semesterResult = await pgClient.unsafe("SELECT id FROM semesters WHERE name = $1", [semesterName]) as { id: number }[];

  if (semesterResult.length === 0) {
    return { error: `学期"${semesterName}"不存在` };
  }

  const semester = semesterResult[0];

  // 查找班级
  const classInfoResult = await pgClient.unsafe(`
    SELECT c.id, c.semester_id
    FROM classes c
    LEFT JOIN grades g ON c.grade_id = g.id
    WHERE c.semester_id = $1 AND g.name = $2 AND c.name = $3
  `, [semester.id, gradeName, className]) as
    { id: number; semester_id: number }[];

  const classInfo = classInfoResult[0];

  if (!classInfo) {
    return { error: `在学期"${semesterName}"中未找到"${gradeName}${className}"` };
  }

  // 查找学生
  const studentResult = await pgClient.unsafe(
    "SELECT id FROM students WHERE student_no = $1 AND name = $2 AND class_id = $3",
    [studentNo, studentName, classInfo.id]
  ) as { id: number }[];

  const student = studentResult[0];

  if (!student) {
    return { error: `学号"${studentNo}"的学生"${studentName}"在指定班级中不存在` };
  }

  return {
    student_id: student.id,
    semester_id: semester.id,
  };
}

/**
 * 批量创建请假记录
 */
export async function batchCreateLeaves(
  leaves: LeaveInput[],
  applicantId: number
): Promise<{ created: number; failed: number; errors: Array<{ row: number; message: string }> }> {
  const results = {
    created: 0,
    failed: 0,
    errors: [] as Array<{ row: number; message: string }>,
  };

  for (let i = 0; i < leaves.length; i++) {
    const leave = leaves[i];
    const rowNum = i + 1;

    // 调用现有的创建请假函数
    const result = await createLeave(leave, applicantId);

    if (result.success) {
      results.created++;
    } else {
      results.failed++;
      // 确保错误信息存在
      const errorMessage = result.message || "创建失败";
      if (!errorMessage) {
        console.error(`创建请假记录失败（第${rowNum}行）:`, leave);
      }
      results.errors.push({
        row: rowNum,
        message: errorMessage,
      });
    }
  }

  return results;
}
