import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const semesters = pgTable("semesters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  schoolDays: integer("school_days").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Types
export type Semester = typeof semesters.$inferSelect;
export type NewSemester = typeof semesters.$inferInsert;
