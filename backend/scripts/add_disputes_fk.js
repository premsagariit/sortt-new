/**
 * Add FK disputes.order_item_id → order_items.id now both are TEXT.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`
      ALTER TABLE disputes 
        DROP CONSTRAINT IF EXISTS disputes_order_item_id_fkey
    `);
    await pool.query(`
      ALTER TABLE disputes 
        ADD CONSTRAINT disputes_order_item_id_fkey 
        FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL
    `);
    console.log('✅ Added FK disputes.order_item_id → order_items.id');
  } catch(e) {
    console.error('❌', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
run();
