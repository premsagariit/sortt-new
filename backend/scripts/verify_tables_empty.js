const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL ||
  'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const tableRows = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const nonEmpty = [];

    for (const row of tableRows.rows) {
      const table = row.tablename;
      const countRes = await client.query(`SELECT COUNT(*)::int AS count FROM "public"."${table}"`);
      const count = countRes.rows[0].count;
      if (count > 0) {
        nonEmpty.push({ table, count });
      }
    }

    if (nonEmpty.length === 0) {
      console.log('SUCCESS: All public tables are empty.');
    } else {
      console.log('Non-empty tables found:', nonEmpty);
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('verify_tables_empty failed:', error.message);
  process.exit(1);
});
