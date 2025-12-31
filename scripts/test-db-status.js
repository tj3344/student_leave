const postgres = require("postgres");
const client = postgres("postgresql://tianjun:tj875891..@127.0.0.1:5432/student_leave");

(async () => {
  try {
    const dbName = await client.unsafe("SELECT current_database() as name");
    console.log("DB Name:", dbName[0]);

    const version = await client.unsafe("SELECT version()");
    console.log("Version:", version[0].version.split(",")[0]);

    const size = await client.unsafe("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
    console.log("Size:", size[0]);

    const tables = await client.unsafe(`
      SELECT schemaname || '.' || tablename as name, n_tup_ins - n_tup_del as rows
      FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY rows DESC LIMIT 5
    `);
    console.log("Tables:", tables);

    await client.end();
    console.log("Success!");
  } catch (e) {
    console.error("Error:", e.message);
  }
})();
