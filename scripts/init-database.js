/**
 * 数据库完整初始化脚本
 * 包含：创建表结构 + 创建管理员账户
 *
 * 使用方法：
 *   docker exec -it student-leave-app node /app/scripts/init-database.js
 */

const postgres = require('postgres');
const bcrypt = require('bcryptjs');

const dbUrl = process.env.POSTGRES_URL || 'postgresql://student_leave:student_leave_pass@postgres:5432/student_leave';

async function initDatabase() {
  console.log('========================================');
  console.log('学生请假管理系统 - 数据库初始化');
  console.log('========================================\n');

  const sql = postgres(dbUrl);

  try {
    // 步骤 1: 测试数据库连接
    console.log('📡 [1/3] 测试数据库连接...');
    await sql`SELECT 1`;
    console.log('✓ 数据库连接成功\n');

    // 步骤 2: 创建表结构
    console.log('🔨 [2/3] 创建数据库表...');

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        username text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        real_name text NOT NULL,
        role text NOT NULL,
        phone text,
        email text,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS semesters (
        id serial PRIMARY KEY,
        name text NOT NULL,
        start_date text NOT NULL,
        end_date text NOT NULL,
        school_days integer NOT NULL,
        is_current boolean DEFAULT false NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS grades (
        id serial PRIMARY KEY,
        semester_id integer NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
        name text NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS classes (
        id serial PRIMARY KEY,
        semester_id integer NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
        grade_id integer NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
        name text NOT NULL,
        class_teacher_id integer REFERENCES users(id) ON DELETE SET NULL,
        meal_fee text NOT NULL,
        student_count integer DEFAULT 0 NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS students (
        id serial PRIMARY KEY,
        student_no text NOT NULL UNIQUE,
        name text NOT NULL,
        gender text,
        class_id integer NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
        parent_name text,
        parent_phone text,
        address text,
        is_nutrition_meal boolean DEFAULT false NOT NULL,
        enrollment_date text,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS leave_records (
        id serial PRIMARY KEY,
        student_id integer NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
        semester_id integer NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
        applicant_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        start_date text NOT NULL,
        end_date text NOT NULL,
        leave_days integer NOT NULL,
        reason text NOT NULL,
        status text DEFAULT 'pending' NOT NULL,
        reviewer_id integer REFERENCES users(id) ON DELETE SET NULL,
        review_time timestamp,
        review_remark text,
        is_refund boolean DEFAULT true NOT NULL,
        refund_amount text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_config (
        id serial PRIMARY KEY,
        config_key text NOT NULL UNIQUE,
        config_value text,
        description text,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS operation_logs (
        id serial PRIMARY KEY,
        user_id integer REFERENCES users(id) ON DELETE SET NULL,
        action text NOT NULL,
        module text NOT NULL,
        description text,
        ip_address text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fee_configs (
        id serial PRIMARY KEY,
        class_id integer NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
        semester_id integer NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
        meal_fee_standard text NOT NULL,
        prepaid_days integer DEFAULT 0 NOT NULL,
        actual_days integer DEFAULT 0 NOT NULL,
        suspension_days integer DEFAULT 0 NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, semester_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id serial PRIMARY KEY,
        sender_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        receiver_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        content text NOT NULL,
        type text NOT NULL,
        is_read boolean DEFAULT false NOT NULL,
        read_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS backup_records (
        id serial PRIMARY KEY,
        name text NOT NULL,
        type text NOT NULL,
        modules text NOT NULL,
        file_path text NOT NULL,
        file_size integer NOT NULL DEFAULT 0,
        created_by integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        description text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS backup_config (
        id serial PRIMARY KEY,
        enabled boolean DEFAULT false NOT NULL,
        schedule_type text NOT NULL,
        schedule_time text NOT NULL,
        backup_type text NOT NULL,
        modules text NOT NULL,
        retention_days integer DEFAULT 30 NOT NULL,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS database_connections (
        id serial PRIMARY KEY,
        name varchar(100) NOT NULL,
        connection_string_encrypted text NOT NULL,
        environment varchar(50) NOT NULL,
        is_active boolean DEFAULT false NOT NULL,
        description text,
        created_by integer REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_switched_at timestamp,
        last_switched_by integer REFERENCES users(id) ON DELETE SET NULL,
        connection_test_status varchar(20),
        connection_test_message text,
        connection_test_at timestamp
      );

      CREATE TABLE IF NOT EXISTS database_switch_history (
        id serial PRIMARY KEY,
        from_connection_id integer REFERENCES database_connections(id) ON DELETE SET NULL,
        to_connection_id integer NOT NULL REFERENCES database_connections(id) ON DELETE RESTRICT,
        switch_type varchar(20) NOT NULL,
        status varchar(20) NOT NULL,
        backup_file_path text,
        error_message text,
        migrated_tables text,
        migration_details text,
        switched_by integer REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at timestamp
      );
    `);

    console.log('✓ 数据库表创建成功\n');

    // 步骤 3: 创建管理员账户
    console.log('👤 [3/3] 创建管理员账户...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    const now = new Date();

    await sql`
      INSERT INTO users (username, password_hash, real_name, role, is_active, created_at, updated_at)
      VALUES ('admin', ${passwordHash}, '系统管理员', 'admin', true, ${now}, ${now})
      ON CONFLICT (username) DO UPDATE SET
        password_hash = ${passwordHash},
        real_name = '系统管理员',
        role = 'admin',
        is_active = true,
        updated_at = ${now}
    `;

    await sql.end();

    console.log('✓ 管理员账户创建成功\n');
    console.log('========================================');
    console.log('✅ 数据库初始化完成！');
    console.log('========================================\n');
    console.log('登录凭据:');
    console.log('  用户名: admin');
    console.log('  密码: admin123');
    console.log('');
    console.log('⚠️  重要提示:');
    console.log('  1. 请登录后立即修改默认密码！');
    console.log('  2. 生产环境请使用强密码！');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ 数据库初始化失败!');
    console.error('错误信息:', error.message);
    console.error('\n故障排查:');
    console.error('  1. 检查 PostgreSQL 容器是否运行');
    console.error('  2. 检查环境变量 POSTGRES_URL 是否正确');
    console.error('  3. 查看日志: docker logs student-leave-app\n');
    await sql.end();
    process.exit(1);
  }
}

initDatabase();
