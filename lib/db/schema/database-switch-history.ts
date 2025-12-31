import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { databaseConnections } from "./database-connections";
import { users } from "./users";

/**
 * 数据库切换历史表
 * 记录数据库切换操作的详细信息
 */
export const databaseSwitchHistory = pgTable("database_switch_history", {
  id: serial("id").primaryKey(),
  // 源数据库连接 ID
  fromConnectionId: integer("from_connection_id").references(() => databaseConnections.id),
  // 目标数据库连接 ID
  toConnectionId: integer("to_connection_id").references(() => databaseConnections.id).notNull(),
  // 切换类型（switch/rollback）
  switchType: varchar("switch_type", { length: 20 }).notNull(),
  // 状态（success/failed/rollback）
  status: varchar("status", { length: 20 }).notNull(),
  // 备份文件路径
  backupFilePath: text("backup_file_path"),
  // 错误信息
  errorMessage: text("error_message"),
  // 已迁移表列表（JSON 格式）
  migratedTables: text("migrated_tables"),
  // 迁移详情（JSON 格式）
  migrationDetails: text("migration_details"),
  // 操作人
  switchedBy: integer("switched_by").references(() => users.id),
  // 创建时间（开始时间）
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // 完成时间
  completedAt: timestamp("completed_at"),
});

// 导出类型
export type DatabaseSwitchHistory = typeof databaseSwitchHistory.$inferSelect;
export type NewDatabaseSwitchHistory = typeof databaseSwitchHistory.$inferInsert;
