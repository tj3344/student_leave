// ============================================
// 角色常量
// ============================================

export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  CLASS_TEACHER: "class_teacher",
} as const;

export const ROLE_NAMES = {
  admin: "管理员",
  teacher: "教师",
  class_teacher: "班主任",
} as const;

// ============================================
// 请假状态常量
// ============================================

export const LEAVE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const LEAVE_STATUS_NAMES = {
  pending: "待审核",
  approved: "已批准",
  rejected: "已拒绝",
} as const;

export const LEAVE_STATUS_COLORS = {
  pending: "yellow",
  approved: "green",
  rejected: "red",
} as const;

// ============================================
// 性别常量
// ============================================

export const GENDERS = {
  MALE: "男",
  FEMALE: "女",
} as const;

// ============================================
// 分页常量
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============================================
// 会话相关常量
// ============================================

export const SESSION = {
  COOKIE_NAME: "student_leave_session",
  MAX_AGE: 7 * 24 * 60 * 60, // 7 天
} as const;

// ============================================
// 文件上传常量
// ============================================

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [".xlsx", ".xls"],
} as const;

// ============================================
// 权限常量
// ============================================

export const PERMISSIONS = {
  // 用户管理
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_IMPORT: "user:import",
  USER_EXPORT: "user:export",

  // 学生管理
  STUDENT_CREATE: "student:create",
  STUDENT_READ: "student:read",
  STUDENT_UPDATE: "student:update",
  STUDENT_DELETE: "student:delete",
  STUDENT_IMPORT: "student:import",
  STUDENT_EXPORT: "student:export",

  // 请假管理
  LEAVE_CREATE: "leave:create",
  LEAVE_READ: "leave:read",
  LEAVE_APPROVE: "leave:approve",
  LEAVE_REJECT: "leave:reject",
  LEAVE_EXPORT: "leave:export",
  LEAVE_IMPORT: "leave:import",

  // 班级管理
  CLASS_CREATE: "class:create",
  CLASS_READ: "class:read",
  CLASS_UPDATE: "class:update",
  CLASS_DELETE: "class:delete",
  CLASS_IMPORT: "class:import",
  CLASS_EXPORT: "class:export",

  // 年级管理
  GRADE_CREATE: "grade:create",
  GRADE_READ: "grade:read",
  GRADE_UPDATE: "grade:update",
  GRADE_DELETE: "grade:delete",

  // 学期管理
  SEMESTER_CREATE: "semester:create",
  SEMESTER_READ: "semester:read",
  SEMESTER_UPDATE: "semester:update",
  SEMESTER_DELETE: "semester:delete",

  // 退费管理
  REFUND_READ: "refund:read",
  REFUND_EXPORT: "refund:export",

  // 费用管理
  FEE_READ: "fee:read",
  FEE_CREATE: "fee:create",
  FEE_UPDATE: "fee:update",
  FEE_DELETE: "fee:delete",
  FEE_IMPORT: "fee:import",
  FEE_EXPORT: "fee:export",

  // 系统管理
  SYSTEM_CONFIG_READ: "system:config:read",
  SYSTEM_CONFIG: "system:config",
  SYSTEM_BACKUP: "system:backup",
  SYSTEM_RESTORE: "system:restore",
  SYSTEM_LOGS: "system:logs",
} as const;

// 角色权限映射
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: Object.values(PERMISSIONS),
  teacher: [
    PERMISSIONS.STUDENT_READ,
    PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.SEMESTER_READ,
    PERMISSIONS.SYSTEM_CONFIG_READ,
  ],
  class_teacher: [
    PERMISSIONS.STUDENT_READ,
    PERMISSIONS.LEAVE_READ,
    PERMISSIONS.CLASS_READ,
    PERMISSIONS.SEMESTER_READ,
    PERMISSIONS.REFUND_READ,
    PERMISSIONS.SYSTEM_CONFIG_READ,
  ],
};

/**
 * 检查角色是否有指定权限
 */
export function hasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * 检查角色是否有任一权限
 */
export function hasAnyPermission(role: string, permissions: string[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some((p) => rolePermissions.includes(p));
}
