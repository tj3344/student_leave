/**
 * 验证学生表唯一约束是否正确设置
 */

require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

async function verifyConstraints() {
  const url = process.env.POSTGRES_URL;
  const sql = postgres(url);

  try {
    console.log('查询 students 表的约束信息...\n');

    const constraints = await sql`
      SELECT
        conname AS constraint_name,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'students'
        AND n.nspname = 'public'
        AND c.contype IN ('u', 'p')
      ORDER BY conname
    `;

    console.log('找到以下约束：');
    console.log('─────────────────────────────────────────────────────────────');
    for (const c of constraints) {
      console.log(`约束名: ${c.constraint_name}`);
      console.log(`定义:   ${c.constraint_definition}`);
      console.log('─────────────────────────────────────────────────────────────');
    }

    // 检查是否有正确的复合唯一约束
    const hasCorrectConstraint = constraints.some(
      c => c.constraint_definition.includes('class_id') &&
            c.constraint_definition.includes('student_no') &&
            c.constraint_definition.includes('UNIQUE')
    );

    // 检查是否还有旧的全局唯一约束
    const hasOldGlobalUnique = constraints.some(
      c => c.constraint_name === 'students_student_no_unique' ||
           (c.constraint_definition.includes('student_no') &&
            !c.constraint_definition.includes('class_id'))
    );

    console.log('\n验证结果：');
    console.log('─────────────────────────────────────────────────────────────');
    if (hasCorrectConstraint && !hasOldGlobalUnique) {
      console.log('✅ 约束配置正确！');
      console.log('   • 已添加 (class_id, student_no) 复合唯一约束');
      console.log('   • 已移除旧的 student_no 全局唯一约束');
    } else if (hasOldGlobalUnique) {
      console.log('⚠️  仍然存在旧的 student_no 全局唯一约束');
    } else {
      console.log('⚠️  未找到预期的复合唯一约束');
    }
    console.log('─────────────────────────────────────────────────────────────');
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await sql.end();
  }
}

verifyConstraints();
