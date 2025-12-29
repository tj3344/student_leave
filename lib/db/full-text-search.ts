import { getDb } from './index';

/**
 * 初始化全文搜索表
 * 使用 SQLite FTS5 扩展实现高效的文本搜索
 */
export function initFullTextSearch(): void {
  const db = getDb();

  // 创建学生全文搜索虚拟表
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS students_fts
    USING fts5(
      student_no,
      name,
      parent_phone,
      content='students',
      content_rowid='id'
    );
  `);

  // 创建触发器保持同步
  db.exec(`
    -- 插入触发器：当插入学生记录时，同步到 FTS 表
    CREATE TRIGGER IF NOT EXISTS students_fts_insert
    AFTER INSERT ON students BEGIN
      INSERT INTO students_fts(rowid, student_no, name, parent_phone)
      VALUES (NEW.id, NEW.student_no, NEW.name, NEW.parent_phone);
    END;

    -- 更新触发器：当更新学生记录时，同步到 FTS 表
    CREATE TRIGGER IF NOT EXISTS students_fts_update
    AFTER UPDATE ON students BEGIN
      UPDATE students_fts
      SET student_no = NEW.student_no, name = NEW.name, parent_phone = NEW.parent_phone
      WHERE rowid = NEW.id;
    END;

    -- 删除触发器：当删除学生记录时，从 FTS 表删除
    CREATE TRIGGER IF NOT EXISTS students_fts_delete
    AFTER DELETE ON students BEGIN
      DELETE FROM students_fts WHERE rowid = OLD.id;
    END;
  `);

  // 为现有数据填充 FTS 表
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM students_fts').get() as { count: number };
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number };

  if (existingCount.count < studentCount.count) {
    // 清空 FTS 表
    db.exec('DELETE FROM students_fts');

    // 重新填充 FTS 表
    db.exec(`
      INSERT INTO students_fts(rowid, student_no, name, parent_phone)
      SELECT id, student_no, name, parent_phone FROM students
    `);
  }

  console.log('Full-text search initialized successfully');
}

/**
 * 全文搜索学生
 * @param query 搜索关键词
 * @param limit 限制返回数量
 * @param offset 偏移量
 * @returns 学生列表
 */
export function searchStudents(
  query: string,
  limit: number = 20,
  offset: number = 0
): Record<string, unknown>[] {
  const db = getDb();

  // 使用 FTS5 搜索
  return db.prepare(`
    SELECT s.*, c.name as class_name, g.name as grade_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    WHERE s.id IN (
      SELECT rowid FROM students_fts
      WHERE students_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    )
  `).all(query, limit, offset);
}

/**
 * 获取全文搜索结果总数
 * @param query 搜索关键词
 * @returns 结果数量
 */
export function getSearchStudentsCount(query: string): number {
  const db = getDb();

  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM students_fts
    WHERE students_fts MATCH ?
  `).get(query) as { count: number };

  return result.count;
}

/**
 * 重建全文搜索索引
 * 当数据不一致时调用
 */
export function rebuildFullTextSearchIndex(): void {
  const db = getDb();

  db.exec(`
    DELETE FROM students_fts;
    INSERT INTO students_fts(rowid, student_no, name, parent_phone)
    SELECT id, student_no, name, parent_phone FROM students;
  `);

  console.log('Full-text search index rebuilt successfully');
}

/**
 * 清理全文搜索表
 */
export function dropFullTextSearch(): void {
  const db = getDb();

  // 删除触发器
  db.exec(`
    DROP TRIGGER IF EXISTS students_fts_insert;
    DROP TRIGGER IF EXISTS students_fts_update;
    DROP TRIGGER IF EXISTS students_fts_delete;
  `);

  // 删除 FTS 表
  db.exec('DROP TABLE IF EXISTS students_fts');

  console.log('Full-text search dropped successfully');
}
