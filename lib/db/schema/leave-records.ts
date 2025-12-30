import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { students } from "./students";
import { semesters } from "./semesters";
import { users } from "./users";

export const leaveRecords = pgTable("leave_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  applicantId: integer("applicant_id").notNull().references(() => users.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  leaveDays: integer("leave_days").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  reviewerId: integer("reviewer_id").references(() => users.id),
  reviewTime: timestamp("review_time"),
  reviewRemark: text("review_remark"),
  isRefund: boolean("is_refund").notNull().default(true),
  refundAmount: text("refund_amount"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Types
export type LeaveRecord = typeof leaveRecords.$inferSelect;
export type NewLeaveRecord = typeof leaveRecords.$inferInsert;
