/**
 * backend/scripts/patch_disputes_recreate.js
 * 
 * Patches disputes.id + order_item_id from uuid → text using 
 * CREATE TABLE AS + RENAME approach (avoids alter-column-in-policy-definition error).
 * 
 * This is the safest approach when ALTER COLUMN is blocked by compiled policy trees.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function colType(table, col) {
  const r = await pool.query(
    `SELECT data_type FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, col]
  );
  return r.rows[0]?.data_type ?? null;
}

async function run() {
  const idType = await colType('disputes', 'id');
  const oiType = await colType('disputes', 'order_item_id');
  console.log(`disputes.id: ${idType}, disputes.order_item_id: ${oiType}`);

  if (idType === 'text' && oiType !== 'uuid') {
    console.log('✅ disputes already fully patched — nothing to do');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    // Step 1: Get the full column list with types
    const cols = await client.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'disputes'
      ORDER BY ordinal_position
    `);
    console.log('Current disputes columns:', cols.rows.map(c => `${c.column_name}:${c.data_type}`).join(', '));

    // Step 2: Drop all policies and disable RLS
    const policies = await client.query(`SELECT polname FROM pg_policy WHERE polrelid='disputes'::regclass`);
    for (const row of policies.rows) {
      await client.query(`DROP POLICY IF EXISTS "${row.polname}" ON disputes`);
      console.log(`Dropped policy: ${row.polname}`);
    }
    await client.query(`ALTER TABLE disputes DISABLE ROW LEVEL SECURITY`);

    // Step 3: Drop dependent constraints (FK from other tables pointing to disputes.id)
    const fkDeps = await client.query(`
      SELECT tc.constraint_name, tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'disputes' AND ccu.column_name = 'id'
    `);
    for (const row of fkDeps.rows) {
      await client.query(`ALTER TABLE "${row.table_name}" DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
      console.log(`Dropped FK: ${row.constraint_name} on ${row.table_name}`);
    }

    // Step 4: Drop all constraints FROM disputes (FKs it has ON its own columns)
    const ownFks = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'disputes'::regclass AND contype = 'f'
    `);
    for (const row of ownFks.rows) {
      await client.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS "${row.conname}"`);
      console.log(`Dropped own FK: ${row.conname}`);
    }

    // Step 5: Drop PK
    await client.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_pkey`);
    console.log('Dropped PK');

    // Step 6: Rename original to _old
    await client.query(`ALTER TABLE disputes RENAME TO disputes_old`);
    console.log('Renamed disputes → disputes_old');

    // Step 7: Create new disputes with TEXT ids (matching actual schema)
    await client.query(`
      CREATE TABLE disputes (
        id            TEXT NOT NULL,
        order_id      TEXT,
        order_item_id TEXT,
        raised_by     TEXT,
        issue_type    TEXT,
        description   TEXT,
        status        TEXT DEFAULT 'open',
        resolution_note TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        resolved_at   TIMESTAMPTZ,
        PRIMARY KEY (id)
      )
    `);
    console.log('Created new disputes table with TEXT PKs');

    // Step 8: Copy data dynamically (cast uuid cols to text)
    const copyResult = await client.query(`
      INSERT INTO disputes (id, order_id, order_item_id, raised_by, issue_type, description, status, resolution_note, created_at, resolved_at)
      SELECT 
        id::text, 
        order_id,
        order_item_id::text,
        raised_by,
        issue_type,
        description,
        status,
        resolution_note,
        created_at,
        resolved_at
      FROM disputes_old
    `);
    console.log(`Copied ${copyResult.rowCount} rows from disputes_old → disputes`);

    // Step 9: Add FK from disputes to orders
    await client.query(`
      ALTER TABLE disputes 
        ADD CONSTRAINT disputes_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    `);
    console.log('Added FK disputes.order_id → orders.id');

    // Step 10: Add FK from disputes to order_items (if order_items.id is now text)
    const oiIdType = await colType('order_items', 'id');
    if (oiIdType === 'text') {
      await client.query(`
        ALTER TABLE disputes 
          ADD CONSTRAINT disputes_order_item_id_fkey 
          FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL
      `);
      console.log('Added FK disputes.order_item_id → order_items.id');
    } else {
      console.log(`Skipping order_items FK — order_items.id is still ${oiIdType}`);
    }

    // Step 11: Recreate RLS policies
    await client.query(`
      CREATE POLICY disputes_insert ON disputes FOR INSERT
        WITH CHECK (current_app_user_id() = raised_by)
    `);
    await client.query(`
      CREATE POLICY disputes_parties ON disputes FOR SELECT
        USING (
          current_app_user_id() = raised_by
          OR EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = disputes.order_id
              AND (o.seller_id = current_app_user_id() OR o.aggregator_id = current_app_user_id())
          )
        )
    `);
    await client.query(`ALTER TABLE disputes ENABLE ROW LEVEL SECURITY`);
    console.log('Recreated RLS policies');

    // Step 12: Drop old table (CASCADE to remove any leftover TOAST/sequence deps)
    await client.query(`DROP TABLE disputes_old CASCADE`);
    console.log('Dropped disputes_old');

    console.log('\n✅ disputes table successfully patched to TEXT PKs');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    // Try to restore if possible
    try {
      const exists = await client.query(`SELECT 1 FROM pg_tables WHERE tablename='disputes_old'`);
      if (exists.rows.length > 0) {
        const newExists = await client.query(`SELECT 1 FROM pg_tables WHERE tablename='disputes'`);
        if (newExists.rows.length > 0) {
          await client.query(`DROP TABLE disputes`);
        }
        await client.query(`ALTER TABLE disputes_old RENAME TO disputes`);
        console.log('Rolled back: disputes_old → disputes');
      }
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr.message);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
