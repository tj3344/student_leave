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
  meal_fee: number;
  student_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClassInput {
  semester_id: number;
  grade_id: number;
  name: string;
  class_teacher_id?: number;
  meal_fee: number;
}

export interface ClassWithDetails extends Class {
  grade_name?: string;
  class_teacher_name?: string;
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
