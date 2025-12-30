import { getRawPostgres } from "./index";

/**
 * 初始化学生数量统计触发器
 */
export async function initStudentCountTriggers(): Promise<void> {
  await initPostgresTriggers();
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
