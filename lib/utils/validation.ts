import { z } from "zod";

// ============================================
// 用户相关验证
// ============================================

export const loginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const userCreateSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符").max(50, "用户名最多50个字符"),
  password: z.string().min(6, "密码至少6个字符").max(100, "密码最多100个字符"),
  real_name: z.string().min(1, "姓名不能为空").max(50, "姓名最多50个字符"),
  role: z.enum(["admin", "teacher", "class_teacher"], {
    errorMap: () => ({ message: "无效的角色" }),
  }),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号").optional().or(z.literal("")),
  email: z.string().email("请输入有效的邮箱").optional().or(z.literal("")),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  real_name: z.string().min(1, "姓名不能为空").max(50, "姓名最多50个字符").optional(),
  role: z.enum(["admin", "teacher", "class_teacher"], {
    errorMap: () => ({ message: "无效的角色" }),
  }).optional(),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, "请输入有效的手机号")
    .optional()
    .or(z.literal("")),
  email: z.string().email("请输入有效的邮箱").optional().or(z.literal("")),
  is_active: z.number().int().min(0).max(1).optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "原密码不能为空"),
    newPassword: z.string().min(6, "新密码至少6个字符").max(100, "新密码最多100个字符"),
    confirmPassword: z.string().min(1, "确认密码不能为空"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================
// 学生相关验证
// ============================================

export const studentCreateSchema = z.object({
  student_no: z.string().min(1, "学号不能为空").max(30, "学号最多30个字符"),
  name: z.string().min(1, "姓名不能为空").max(50, "姓名最多50个字符"),
  gender: z.enum(["男", "女"], { errorMap: () => ({ message: "性别只能是男或女" }) }).optional(),
  class_id: z.number().int().positive("请选择班级"),
  birth_date: z.string().optional().or(z.literal("")),
  parent_name: z.string().max(50, "家长姓名最多50个字符").optional().or(z.literal("")),
  parent_phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, "请输入有效的手机号")
    .optional()
    .or(z.literal("")),
  address: z.string().max(200, "地址最多200个字符").optional().or(z.literal("")),
  is_nutrition_meal: z.boolean().optional(),
  enrollment_date: z.string().optional().or(z.literal("")),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;

export const studentUpdateSchema = z.object({
  student_no: z.string().min(1, "学号不能为空").max(30, "学号最多30个字符").optional(),
  name: z.string().min(1, "姓名不能为空").max(50, "姓名最多50个字符").optional(),
  gender: z.enum(["男", "女"], { errorMap: () => ({ message: "性别只能是男或女" }) }).optional(),
  class_id: z.number().int().positive("请选择班级").optional(),
  birth_date: z.string().optional().or(z.literal("")),
  parent_name: z.string().max(50, "家长姓名最多50个字符").optional().or(z.literal("")),
  parent_phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, "请输入有效的手机号")
    .optional()
    .or(z.literal("")),
  address: z.string().max(200, "地址最多200个字符").optional().or(z.literal("")),
  is_nutrition_meal: z.boolean().optional(),
  enrollment_date: z.string().optional().or(z.literal("")),
  is_active: z.number().int().min(0).max(1).optional(),
});

export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

// ============================================
// 请假相关验证
// ============================================

export const leaveCreateSchema = z
  .object({
    student_id: z.number().int().positive("请选择学生"),
    semester_id: z.number().int().positive("请选择学期"),
    start_date: z.string().min(1, "开始日期不能为空"),
    end_date: z.string().min(1, "结束日期不能为空"),
    reason: z.string().min(1, "请假原因不能为空").max(500, "请假原因最多500个字符"),
  })
  .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: "结束日期必须大于或等于开始日期",
    path: ["end_date"],
  });

export type LeaveCreateInput = z.infer<typeof leaveCreateSchema>;

export const leaveReviewSchema = z.object({
  status: z.enum(["approved", "rejected"], {
    errorMap: () => ({ message: "无效的审核状态" }),
  }),
  review_remark: z.string().max(200, "审核备注最多200个字符").optional().or(z.literal("")),
});

export type LeaveReviewInput = z.infer<typeof leaveReviewSchema>;

// ============================================
// 学期相关验证
// ============================================

export const semesterCreateSchema = z
  .object({
    name: z.string().min(1, "学期名称不能为空").max(50, "学期名称最多50个字符"),
    start_date: z.string().min(1, "开始日期不能为空"),
    end_date: z.string().min(1, "结束日期不能为空"),
    school_days: z.number().int().positive("在校天数必须大于0"),
  })
  .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: "结束日期必须大于或等于开始日期",
    path: ["end_date"],
  });

export type SemesterCreateInput = z.infer<typeof semesterCreateSchema>;

// ============================================
// 年级相关验证
// ============================================

export const gradeCreateSchema = z.object({
  name: z.string().min(1, "年级名称不能为空").max(20, "年级名称最多20个字符"),
  sort_order: z.number().int().min(0).optional(),
});

export type GradeCreateInput = z.infer<typeof gradeCreateSchema>;

// ============================================
// 班级相关验证
// ============================================

export const classCreateSchema = z.object({
  grade_id: z.number().int().positive("请选择年级"),
  name: z.string().min(1, "班级名称不能为空").max(20, "班级名称最多20个字符"),
  class_teacher_id: z.number().int().positive().optional(),
  meal_fee: z.number().positive("伙食费必须大于0"),
});

export type ClassCreateInput = z.infer<typeof classCreateSchema>;

// ============================================
// 分页验证
// ============================================

export const paginationSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  search: z.string().max(100).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
