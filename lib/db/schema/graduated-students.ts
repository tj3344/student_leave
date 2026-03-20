import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * 毕业学生表
 *
 * 用于存储已毕业学生的完整信息，包含原始学生信息的快照。
 * 当学生从六年级毕业时，其数据会从 students 表复制到此表。
 */
export const graduatedStudents = pgTable("graduated_students", {
  // 主键
  id: serial("id").primaryKey(),

  // 学生基本信息（保留原始数据）
  studentNo: text("student_no").notNull(),
  name: text("name").notNull(),
  gender: text("gender"),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  address: text("address"),
  isNutritionMeal: boolean("is_nutrition_meal").notNull().default(false),
  enrollmentDate: text("enrollment_date"),

  // 毕业相关信息
  originalStudentId: integer("original_student_id").notNull(),
  graduationDate: timestamp("graduation_date").notNull(),

  // 原班级和学期信息（快照）
  originalClassId: integer("original_class_id").notNull(),
  originalClassName: text("original_class_name").notNull(),
  originalGradeId: integer("original_grade_id").notNull(),
  originalGradeName: text("original_grade_name").notNull(),
  originalSemesterId: integer("original_semester_id").notNull(),
  originalSemesterName: text("original_semester_name").notNull(),

  // 原班主任信息（快照）
  originalClassTeacherId: integer("original_class_teacher_id"),
  originalClassTeacherName: text("original_class_teacher_name"),

  // 时间戳
  createdAt: timestamp("created_at").notNull(),
});

// Types
export type GraduatedStudent = typeof graduatedStudents.$inferSelect;
export type NewGraduatedStudent = typeof graduatedStudents.$inferInsert;
