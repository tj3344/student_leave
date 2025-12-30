import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "./lib/db/schema",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL || "postgresql://localhost:5432/student_leave",
  },
  verbose: true,
  strict: true,
});
