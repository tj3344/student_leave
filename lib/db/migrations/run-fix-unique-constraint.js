/**
 * 执行学生表唯一约束修复迁移
 * 运行方式: node lib/db/migrations/run-fix-unique-constraint.js
 */

require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

async function runMigration() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error('错误: POSTGRES_URL 环境变量未设置');
    process.exit(1);
  }

  const sql = postgres(url);

  try {
    console.log('开始执行学生表唯一约束修复...');

    // 1. 删除旧的 student_no 全局唯一约束
    console.log('步骤 1: 删除旧的 student_no 全局唯一约束...');
    await sql`ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_no_unique`;
    console.log('✓ 完成');

    // 2. 添加复合唯一约束 (class_id, student_no)
    console.log('步骤 2: 添加复合唯一约束 (class_id, student_no)...');
    await sql`ALTER TABLE students ADD CONSTRAINT students_class_id_student_no_key UNIQUE (class_id, student_no)`;
    console.log('✓ 完成');

    console.log('\n✅ 迁移执行成功！');
    console.log('说明: 同一学号现在可以在不同学期存在，但同一班级内学号仍然唯一。');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
