import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { classes } from "./classes";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentNo: text("student_no").notNull().unique(),
  name: text("name").notNull(),
  gender: text("gender"),
  classId: integer("class_id").notNull().references(() => classes.id),
  birthDate: text("birth_date"),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  address: text("address"),
  isNutritionMeal: boolean("is_nutrition_meal").notNull().default(false),
  enrollmentDate: text("enrollment_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Types
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
