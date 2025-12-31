import { pgTable, serial, varchar, boolean, text, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * 数据库连接配置表
 * 用于管理多个 PostgreSQL 数据库连接
 */
export const databaseConnections = pgTable("database_connections", {
  id: serial("id").primaryKey(),
  // 连接配置名称（如：生产库、测试库）
  name: varchar("name", { length: 100 }).notNull(),
  // 加密后的连接字符串
  connectionStringEncrypted: text("connection_string_encrypted").notNull(),
  // 环境类型（production/staging/development）
  environment: varchar("environment", { length: 50 }).notNull(),
  // 是否为当前活动数据库
  isActive: boolean("is_active").notNull().default(false),
  // 描述信息
  description: text("description"),
  // 创建人
  createdBy: integer("created_by").references(() => users.id),
  // 创建时间
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // 更新时间
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // 最后切换时间
  lastSwitchedAt: timestamp("last_switched_at"),
  // 最后切换人
  lastSwitchedBy: integer("last_switched_by").references(() => users.id),
  // 连接测试状态（success/failed/pending）
  connectionTestStatus: varchar("connection_test_status", { length: 20 }),
  // 连接测试消息
  connectionTestMessage: text("connection_test_message"),
  // 连接测试时间
  connectionTestAt: timestamp("connection_test_at"),
});

// 导出类型
export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type NewDatabaseConnection = typeof databaseConnections.$inferInsert;
