// ============================================
// 用户相关类型
// ============================================

export type UserRole = "admin" | "teacher" | "class_teacher";

export interface User {
  id: number;
  username: string;
  password_hash: string;
  real_name: string;
  role: UserRole;
  phone?: string;
  email?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface UserInput {
  username: string;
  password: string;
  real_name: string;
  role: UserRole;
  phone?: string;
  email?: string;
}

export interface UserUpdate {
  real_name?: string;
  role?: UserRole;
  phone?: string;
  email?: string;
  is_active?: number;
}

// 用户导入行类型（Excel 解析后）
export interface UserImportRow {
  username: string;            // 用户名
  password?: string;           // 密码
  real_name: string;           // 真实姓名
  role: UserRole;              // 角色
  phone?: string;              // 电话
  email?: string;              // 邮箱
}

// 用户导入结果类型
export interface UserImportResult {
  row: number;                 // 行号
  success: boolean;            // 是否成功
  message?: string;            // 消息
  data?: UserInput;            // 处理后的数据
}

// ============================================
// 学期相关类型
// ============================================

export interface Semester {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  school_days: number;
  is_current: number;
  created_at: string;
  updated_at: string;
}

export interface SemesterInput {
  name: string;
  start_date: string;
  end_date: string;
  school_days: number;
}

// ============================================
// 年级相关类型
// ============================================

export interface Grade {
  id: number;
  semester_id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface GradeInput {
  semester_id: number;
  name: string;
  sort_order?: number;
}

// ============================================
// 班级相关类型
// ============================================

export interface Class {
  id: number;
  semester_id: number;
  grade_id: number;
  name: string;
  class_teacher_id?: number;
  student_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClassInput {
  semester_id: number;
  grade_id: number;
  name: string;
  class_teacher_id?: number;
}

export interface ClassWithDetails extends Class {
  grade_name?: string;
  class_teacher_name?: string;
}

// 班级导入行类型（Excel 解析后）
export interface ClassImportRow {
  semester_name: string;          // 学期名称
  grade_name: string;             // 年级名称
  name: string;                   // 班级名称
  class_teacher_name?: string;    // 班主任姓名（可选）
}

// 班级导入结果类型
export interface ClassImportResult {
  row: number;                    // 行号
  success: boolean;               // 是否成功
  message?: string;               // 消息
  data?: ClassInput;              // 处理后的数据
}

// ============================================
// 学生相关类型
// ============================================

export interface Student {
  id: number;
  student_no: string;
  name: string;
  gender?: string;
  class_id: number;
  birth_date?: string;
  parent_name?: string;
  parent_phone?: string;
  address?: string;
  is_nutrition_meal: number;
  enrollment_date?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface StudentInput {
  student_no: string;
  name: string;
  gender?: string;
  class_id: number;
  birth_date?: string;
  parent_name?: string;
  parent_phone?: string;
  address?: string;
  is_nutrition_meal?: number;
  enrollment_date?: string;
}

export interface StudentWithDetails extends Student {
  class_name?: string;
  grade_name?: string;
  nutrition_meal_name?: string;
}

// 学生导入行类型（Excel 解析后）
export interface StudentImportRow {
  student_no: string;          // 学号
  name: string;                // 学生姓名
  gender?: string;             // 性别
  semester_name: string;       // 学期名称
  grade_name: string;          // 年级名称
  class_name: string;          // 班级名称
  birth_date?: string;         // 出生日期
  parent_name?: string;        // 家长姓名
  parent_phone?: string;       // 家长电话
  address?: string;            // 家庭住址
  is_nutrition_meal?: string;  // 是否营养餐（是/否）
  enrollment_date?: string;    // 入学日期
}

// 学生导入结果类型
export interface StudentImportResult {
  row: number;                 // 行号
  success: boolean;            // 是否成功
  message?: string;            // 消息
  data?: StudentInput;         // 处理后的数据
}

// ============================================
// 请假相关类型
// ============================================

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRecord {
  id: number;
  student_id: number;
  semester_id: number;
  applicant_id: number;
  start_date: string;
  end_date: string;
  leave_days: number;
  reason: string;
  status: LeaveStatus;
  reviewer_id?: number;
  review_time?: string;
  review_remark?: string;
  is_refund: number;
  refund_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveInput {
  student_id: number;
  semester_id: number;
  start_date: string;
  end_date: string;
  reason: string;
}

export interface LeaveReview {
  status: "approved" | "rejected";
  review_remark?: string;
}

export interface LeaveWithDetails extends LeaveRecord {
  student_name?: string;
  student_no?: string;
  class_name?: string;
  applicant_name?: string;
  reviewer_name?: string;
  semester_name?: string;
  is_nutrition_meal?: number;
}

// ============================================
// 系统配置相关类型
// ============================================

export interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  description?: string;
  updated_at: string;
}

// ============================================
// 操作日志相关类型
// ============================================

export interface OperationLog {
  id: number;
  user_id?: number;
  action: string;
  module: string;
  description?: string;
  ip_address?: string;
  created_at: string;
}

export interface OperationLogInput {
  user_id?: number;
  action: string;
  module: string;
  description?: string;
  ip_address?: string;
}

// ============================================
// 分页相关类型
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// 退费相关类型
// ============================================

export interface RefundSummary {
  student_id: number;
  student_name: string;
  student_no: string;
  class_name: string;
  total_leave_days: number;
  refund_amount: number;
}

export interface ClassRefundSummary {
  class_id: number;
  class_name: string;
  total_students: number;
  total_leave_days: number;
  total_refund_amount: number;
}

// ============================================
// 费用管理相关类型
// ============================================

export interface FeeConfig {
  id: number;
  class_id: number;
  semester_id: number;
  meal_fee_standard: number;
  prepaid_days: number;
  actual_days: number;
  suspension_days: number;
  created_at: string;
  updated_at: string;
}

export interface FeeConfigInput {
  class_id: number;
  semester_id: number;
  meal_fee_standard: number;
  prepaid_days: number;
  actual_days: number;
  suspension_days: number;
}

export interface FeeConfigWithDetails extends FeeConfig {
  class_name?: string;
  grade_name?: string;
  semester_name?: string;
  class_teacher_name?: string;
}

// 学生退费记录
export interface StudentRefundRecord {
  student_id: number;
  student_name: string;
  student_no: string;
  class_name: string;
  grade_name: string;
  is_nutrition_meal: number;
  leave_days: number;
  prepaid_days: number;
  actual_days: number;
  suspension_days: number;
  meal_fee_standard: number;
  refund_amount: number;
}

// 班级退费汇总
export interface ClassRefundSummaryFull {
  class_id: number;
  class_name: string;
  grade_name: string;
  class_teacher_name?: string;
  meal_fee_standard: number;
  prepaid_days: number;
  actual_days: number;
  suspension_days: number;
  total_leave_days: number;
  student_count: number;
  refund_students_count: number;
  total_refund_amount: number;
}

// 费用配置导入行类型（Excel 解析后）
export interface FeeConfigImportRow {
  semester_name: string;          // 学期名称*
  grade_name: string;             // 年级名称*
  class_name: string;             // 班级名称*
  meal_fee_standard: string;      // 餐费标准*
  prepaid_days: string;           // 预收天数*
  actual_days: string;            // 实收天数*
  suspension_days: string;        // 停课天数*
}

// 费用配置导入结果类型
export interface FeeConfigImportResult {
  row: number;                    // 行号
  success: boolean;               // 是否成功
  message?: string;               // 消息
  data?: FeeConfigInput;          // 处理后的数据
}
