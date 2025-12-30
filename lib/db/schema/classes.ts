import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { semesters } from "./semesters";
import { grades } from "./grades";
import { users } from "./users";

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  gradeId: integer("grade_id").notNull().references(() => grades.id),
  name: text("name").notNull(),
  classTeacherId: integer("class_teacher_id").references(() => users.id),
  mealFee: text("meal_fee").notNull(),
  studentCount: integer("student_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Types
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
