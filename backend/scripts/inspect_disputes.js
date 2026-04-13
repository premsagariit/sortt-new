/**
 * Check what depends on disputes_old and what state order_items.id is in.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // What depends on disputes_old?
  const deps = await pool.query(`
    SELECT d.classid::regclass, d.objid, c.relname AS obj_name, d.deptype
    FROM pg_depend d
    LEFT JOIN pg_class c ON c.oid = d.objid
    WHERE d.refobjid = 'disputes_old'::regclass AND d.deptype != 'i'
    LIMIT 20
  `).catch(e => { return { rows: [], error: e.message }; });
  console.log('deps on disputes_old:', JSON.stringify(deps.rows ?? deps, null, 2));

  // What tables exist right now?
  const tables = await pool.query(`
    SELECT tablename FROM pg_tables 
    WHERE tablename IN ('disputes', 'disputes_old', 'order_items')
    ORDER BY tablename
  `);
  console.log('Tables:', tables.rows.map(r => r.tablename));

  // Current types on both
  const types = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_name IN ('disputes', 'disputes_old', 'order_items') 
      AND column_name = 'id'
    ORDER BY table_name
  `);
  console.log('ID columns:', types.rows);

  // What constraints reference disputes_old?
  const fks = await pool.query(`
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name
    WHERE ccu.table_name = 'disputes_old'
  `).catch(() => ({ rows: [] }));
  console.log('FKs pointing to disputes_old:', fks.rows);

  await pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
