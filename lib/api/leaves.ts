import { getDb } from "@/lib/db";
import { getNumberConfig } from "./system-config";
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
export function getLeaves(
  params: PaginationParams & {
    student_id?: number;
    class_id?: number;
    semester_id?: number;
    status?: string;
    applicant_id?: number;
  }
): PaginatedResponse<LeaveWithDetails> {
  const db = getDb();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereClause = "WHERE 1=1";
  const queryParams: (string | number)[] = [];

  if (params.search) {
    // 使用 COLLATE NOCASE 索引优化搜索（reason 字段不包含敏感信息，直接搜索）
    whereClause +=
      " AND (s.student_no LIKE ? COLLATE NOCASE OR s.name LIKE ? COLLATE NOCASE OR u.real_name LIKE ? COLLATE NOCASE OR lr.reason LIKE ?)";
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (params.student_id) {
    whereClause += " AND lr.student_id = ?";
    queryParams.push(params.student_id);
  }

  if (params.class_id) {
    whereClause += " AND s.class_id = ?";
    queryParams.push(params.class_id);
  }

  if (params.semester_id) {
    whereClause += " AND lr.semester_id = ?";
    queryParams.push(params.semester_id);
  }

  if (params.status) {
    whereClause += " AND lr.status = ?";
    queryParams.push(params.status);
  }

  if (params.applicant_id) {
    whereClause += " AND lr.applicant_id = ?";
    queryParams.push(params.applicant_id);
  }

  // 排序
  const orderBy = params.sort || "lr.created_at";
  const order = params.order || "desc";
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
  const countResult = db.prepare(countQuery).get(...queryParams) as { count: number };
  const total = countResult.count;

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
    LIMIT ? OFFSET ?
  `;
  const data = db.prepare(dataQuery).all(...queryParams, limit, offset) as LeaveWithDetails[];

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
export function getLeaveById(id: number): LeaveWithDetails | null {
  const db = getDb();
  const leave = db
    .prepare(`
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
      WHERE lr.id = ?
    `)
    .get(id) as LeaveWithDetails | undefined;

  return leave || null;
}

/**
 * 创建请假申请
 */
export function createLeave(
  input: LeaveInput,
  applicantId: number
): { success: boolean; message?: string; leaveId?: number } {
  const db = getDb();

  // 从系统配置获取最小请假天数
  const minLeaveDays = getNumberConfig("leave.min_days", 3);

  // 验证请假天数必须大于最小天数
  if (input.leave_days <= minLeaveDays) {
    return { success: false, message: `请假天数必须大于${minLeaveDays}天` };
  }

  // 验证补请假天数和日期重叠
  const validation = validateLeaveRequest(
    input.student_id,
    input.semester_id,
    input.start_date,
    input.end_date
  );
  if (!validation.success) {
    return { success: false, message: validation.message };
  }

  // 检查学生是否存在，并获取费用配置
  const student = db
    .prepare(
      `SELECT s.id, s.is_nutrition_meal, s.class_id,
              c.id as class_id_check, c.semester_id as class_semester_id,
              fc.meal_fee_standard
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = ?
       WHERE s.id = ?`
    )
    .get(input.semester_id, input.student_id) as
    | {
        id: number;
        is_nutrition_meal: number;
        class_id: number;
        class_id_check: number | null;
        class_semester_id: number | null;
        meal_fee_standard: number | null;
      }
    | undefined;

  if (!student) {
    return { success: false, message: "学生不存在" };
  }

  // 获取学期信息验证学期总天数
  const semester = db
    .prepare("SELECT school_days FROM semesters WHERE id = ?")
    .get(input.semester_id) as { school_days: number } | undefined;

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
  const isNutritionMeal = student.is_nutrition_meal === 1;
  const mealFeeStandard = student.meal_fee_standard ?? 0;
  const refundAmount = isNutritionMeal ? 0 : leaveDays * mealFeeStandard;

  // 插入请假记录
  const result = db
    .prepare(
      `INSERT INTO leave_records (
        student_id, semester_id, applicant_id, start_date, end_date,
        leave_days, reason, status, is_refund, refund_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.student_id,
      input.semester_id,
      applicantId,
      input.start_date,
      input.end_date,
      leaveDays,
      input.reason,
      "pending",
      isNutritionMeal ? 0 : 1,
      isNutritionMeal ? null : refundAmount
    );

  return { success: true, leaveId: result.lastInsertRowid as number };
}

/**
 * 审核请假
 */
export function reviewLeave(
  id: number,
  review: LeaveReview,
  reviewerId: number
): { success: boolean; message?: string } {
  const db = getDb();

  // 检查请假记录是否存在且状态为待审核
  const leave = db
    .prepare(
      `SELECT lr.*, s.is_nutrition_meal, c.meal_fee, sem.school_days
       FROM leave_records lr
       LEFT JOIN students s ON lr.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN semesters sem ON lr.semester_id = sem.id
       WHERE lr.id = ?`
    )
    .get(id) as
    | {
        id: number;
        status: string;
        is_nutrition_meal: number;
        meal_fee: number;
        school_days: number;
        leave_days: number;
      }
    | undefined;

  if (!leave) {
    return { success: false, message: "请假记录不存在" };
  }

  if (leave.status !== "pending") {
    return { success: false, message: "该请假记录已被审核" };
  }

  // 更新审核状态
  db.prepare(
    `UPDATE leave_records
     SET status = ?, reviewer_id = ?, review_time = CURRENT_TIMESTAMP, review_remark = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(review.status, reviewerId, review.review_remark || null, id);

  return { success: true };
}

/**
 * 删除请假记录
 */
export function deleteLeave(id: number): { success: boolean; message?: string } {
  const db = getDb();

  // 检查请假记录是否存在
  const leave = db.prepare("SELECT id, status FROM leave_records WHERE id = ?").get(id) as
    | { id: number; status: string }
    | undefined;

  if (!leave) {
    return { success: false, message: "请假记录不存在" };
  }

  // 只有待审核和已拒绝的记录可以删除
  if (leave.status === "approved") {
    return { success: false, message: "已批准的请假记录不能删除" };
  }

  db.prepare("DELETE FROM leave_records WHERE id = ?").run(id);

  return { success: true };
}

/**
 * 获取待审核的请假记录数量
 */
export function getPendingLeaveCount(): number {
  const db = getDb();
  const result = db
    .prepare("SELECT COUNT(*) as count FROM leave_records WHERE status = 'pending'")
    .get() as { count: number };
  return result.count;
}

/**
 * 获取请假统计
 * 优化：使用单条查询获取所有统计数据，避免多次查询
 */
export function getLeaveStats(semesterId?: number): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalRefundAmount: number;
} {
  const db = getDb();

  let whereClause = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (semesterId) {
    whereClause += " AND semester_id = ?";
    params.push(semesterId);
  }

  // 使用单条查询获取所有统计数据，将 5 次查询优化为 1 次
  const result = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN refund_amount ELSE 0 END), 0) as totalRefundAmount
      FROM leave_records
      ${whereClause}
    `)
    .get(...params) as {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      totalRefundAmount: number;
    };

  return {
    total: result.total,
    pending: result.pending || 0,
    approved: result.approved || 0,
    rejected: result.rejected || 0,
    totalRefundAmount: result.totalRefundAmount,
  };
}

/**
 * 获取班级的请假记录
 */
export function getLeavesByClass(classId: number, semesterId?: number): LeaveWithDetails[] {
  const db = getDb();

  let whereClause = "WHERE s.class_id = ?";
  const params: (string | number)[] = [classId];

  if (semesterId) {
    whereClause += " AND lr.semester_id = ?";
    params.push(semesterId);
  }

  const leaves = db
    .prepare(`
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
    `)
    .all(...params) as LeaveWithDetails[];

  return leaves;
}

/**
 * 获取学生的请假记录
 */
export function getLeavesByStudent(studentId: number, semesterId?: number): LeaveWithDetails[] {
  const db = getDb();

  let whereClause = "WHERE lr.student_id = ?";
  const params: (string | number)[] = [studentId];

  if (semesterId) {
    whereClause += " AND lr.semester_id = ?";
    params.push(semesterId);
  }

  const leaves = db
    .prepare(`
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
    `)
    .all(...params) as LeaveWithDetails[];

  return leaves;
}

/**
 * 重新计算所有请假记录的退费金额
 * 使用新的费用配置
 * 优化：使用单条 SQL 批量更新，避免 N+1 查询问题
 */
export function recalculateAllLeaveRefunds(): { updated: number; message: string } {
  const db = getDb();

  // 使用单条 SQL 批量更新所有记录，避免 N+1 查询问题
  const result = db
    .prepare(`
      UPDATE leave_records
      SET refund_amount =
        CASE
          WHEN s.is_nutrition_meal = 1 THEN NULL
          ELSE leave_records.leave_days * COALESCE(fc.meal_fee_standard, 0)
        END,
        updated_at = CURRENT_TIMESTAMP
      FROM leave_records
      LEFT JOIN students s ON leave_records.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = leave_records.semester_id
      WHERE leave_records.is_refund = 1
    `)
    .run();

  return {
    updated: result.changes,
    message: `已更新 ${result.changes} 条请假记录的退费金额`,
  };
}

/**
 * 更新请假记录
 */
export function updateLeave(
  id: number,
  input: LeaveInput
): { success: boolean; message?: string } {
  const db = getDb();

  // 从系统配置获取最小请假天数
  const minLeaveDays = getNumberConfig("leave.min_days", 3);

  // 验证请假天数必须大于最小天数
  if (input.leave_days <= minLeaveDays) {
    return { success: false, message: `请假天数必须大于${minLeaveDays}天` };
  }

  // 检查请假记录是否存在
  const existingLeave = db
    .prepare(
      `SELECT lr.*, s.is_nutrition_meal, c.id as class_id
       FROM leave_records lr
       LEFT JOIN students s ON lr.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE lr.id = ?`
    )
    .get(id) as
    | {
        id: number;
        status: string;
        student_id: number;
        semester_id: number;
        is_nutrition_meal: number;
        class_id: number;
      }
    | undefined;

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
  const student = db
    .prepare(
      `SELECT s.id, s.is_nutrition_meal, s.class_id,
              c.id as class_id_check, c.semester_id as class_semester_id,
              fc.meal_fee_standard
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN fee_configs fc ON c.id = fc.class_id AND fc.semester_id = ?
       WHERE s.id = ?`
    )
    .get(input.semester_id, input.student_id) as
    | {
        id: number;
        is_nutrition_meal: number;
        class_id: number;
        class_id_check: number | null;
        class_semester_id: number | null;
        meal_fee_standard: number | null;
      }
    | undefined;

  if (!student) {
    return { success: false, message: "学生不存在" };
  }

  // 获取学期信息验证学期总天数
  const semester = db
    .prepare("SELECT school_days FROM semesters WHERE id = ?")
    .get(input.semester_id) as { school_days: number } | undefined;

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
  const isNutritionMeal = student.is_nutrition_meal === 1;
  const mealFeeStandard = student.meal_fee_standard ?? 0;
  const refundAmount = isNutritionMeal ? 0 : input.leave_days * mealFeeStandard;

  // 构建更新 SQL，根据是否包含状态字段来决定更新哪些列
  if (newStatus) {
    // 包含状态更新 - 需要清除审核信息
    db.prepare(
      `UPDATE leave_records
       SET student_id = ?, semester_id = ?, start_date = ?, end_date = ?,
           leave_days = ?, reason = ?, status = ?, is_refund = ?, refund_amount = ?,
           reviewer_id = NULL, review_time = NULL, review_remark = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      input.student_id,
      input.semester_id,
      input.start_date,
      input.end_date,
      input.leave_days,
      input.reason,
      newStatus,
      isNutritionMeal ? 0 : 1,
      isNutritionMeal ? null : refundAmount,
      id
    );
  } else {
    // 不包含状态更新
    db.prepare(
      `UPDATE leave_records
       SET student_id = ?, semester_id = ?, start_date = ?, end_date = ?,
           leave_days = ?, reason = ?, is_refund = ?, refund_amount = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      input.student_id,
      input.semester_id,
      input.start_date,
      input.end_date,
      input.leave_days,
      input.reason,
      isNutritionMeal ? 0 : 1,
      isNutritionMeal ? null : refundAmount,
      id
    );
  }

  return { success: true };
}

/**
 * 根据学生信息获取学生ID和学期ID
 * 验证学生是否存在以及班级学期关联是否正确
 */
export function getStudentIdByInfo(
  studentNo: string,
  studentName: string,
  semesterName: string,
  gradeName: string,
  className: string
): { student_id?: number; semester_id?: number; error?: string } {
  const db = getDb();

  // 查找学期
  const semester = db
    .prepare("SELECT id FROM semesters WHERE name = ?")
    .get(semesterName) as { id: number } | undefined;

  if (!semester) {
    return { error: `学期"${semesterName}"不存在` };
  }

  // 查找班级
  const classInfo = db
    .prepare(`
      SELECT c.id, c.semester_id
      FROM classes c
      LEFT JOIN grades g ON c.grade_id = g.id
      WHERE c.semester_id = ? AND g.name = ? AND c.name = ?
    `)
    .get(semester.id, gradeName, className) as
    | { id: number; semester_id: number }
    | undefined;

  if (!classInfo) {
    return { error: `在学期"${semesterName}"中未找到"${gradeName}${className}"` };
  }

  // 查找学生
  const student = db
    .prepare("SELECT id FROM students WHERE student_no = ? AND name = ? AND class_id = ?")
    .get(studentNo, studentName, classInfo.id) as { id: number } | undefined;

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
export function batchCreateLeaves(
  leaves: LeaveInput[],
  applicantId: number
): { created: number; failed: number; errors: Array<{ row: number; message: string }> } {
  const db = getDb();

  // 使用事务确保数据一致性
  const transaction = db.transaction((leaves: LeaveInput[]) => {
    const results = {
      created: 0,
      failed: 0,
      errors: [] as Array<{ row: number; message: string }>,
    };

    for (let i = 0; i < leaves.length; i++) {
      const leave = leaves[i];
      const rowNum = i + 1;

      // 调用现有的创建请假函数
      const result = createLeave(leave, applicantId);

      if (result.success) {
        results.created++;
      } else {
        results.failed++;
        results.errors.push({
          row: rowNum,
          message: result.message || "创建失败",
        });
      }
    }

    return results;
  });

  return transaction(leaves);
}
