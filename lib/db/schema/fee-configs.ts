import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { classes } from "./classes";
import { semesters } from "./semesters";

export const feeConfigs = pgTable("fee_configs", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  mealFeeStandard: text("meal_fee_standard").notNull(),
  prepaidDays: integer("prepaid_days").notNull().default(0),
  actualDays: integer("actual_days").notNull().default(0),
  suspensionDays: integer("suspension_days").notNull().default(0),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}, (table) => ({
  unq: unique().on(table.classId, table.semesterId),
}));

// Types
export type FeeConfig = typeof feeConfigs.$inferSelect;
export type NewFeeConfig = typeof feeConfigs.$inferInsert;
