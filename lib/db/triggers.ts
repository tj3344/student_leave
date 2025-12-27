import { getDb } from "./index";

/**
 * 初始化学生数量统计触发器
 * 使用触发器自动维护班级学生数量，避免应用层子查询
 */
export function initStudentCountTriggers(): void {
  const db = getDb();

  // 删除已存在的触发器（如果有的话）
  db.exec(`
    DROP TRIGGER IF EXISTS update_student_count_insert;
    DROP TRIGGER IF EXISTS update_student_count_update_off;
    DROP TRIGGER IF EXISTS update_student_count_update_on;
    DROP TRIGGER IF EXISTS update_student_count_update_transfer;
    DROP TRIGGER IF EXISTS update_student_count_delete;
  `);

  // 创建插入触发器：当插入在校学生时，对应班级的学生数量+1
  db.exec(`
    CREATE TRIGGER update_student_count_insert
    AFTER INSERT ON students
    WHEN NEW.is_active = 1
    BEGIN
      UPDATE classes
      SET student_count = student_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.class_id;
    END
  `);

  // 创建更新触发器1：处理学生离校场景（从在校变为离校）
  db.exec(`
    CREATE TRIGGER update_student_count_update_off
    AFTER UPDATE OF is_active ON students
    WHEN OLD.is_active = 1 AND NEW.is_active = 0
    BEGIN
      UPDATE classes
      SET student_count = student_count - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.class_id;
    END
  `);

  // 创建更新触发器2：处理学生返校场景（从离校变为在校）
  db.exec(`
    CREATE TRIGGER update_student_count_update_on
    AFTER UPDATE OF is_active ON students
    WHEN OLD.is_active = 0 AND NEW.is_active = 1
    BEGIN
      UPDATE classes
      SET student_count = student_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.class_id;
    END
  `);

  // 创建更新触发器3：处理转班场景（在校学生班级发生变化）
  db.exec(`
    CREATE TRIGGER update_student_count_update_transfer
    AFTER UPDATE OF class_id ON students
    WHEN OLD.class_id != NEW.class_id AND NEW.is_active = 1
    BEGIN
      UPDATE classes
      SET student_count = student_count - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.class_id;

      UPDATE classes
      SET student_count = student_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.class_id;
    END
  `);

  // 创建删除触发器：当删除在校学生时，对应班级的学生数量-1
  db.exec(`
    CREATE TRIGGER update_student_count_delete
    AFTER DELETE ON students
    WHEN OLD.is_active = 1
    BEGIN
      UPDATE classes
      SET student_count = student_count - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.class_id;
    END
  `);

  console.log("Student count triggers initialized successfully");
}

/**
 * 重建所有班级的学生数量统计
 * 用于触发器安装后的数据修复
 */
export function rebuildStudentCounts(): void {
  const db = getDb();

  // 重置所有班级的学生数量为0
  db.exec(`UPDATE classes SET student_count = 0`);

  // 根据实际在校学生数量重新统计
  db.exec(`
    UPDATE classes
    SET student_count = (
      SELECT COUNT(*)
      FROM students
      WHERE students.class_id = classes.id AND students.is_active = 1
    ),
    updated_at = CURRENT_TIMESTAMP
  `);

  console.log("Student counts rebuilt successfully");
}
