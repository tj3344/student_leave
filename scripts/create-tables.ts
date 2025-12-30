/**
 * 直接创建 PostgreSQL 表结构
 * 从 drizzle-kit 生成的 SQL 执行创建
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env" });

const { POSTGRES_URL } = process.env;

if (!POSTGRES_URL) {
  throw new Error("POSTGRES_URL 环境变量未设置");
}

async function createTables(): Promise<void> {
  const sql = postgres(POSTGRES_URL as string);

  try {
    console.log("🔨 创建 PostgreSQL 表结构...\n");

    // 创建所有表
    await sql.unsafe(`
      CREATE TABLE "users" (
        "id" serial PRIMARY KEY NOT NULL,
        "username" text NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "real_name" text NOT NULL,
        "role" text NOT NULL,
        "phone" text,
        "email" text,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "semesters" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "start_date" text NOT NULL,
        "end_date" text NOT NULL,
        "school_days" integer NOT NULL,
        "is_current" boolean DEFAULT false NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "grades" (
        "id" serial PRIMARY KEY NOT NULL,
        "semester_id" integer NOT NULL REFERENCES "semesters"("id"),
        "name" text NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "classes" (
        "id" serial PRIMARY KEY NOT NULL,
        "semester_id" integer NOT NULL REFERENCES "semesters"("id"),
        "grade_id" integer NOT NULL REFERENCES "grades"("id"),
        "name" text NOT NULL,
        "class_teacher_id" integer REFERENCES "users"("id"),
        "meal_fee" text NOT NULL,
        "student_count" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "students" (
        "id" serial PRIMARY KEY NOT NULL,
        "student_no" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "gender" text,
        "class_id" integer NOT NULL REFERENCES "classes"("id"),
        "birth_date" text,
        "parent_name" text,
        "parent_phone" text,
        "address" text,
        "is_nutrition_meal" boolean DEFAULT false NOT NULL,
        "enrollment_date" text,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "leave_records" (
        "id" serial PRIMARY KEY NOT NULL,
        "student_id" integer NOT NULL REFERENCES "students"("id"),
        "semester_id" integer NOT NULL REFERENCES "semesters"("id"),
        "applicant_id" integer NOT NULL REFERENCES "users"("id"),
        "start_date" text NOT NULL,
        "end_date" text NOT NULL,
        "leave_days" integer NOT NULL,
        "reason" text NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "reviewer_id" integer REFERENCES "users"("id"),
        "review_time" timestamp,
        "review_remark" text,
        "is_refund" boolean DEFAULT true NOT NULL,
        "refund_amount" text,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "system_config" (
        "id" serial PRIMARY KEY NOT NULL,
        "config_key" text NOT NULL UNIQUE,
        "config_value" text,
        "description" text,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "operation_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer REFERENCES "users"("id"),
        "action" text NOT NULL,
        "module" text NOT NULL,
        "description" text,
        "ip_address" text,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "fee_configs" (
        "id" serial PRIMARY KEY NOT NULL,
        "class_id" integer NOT NULL REFERENCES "classes"("id"),
        "semester_id" integer NOT NULL REFERENCES "semesters"("id"),
        "meal_fee_standard" text NOT NULL,
        "prepaid_days" integer DEFAULT 0 NOT NULL,
        "actual_days" integer DEFAULT 0 NOT NULL,
        "suspension_days" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("class_id", "semester_id")
      );

      CREATE TABLE "backup_records" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "type" text NOT NULL,
        "modules" text NOT NULL,
        "file_path" text NOT NULL,
        "file_size" integer NOT NULL,
        "created_by" integer NOT NULL REFERENCES "users"("id"),
        "description" text,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "backup_config" (
        "id" serial PRIMARY KEY NOT NULL,
        "enabled" boolean DEFAULT false NOT NULL,
        "schedule_type" text NOT NULL,
        "schedule_time" text NOT NULL,
        "backup_type" text NOT NULL,
        "modules" text NOT NULL,
        "retention_days" integer DEFAULT 30 NOT NULL,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ 表结构创建成功！");

    await sql.end();
  } catch (error: any) {
    console.error("❌ 创建表失败:", error.message);
    await sql.end();
    process.exit(1);
  }
}

createTables().catch(console.error);
