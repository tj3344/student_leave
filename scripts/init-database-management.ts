import postgres from "postgres";

const DATABASE_URL = process.env.POSTGRES_URL || "postgresql://tianjun:tj875891..@127.0.0.1:5432/student_leave";

async function initDatabaseTables() {
  const client = postgres(DATABASE_URL);

  try {
    console.log("开始创建数据库管理表...");

    // 创建 database_connections 表
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS database_connections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        connection_string_encrypted TEXT NOT NULL,
        environment VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT false,
        description TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_switched_at TIMESTAMP,
        last_switched_by INTEGER REFERENCES users(id),
        connection_test_status VARCHAR(20),
        connection_test_message TEXT,
        connection_test_at TIMESTAMP
      )
    `);
    console.log("✓ 创建表 database_connections");

    // 创建 database_switch_history 表
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS database_switch_history (
        id SERIAL PRIMARY KEY,
        from_connection_id INTEGER REFERENCES database_connections(id),
        to_connection_id INTEGER REFERENCES database_connections(id) NOT NULL,
        switch_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        backup_file_path TEXT,
        error_message TEXT,
        migrated_tables TEXT,
        migration_details TEXT,
        switched_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    console.log("✓ 创建表 database_switch_history");

    // 创建序列
    await client.unsafe(`
      CREATE SEQUENCE IF NOT EXISTS database_connections_id_seq
      OWNED BY database_connections.id
    `);
    await client.unsafe(`
      CREATE SEQUENCE IF NOT EXISTS database_switch_history_id_seq
      OWNED BY database_switch_history.id
    `);
    console.log("✓ 创建序列");

    console.log("\n数据库管理表创建完成！");
  } catch (error) {
    console.error("创建表失败:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabaseTables();
