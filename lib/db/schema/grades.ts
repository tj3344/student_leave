import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { semesters } from "./semesters";

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull(),
});

// Types
export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;
