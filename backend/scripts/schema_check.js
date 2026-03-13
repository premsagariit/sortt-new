const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const tables = ['messages', 'ratings', 'disputes', 'order_media', 'aggregator_availability', 'aggregator_material_rates'];
    for (const table of tables) {
      const res = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 
         ORDER BY ordinal_position`,
        [table]
      );
      console.log(`\n=== ${table} ===`);
      if (res.rows.length === 0) {
        console.log('  (no columns found — table may not exist or may be a partitioned parent)');
        // Try to find partitions
        const partRes = await client.query(
          `SELECT column_name, data_type FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name LIKE $1
           ORDER BY ordinal_position LIMIT 20`,
          [table + '%']
        );
        if (partRes.rows.length > 0) {
          console.log('  (found via partition search:)');
          partRes.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
        }
      } else {
        res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
      }
    }
  } finally {
    client.release();
    pool.end();
  }
}

main().catch(console.error);
