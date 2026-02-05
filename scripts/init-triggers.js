const postgres = require('postgres');

const sql = postgres('postgresql://student_leave:student_leave_pass@localhost:5432/student_leave');

async function initTriggers() {
  // 创建触发器函数
  await sql.unsafe(`
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
  await sql.unsafe(`
    DROP TRIGGER IF EXISTS trigger_student_count_insert ON students;
    DROP TRIGGER IF EXISTS trigger_student_count_update ON students;
    DROP TRIGGER IF EXISTS trigger_student_count_delete ON students;
  `);

  // 创建触发器
  await sql.unsafe(`
    CREATE TRIGGER trigger_student_count_insert
    AFTER INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_student_count()
  `);

  await sql.unsafe(`
    CREATE TRIGGER trigger_student_count_update
    AFTER UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_student_count()
  `);

  await sql.unsafe(`
    CREATE TRIGGER trigger_student_count_delete
    AFTER DELETE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_student_count()
  `);

  // 重建现有学生数量
  await sql.unsafe(`
    UPDATE classes
    SET student_count = (
      SELECT COUNT(*)
      FROM students
      WHERE students.class_id = classes.id AND students.is_active = true
    ),
    updated_at = CURRENT_TIMESTAMP
  `);

  console.log('触发器初始化成功！');
  console.log('学生数量已重建');

  await sql.end();
}

initTriggers().catch(console.error);
