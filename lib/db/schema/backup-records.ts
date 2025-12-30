import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const backupRecords = pgTable("backup_records", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  modules: text("modules").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  description: text("description"),
  createdAt: timestamp("created_at").notNull(),
});

// Types
export type BackupRecord = typeof backupRecords.$inferSelect;
export type NewBackupRecord = typeof backupRecords.$inferInsert;
