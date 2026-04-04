const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL ||
  'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=verify-full';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const tableNames = tablesResult.rows.map((row) => row.tablename);
    if (tableNames.length === 0) {
      console.log('No public tables found. Nothing to truncate.');
      return;
    }

    const qualified = tableNames.map((name) => `"public"."${name}"`).join(', ');

    console.log(`Truncating ${tableNames.length} tables...`);
    await client.query(`TRUNCATE TABLE ${qualified} RESTART IDENTITY CASCADE;`);

    console.log('SUCCESS: All public tables truncated. Schema and relations preserved.');
    console.log('Tables:', tableNames);
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('truncate_all_tables failed:', error.message);
  process.exit(1);
});
