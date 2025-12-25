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
      semester_id INTEGER NOT NULL,
      name VARCHAR(20) NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (semester_id) REFERENCES semesters(id)
    )
  `);

  // 班级表
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id INTEGER NOT NULL,
      grade_id INTEGER NOT NULL,
      name VARCHAR(20) NOT NULL,
      class_teacher_id INTEGER,
      meal_fee DECIMAL(10,2) NOT NULL,
      student_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (semester_id) REFERENCES semesters(id),
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

  // 费用配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS fee_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      semester_id INTEGER NOT NULL,
      meal_fee_standard DECIMAL(10,2) NOT NULL,
      prepaid_days INTEGER NOT NULL DEFAULT 0,
      actual_days INTEGER NOT NULL DEFAULT 0,
      suspension_days INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (semester_id) REFERENCES semesters(id),
      UNIQUE(class_id, semester_id)
    )
  `);

  // 备份记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS backup_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      modules TEXT NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      file_size INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // 备份配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS backup_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled BOOLEAN DEFAULT 0,
      schedule_type VARCHAR(20) NOT NULL,
      schedule_time VARCHAR(10) NOT NULL,
      backup_type VARCHAR(20) NOT NULL,
      modules TEXT NOT NULL,
      retention_days INTEGER DEFAULT 30,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_class_teacher ON classes(class_teacher_id);
    CREATE INDEX IF NOT EXISTS idx_fee_configs_class ON fee_configs(class_id);
    CREATE INDEX IF NOT EXISTS idx_fee_configs_semester ON fee_configs(semester_id);
    CREATE INDEX IF NOT EXISTS idx_backup_created_by ON backup_records(created_by);
    CREATE INDEX IF NOT EXISTS idx_backup_created_at ON backup_records(created_at);
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
 * 初始化系统配置
 */
function initSystemConfig(): void {
  const db = getDb();

  // 检查是否已初始化配置
  const existingCount = db.prepare("SELECT COUNT(*) as count FROM system_config").get() as { count: number };

  if (existingCount.count === 0) {
    // 插入默认系统配置
    const stmt = db.prepare(`
      INSERT INTO system_config (config_key, config_value, description) VALUES
        ('leave.min_days', '3', '最小请假天数'),
        ('leave.teacher_apply_enabled', 'true', '教师请假申请功能开关'),
        ('leave.require_approval', 'true', '请假是否需要审批'),
        ('system.max_export_rows', '10000', '导出数据最大行数'),
        ('system.session_timeout', '7', '会话超时天数（天）'),
        ('system.maintenance_mode', 'false', '维护模式开关')
    `);
    stmt.run();
    console.log("系统配置初始化完成");
  }
}

/**
 * 运行数据库迁移
 */
export async function runMigrations(): Promise<void> {
  // 初始化数据库表结构（如果表不存在）
  // 新数据库会自动包含 semester_id 字段
  initDatabase();

  // 创建初始管理员用户
  await seedAdminUser();

  // 初始化系统配置
  initSystemConfig();

  // 运行版本迁移
  migrateClassTeacherUniqueConstraint();
}

/**
 * 迁移：确保班主任一对一关系唯一约束
 * 处理可能存在的重复分配情况
 */
function migrateClassTeacherUniqueConstraint(): void {
  const db = getDb();

  // 检查迁移是否已运行（通过检查唯一索引是否存在）
  const indexes = db.pragma("index_list('classes')") as { name: string }[];
  const hasUniqueIndex = indexes.some((idx) => idx.name === "idx_classes_class_teacher");

  if (!hasUniqueIndex) {
    // 唯一索引会在 initDatabase 中创建，这里只需要清理可能的重复数据
    // 找出被重复分配的班主任
    const duplicateTeachers = db.prepare(`
      SELECT class_teacher_id, COUNT(*) as count
      FROM classes
      WHERE class_teacher_id IS NOT NULL
      GROUP BY class_teacher_id
      HAVING count > 1
    `).all() as { class_teacher_id: number; count: number }[];

    // 对于重复分配，清除所有分配，让管理员重新分配
    for (const dup of duplicateTeachers) {
      db.prepare("UPDATE classes SET class_teacher_id = NULL WHERE class_teacher_id = ?").run(dup.class_teacher_id);
      console.log(`已清除教师 ID ${dup.class_teacher_id} 的重复班级分配`);
    }
  }
}

// 在开发环境中，当模块加载时自动初始化数据库
if (process.env.NODE_ENV === "development") {
  runMigrations().catch(console.error);
}
