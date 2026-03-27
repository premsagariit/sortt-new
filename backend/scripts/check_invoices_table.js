const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL ||
  'postgresql://sortt_admin:Sagar%40789364@sortt-db.postgres.database.azure.com:5432/sortt?sslmode=require';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    // Check if invoices table exists
    const tableCheck = await client.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'invoices'
      ) AS exists`
    );
    console.log('invoices table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      const cols = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'invoices'
         ORDER BY ordinal_position`
      );
      console.log('Columns:', JSON.stringify(cols.rows, null, 2));

      const count = await client.query('SELECT COUNT(*) FROM invoices');
      console.log('Row count:', count.rows[0].count);
    }
  } finally {
    await client.end();
  }
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
