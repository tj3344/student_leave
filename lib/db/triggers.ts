import { getRawPostgres } from "./index";
import postgres from "postgres";

/**
 * 初始化学生数量统计触发器
 */
export async function initStudentCountTriggers(): Promise<void> {
  await initPostgresTriggers();
}

/**
 * 检查触发器是否存在
 */
async function triggerExists(pgClient: postgres.Sql, triggerName: string): Promise<boolean> {
  const result = await pgClient.unsafe(`
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = $1
    )
  `, [triggerName]) as { exists: boolean }[];
  return result[0]?.exists || false;
}

/**
 * 检查函数是否存在
 */
async function functionExists(pgClient: postgres.Sql, functionName: string): Promise<boolean> {
  const result = await pgClient.unsafe(`
    SELECT EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = $1
    )
  `, [functionName]) as { exists: boolean }[];
  return result[0]?.exists || false;
}

/**
 * 确保触发器已初始化（带检查）
 */
export async function ensureTriggersInitialized(): Promise<boolean> {
  const pgClient = getRawPostgres();

  const hasFunction = await functionExists(pgClient, 'update_student_count');
  const hasTrigger = await triggerExists(pgClient, 'trigger_student_count_insert');

  if (!hasFunction || !hasTrigger) {
    console.log('⚠️  检测到触发器未初始化，正在自动初始化...');
    await initPostgresTriggers();
    return true;
  }

  return false;
}

/**
 * 初始化 PostgreSQL 触发器
 */
async function initPostgresTriggers(): Promise<void> {
  const pgClient = getRawPostgres();

  // 创建触发器函数
  await pgClient.unsafe(`
    CREATE OR REPLACE FUNCTION update_student_count()
    RETURNS TRIGGER AS $$
    BEGIN
      -- 插入操作
      IF TG_OP = 'INSERT' THEN
        IF NEW.is_active = true THEN
          UPDATE classes
          SET student_count = student_count + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.class_id;
        END IF;
        RETURN NEW;

      -- 更新操作
      ELSIF TG_OP = 'UPDATE' THEN
        -- 处理学生状态变更
        IF OLD.is_active <> NEW.is_active THEN
          IF NEW.is_active = false THEN
            -- 学生离校
            UPDATE classes
            SET student_count = student_count - 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.class_id;
          ELSE
            -- 学生返校
            UPDATE classes
            SET student_count = student_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.class_id;
          END IF;
        END IF;

        -- 处理转班
        IF OLD.class_id <> NEW.class_id AND NEW.is_active = true THEN
          UPDATE classes
          SET student_count = student_count - 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = OLD.class_id;

          UPDATE classes
          SET student_count = student_count + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.class_id;
        END IF;
        RETURN NEW;

      -- 删除操作
      ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_active = true THEN
          UPDATE classes
          SET student_count = student_count - 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = OLD.class_id;
        END IF;
        RETURN OLD;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `);

  // 删除已存在的触发器
  await pgClient.unsafe(`
    DROP TRIGGER IF EXISTS trigger_student_count_insert ON students;
    DROP TRIGGER IF EXISTS trigger_student_count_update ON students;
    DROP TRIGGER IF EXISTS trigger_student_count_delete ON students;
  `);

  // 创建触发器
  await pgClient.unsafe(`
    CREATE TRIGGER trigger_student_count_insert
    AFTER INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_student_count()
  `);

  await pgClient.unsafe(`
    CREATE TRIGGER trigger_student_count_update
    AFTER UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_student_count()
  `);

  await pgClient.unsafe(`
    CREATE TRIGGER trigger_student_count_delete
    AFTER DELETE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_student_count()
  `);

  console.log("✅ PostgreSQL 学生数统计触发器初始化成功");
}

/**
 * 重建所有班级的学生数量统计
 * 用于触发器安装后的数据修复
 */
export async function rebuildStudentCounts(): Promise<void> {
  const pgClient = getRawPostgres();
  await pgClient.unsafe(`
    UPDATE classes
    SET student_count = (
      SELECT COUNT(*)
      FROM students
      WHERE students.class_id = classes.id AND students.is_active = true
    ),
    updated_at = CURRENT_TIMESTAMP
  `);

  console.log("✅ 班级学生数统计重建成功");
}
