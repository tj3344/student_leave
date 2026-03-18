import postgres from "postgres";

const POSTGRES_URL = "postgresql://student_leave:tj875891..@localhost:5432/student_leave";

async function migrate() {
  const pgClient = postgres(POSTGRES_URL);

  try {
    // 检查列是否已存在
    const checkResult = await pgClient.unsafe(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'students'
        AND column_name = 'enrollment_date'
      )
    `);

    const columnExists = checkResult[0]?.exists || false;

    if (columnExists) {
      console.log("✓ enrollment_date 列已存在，无需迁移");
      await pgClient.end();
      return;
    }

    // 添加列
    await pgClient.unsafe(`
      ALTER TABLE students ADD COLUMN enrollment_date text
    `);

    console.log("✓ enrollment_date 列已成功添加到 students 表");
  } catch (error) {
    console.error("✗ 迁移失败:", error);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

migrate();
