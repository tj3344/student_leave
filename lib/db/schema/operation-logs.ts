import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const operationLogs = pgTable("operation_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  module: text("module").notNull(),
  description: text("description"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull(),
});

// Types
export type OperationLog = typeof operationLogs.$inferSelect;
export type NewOperationLog = typeof operationLogs.$inferInsert;
