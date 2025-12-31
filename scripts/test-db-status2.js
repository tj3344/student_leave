const postgres = require("postgres");
const client = postgres("postgresql://tianjun:tj875891..@127.0.0.1:5432/student_leave");

(async () => {
  try {
    const tables = await client.unsafe(`
      SELECT
        schemaname || '.' || relname as name,
        COALESCE(n_live_tup, 0) as rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY rows DESC
      LIMIT 5
    `);
    console.log("Tables:", tables);

    await client.end();
    console.log("Success!");
  } catch (e) {
    console.error("Error:", e.message);
  }
})();
