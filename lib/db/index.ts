import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { hashPassword } from "@/lib/utils/crypto";

// 数据库文件路径
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "student_leave.db");

// 确保数据目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 数据库连接单例
let db: Database.Database | null = null;

/**
 * 获取数据库连接
 */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    // 启用外键约束
    db.pragma("foreign_keys = ON");
    // 设置 WAL 模式以提高性能
    db.pragma("journal_mode = WAL");
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 初始化数据库（创建表）
 */
export function initDatabase(): void {
  const db = getDb();

  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      real_name VARCHAR(50) NOT NULL,
      role VARCHAR(20) NOT NULL,
      phone VARCHAR(20),
      email VARCHAR(100),
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 学期表
  db.exec(`
    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      school_days INTEGER NOT NULL,
      is_current BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 年级表
  db.exec(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(20) NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 班级表
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade_id INTEGER NOT NULL,
      name VARCHAR(20) NOT NULL,
      class_teacher_id INTEGER,
      meal_fee DECIMAL(10,2) NOT NULL,
      student_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grade_id) REFERENCES grades(id),
      FOREIGN KEY (class_teacher_id) REFERENCES users(id)
    )
  `);

  // 学生表
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_no VARCHAR(30) UNIQUE NOT NULL,
      name VARCHAR(50) NOT NULL,
      gender VARCHAR(10),
      class_id INTEGER NOT NULL,
      birth_date DATE,
      parent_name VARCHAR(50),
      parent_phone VARCHAR(20),
      address TEXT,
      is_nutrition_meal BOOLEAN DEFAULT 0,
      enrollment_date DATE,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id)
    )
  `);

  // 请假记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      semester_id INTEGER NOT NULL,
      applicant_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      leave_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      reviewer_id INTEGER,
      review_time DATETIME,
      review_remark TEXT,
      is_refund BOOLEAN DEFAULT 1,
      refund_amount DECIMAL(10,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (semester_id) REFERENCES semesters(id),
      FOREIGN KEY (applicant_id) REFERENCES users(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    )
  `);

  // 系统配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key VARCHAR(50) UNIQUE NOT NULL,
      config_value TEXT,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 操作日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action VARCHAR(50) NOT NULL,
      module VARCHAR(50) NOT NULL,
      description TEXT,
      ip_address VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
    CREATE INDEX IF NOT EXISTS idx_students_student_no ON students(student_no);
    CREATE INDEX IF NOT EXISTS idx_leave_records_student ON leave_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_leave_records_semester ON leave_records(semester_id);
    CREATE INDEX IF NOT EXISTS idx_leave_records_status ON leave_records(status);
    CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade_id);
    CREATE INDEX IF NOT EXISTS idx_logs_user ON operation_logs(user_id);
  `);

  console.log("Database initialized successfully");
}

/**
 * 创建初始管理员用户
 */
export async function seedAdminUser(): Promise<void> {
  const db = getDb();

  // 检查是否已有用户
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

  if (userCount.count === 0) {
    // 创建默认管理员账号
    const passwordHash = await hashPassword("admin123");
    db.prepare(
      `INSERT INTO users (username, password_hash, real_name, role, is_active)
       VALUES (?, ?, ?, ?, ?)`
    ).run("admin", passwordHash, "系统管理员", "admin", 1);

    console.log("Default admin user created: username=admin, password=admin123");
  }
}

/**
 * 运行数据库迁移
 */
export async function runMigrations(): Promise<void> {
  // 这里可以添加数据库版本迁移逻辑
  // 目前只需初始化数据库
  initDatabase();

  // 创建初始管理员用户
  await seedAdminUser();
}

// 在开发环境中，当模块加载时自动初始化数据库
if (process.env.NODE_ENV === "development") {
  runMigrations().catch(console.error);
}
