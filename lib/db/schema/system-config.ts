import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  configKey: text("config_key").notNull().unique(),
  configValue: text("config_value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull(),
});

// Types
export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;
