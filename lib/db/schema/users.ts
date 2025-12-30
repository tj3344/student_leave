import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  realName: text("real_name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
