const postgres = require('postgres');
const bcrypt = require('bcryptjs');

const sql = postgres('postgresql://student_leave:student_leave_pass@localhost:5432/student_leave');

async function initAdmin() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const now = new Date();

  await sql`
    INSERT INTO users (username, password_hash, real_name, role, is_active, created_at, updated_at)
    VALUES ('admin', ${passwordHash}, '系统管理员', 'admin', true, ${now}, ${now})
    ON CONFLICT (username) DO NOTHING
  `;

  console.log('管理员用户创建成功！');
  console.log('用户名: admin');
  console.log('密码: admin123');

  await sql.end();
}

initAdmin().catch(console.error);
