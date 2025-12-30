import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const backupConfig = pgTable("backup_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  scheduleType: text("schedule_type").notNull(),
  scheduleTime: text("schedule_time").notNull(),
  backupType: text("backup_type").notNull(),
  modules: text("modules").notNull(),
  retentionDays: integer("retention_days").notNull().default(30),
  updatedAt: timestamp("updated_at").notNull(),
});

// Types
export type BackupConfig = typeof backupConfig.$inferSelect;
export type NewBackupConfig = typeof backupConfig.$inferInsert;
