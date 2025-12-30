import { getRawPostgres } from "./index";

// 全文搜索配置缓存
let tsConfigCache: string | null = null;

/**
 * 检查中文配置是否存在，不存在则使用 simple
 */
async function getTsConfigConfig(): Promise<string> {
  if (tsConfigCache) {
    return tsConfigCache;
  }

  const pgClient = getRawPostgres();
  try {
    const result = await pgClient.unsafe(`
      SELECT cfgname FROM pg_ts_config WHERE cfgname = 'chinese'
    `);
    if (result.length > 0) {
      tsConfigCache = 'chinese';
      console.log('✅ 使用中文全文搜索配置 (chinese)');
      return 'chinese';
    }
  } catch (e) {
    // 忽略错误，使用降级方案
  }
  tsConfigCache = 'simple';
  console.log('⚠️  中文配置不可用，使用简单全文搜索配置 (simple)');
  return 'simple';
}

/**
 * 初始化全文搜索
 */
export async function initFullTextSearch(): Promise<void> {
  await initPostgresFullTextSearch();
}

/**
 * 确保全文搜索已初始化（带检查）
 */
export async function ensureFullTextSearchInitialized(): Promise<boolean> {
  const pgClient = getRawPostgres();

  const columnExists = await pgClient.unsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'students' AND column_name = 'search_vector'
    )
  `) as { exists: boolean }[];

  if (!columnExists[0]?.exists) {
    console.log('⚠️  检测到全文搜索未初始化，正在自动初始化...');
    await initPostgresFullTextSearch();
    return true;
  }

  return false;
}

/**
 * 初始化 PostgreSQL tsvector 全文搜索
 */
async function initPostgresFullTextSearch(): Promise<void> {
  const pgClient = getRawPostgres();
  const tsConfig = await getTsConfigConfig();

  // 添加 tsvector 列
  await pgClient.unsafe(`
    ALTER TABLE students
    ADD COLUMN IF NOT EXISTS search_vector tsvector
  `);

  // 创建 GIN 索引
  await pgClient.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_students_search
    ON students
    USING GIN (search_vector)
  `);

  // 创建触发器函数（使用动态配置）
  await pgClient.unsafe(`
    CREATE OR REPLACE FUNCTION students_search_vector_update()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('${tsConfig}', COALESCE(NEW.student_no, '')), 'A') ||
        setweight(to_tsvector('${tsConfig}', COALESCE(NEW.name, '')), 'B') ||
        setweight(to_tsvector('${tsConfig}', COALESCE(NEW.parent_phone, '')), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // 删除旧触发器
  await pgClient.unsafe(`
    DROP TRIGGER IF EXISTS trigger_students_search_vector_update ON students
  `);

  // 创建触发器
  await pgClient.unsafe(`
    CREATE TRIGGER trigger_students_search_vector_update
    BEFORE INSERT OR UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION students_search_vector_update()
  `);

  // 为现有数据生成 search_vector
  await pgClient.unsafe(`
    UPDATE students
    SET search_vector =
      setweight(to_tsvector('${tsConfig}', COALESCE(student_no, '')), 'A') ||
      setweight(to_tsvector('${tsConfig}', COALESCE(name, '')), 'B') ||
      setweight(to_tsvector('${tsConfig}', COALESCE(parent_phone, '')), 'C')
    WHERE search_vector IS NULL
  `);

  console.log(`✅ PostgreSQL 全文搜索初始化成功（配置: ${tsConfig}）`);
}

/**
 * 全文搜索学生
 * @param query 搜索关键词
 * @param limit 限制返回数量
 * @param offset 偏移量
 * @returns 学生列表
 */
export async function searchStudents(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<Record<string, unknown>[]> {
  const pgClient = getRawPostgres();
  const tsConfig = await getTsConfigConfig();

  return await pgClient.unsafe(`
    SELECT s.*, c.name as class_name, g.name as grade_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN grades g ON c.grade_id = g.id
    WHERE s.search_vector @@ plainto_tsquery('${tsConfig}', $1)
    ORDER BY ts_rank(s.search_vector, plainto_tsquery('${tsConfig}', $1)) DESC
    LIMIT $2 OFFSET $3
  `, [query, limit, offset]);
}

/**
 * 获取全文搜索结果总数
 * @param query 搜索关键词
 * @returns 结果数量
 */
export async function getSearchStudentsCount(query: string): Promise<number> {
  const pgClient = getRawPostgres();
  const tsConfig = await getTsConfigConfig();

  const result = await pgClient.unsafe(`
    SELECT COUNT(*) as count
    FROM students
    WHERE search_vector @@ plainto_tsquery('${tsConfig}', $1)
  `, [query]);

  return result[0]?.count || 0;
}

/**
 * 重建全文搜索索引
 * 当数据不一致时调用
 */
export async function rebuildFullTextSearchIndex(): Promise<void> {
  const pgClient = getRawPostgres();
  const tsConfig = await getTsConfigConfig();

  await pgClient.unsafe(`
    UPDATE students
    SET search_vector =
      setweight(to_tsvector('${tsConfig}', COALESCE(student_no, '')), 'A') ||
      setweight(to_tsvector('${tsConfig}', COALESCE(name, '')), 'B') ||
      setweight(to_tsvector('${tsConfig}', COALESCE(parent_phone, '')), 'C')
  `);

  console.log('✅ 全文搜索索引重建成功');
}

/**
 * 清理全文搜索
 */
export async function dropFullTextSearch(): Promise<void> {
  const pgClient = getRawPostgres();
  await pgClient.unsafe(`
    DROP TRIGGER IF EXISTS trigger_students_search_vector_update ON students;
    DROP INDEX IF EXISTS idx_students_search;
    ALTER TABLE students DROP COLUMN IF EXISTS search_vector;
  `);

  // 清除缓存
  tsConfigCache = null;

  console.log('✅ 全文搜索已清理');
}
