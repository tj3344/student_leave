import { pgTable, serial, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { classes } from "./classes";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentNo: text("student_no").notNull(),
  name: text("name").notNull(),
  gender: text("gender"),
  classId: integer("class_id").notNull().references(() => classes.id),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  address: text("address"),
  isNutritionMeal: boolean("is_nutrition_meal").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}, (table) => ({
  // 确保同一个班级内学号唯一，允许同一学号在不同学期存在
  uniqueClassStudentNo: unique("unique_class_student_no").on(table.classId, table.studentNo),
}));

// Types
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
