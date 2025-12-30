/**
 * PostgreSQL 数据库初始化脚本（CommonJS 版本）
 * 初始化触发器和全文搜索
 */

require("dotenv").config({ path: ".env" });
const postgres = require("postgres");

async function setupPostgres() {
  console.log("🚀 开始初始化 PostgreSQL 数据库...");
  console.log("=".repeat(50));

  const pgUrl = process.env.POSTGRES_URL;
  if (!pgUrl) {
    throw new Error("POSTGRES_URL 环境变量未设置");
  }

  const pgClient = postgres(pgUrl);

  try {
    // 1. 初始化触发器
    console.log("\n📋 初始化触发器...");
    await initStudentCountTriggers(pgClient);

    // 2. 初始化全文搜索
    console.log("\n🔍 初始化全文搜索...");
    await initFullTextSearch(pgClient);

    console.log("\n" + "=".repeat(50));
    console.log("✅ PostgreSQL 数据库初始化完成！");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n❌ 初始化失败:", error.message);
    await pgClient.end();
    process.exit(1);
  }

  await pgClient.end();
}

/**
 * 初始化 PostgreSQL 触发器
 */
async function initStudentCountTriggers(pgClient) {
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
            UPDATE classes
            SET student_count = student_count - 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.class_id;
          ELSE
            UPDATE classes
            SET student_count = student_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.class_id;
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
 * 初始化 PostgreSQL tsvector 全文搜索
 */
async function initFullTextSearch(pgClient) {
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

  // 创建触发器函数
  await pgClient.unsafe(`
    CREATE OR REPLACE FUNCTION students_search_vector_update()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.student_no, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.parent_phone, '')), 'C');
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
      setweight(to_tsvector('english', COALESCE(student_no, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(name, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(parent_phone, '')), 'C')
    WHERE search_vector IS NULL
  `);

  console.log("✅ PostgreSQL 全文搜索初始化成功");
}

// 运行初始化
setupPostgres().catch(console.error);
