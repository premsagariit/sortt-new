/**
 * backend/scripts/create_order_counters.js
 * Creates the user_order_counters table if it doesn't exist,
 * and backfills existing orders with correct sequential counts.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_order_counters (
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        orders_count BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id)
      )
    `);
    console.log('✅ user_order_counters table ready');

    // 2. Backfill from existing orders (group by seller_id, count)
    const result = await client.query(`
      INSERT INTO user_order_counters (user_id, orders_count)
      SELECT seller_id, cnt
      FROM (
        SELECT seller_id, COUNT(*) AS cnt
        FROM orders
        WHERE deleted_at IS NULL
        GROUP BY seller_id
      ) sub
      ON CONFLICT (user_id) DO UPDATE SET orders_count = EXCLUDED.orders_count
    `);
    console.log(`✅ Backfilled ${result.rowCount} seller counters`);

    await client.query('COMMIT');
    console.log('✅ Done');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
