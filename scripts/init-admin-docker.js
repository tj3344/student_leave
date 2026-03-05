/**
 * Docker 环境专用 - 管理员账户初始化脚本
 *
 * 使用方法:
 *   docker exec -it student-leave-app sh
 *   node /app/scripts/init-admin-docker.js
 *
 * 注意: 此脚本专为 Docker 环境设计，从环境变量读取数据库连接信息
 */

const postgres = require('postgres');
const bcrypt = require('bcryptjs');

// 从环境变量读取数据库连接字符串
const dbUrl = process.env.POSTGRES_URL || 'postgresql://student_leave:student_leave_pass@postgres:5432/student_leave';

async function initAdmin() {
  console.log('=================================');
  console.log('学生请假管理系统');
  console.log('管理员账户初始化');
  console.log('=================================\n');

  console.log('数据库连接信息:');
  console.log('  - 从环境变量 POSTGRES_URL 读取');
  console.log('');

  try {
    // 连接数据库
    const sql = postgres(dbUrl);

    // 测试连接
    console.log('正在连接数据库...');
    await sql`SELECT 1`;
    console.log('✓ 数据库连接成功\n');

    // 生成密码哈希
    console.log('正在生成管理员账户...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    const now = new Date();

    // 插入管理员账户
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

    console.log('✓ 管理员账户创建成功！\n');
    console.log('=================================');
    console.log('登录凭据');
    console.log('=================================');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('');
    console.log('重要提示:');
    console.log('  1. 请登录后立即修改默认密码！');
    console.log('  2. 生产环境请使用强密码！');
    console.log('=================================\n');

  } catch (error) {
    console.error('\n错误: 管理员账户创建失败！');
    console.error('详细信息:', error.message);
    console.error('\n故障排查:');
    console.error('  1. 检查 PostgreSQL 容器是否运行: docker compose ps postgres');
    console.error('  2. 检查数据库是否已初始化: node /app/node_modules/.bin/drizzle-kit push');
    console.error('  3. 查看应用日志: docker compose logs student-leave\n');
    process.exit(1);
  }
}

initAdmin();
