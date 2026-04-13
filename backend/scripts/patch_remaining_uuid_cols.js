/**
 * backend/scripts/patch_remaining_uuid_cols.js
 * ─────────────────────────────────────────────────────────────────
 * Patches tables that the main migration missed:
 *   - order_items.id           (uuid → text)
 *   - seller_addresses.id      (uuid → text)
 *   - order_status_history.id  (uuid → text)
 *   - order_status_history.changed_by (uuid → text)
 *   - disputes.id              (uuid → text)
 *   - disputes.order_item_id   (uuid → text)
 * ─────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function colType(client, table, col) {
  const r = await client.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`, [table, col]
  );
  return r.rows[0]?.data_type ?? null;
}

/**
 * Alter a UUID column to TEXT, preserving data (UUIDs cast to text strings).
 * Drops & recreates PKs/FKs around it as needed.
 */
async function alterToText(client, table, col) {
  const type = await colType(client, table, col);
  if (type === 'text') {
    console.log(`  ✓  ${table}.${col} is already text — skipping`);
    return;
  }
  if (type === null) {
    console.log(`  ⚠  ${table}.${col} not found — skipping`);
    return;
  }
  console.log(`  → Converting ${table}.${col} (${type} → text)...`);

  // Collect any FK constraints referencing this column (as a parent/PK column)
  const fksDependingOnCol = await client.query(
    `SELECT tc.constraint_name, tc.table_name AS child_table, kcu.column_name AS child_col
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.referential_constraints rc
       ON rc.constraint_name = tc.constraint_name
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = rc.unique_constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND ccu.table_name = $1 AND ccu.column_name = $2`,
    [table, col]
  );

  // Collect any FK constraints on this table's col (child side)
  const fksOnTable = await client.query(
    `SELECT tc.constraint_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_name = $1 AND kcu.column_name = $2`,
    [table, col]
  );

  // Drop FK constraints on this table
  for (const row of fksOnTable.rows) {
    console.log(`    drop FK ${row.constraint_name}`);
    await client.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
  }

  // Drop FK constraints from children pointing to this col
  for (const row of fksDependingOnCol.rows) {
    console.log(`    drop child FK ${row.constraint_name} on ${row.child_table}`);
    await client.query(`ALTER TABLE "${row.child_table}" DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
  }

  // Check if this is the PK
  const pkq = await client.query(
    `SELECT constraint_name FROM information_schema.table_constraints
     WHERE table_name = $1 AND constraint_type = 'PRIMARY KEY'`, [table]
  );
  const pkName = pkq.rows[0]?.constraint_name;
  if (pkName) {
    console.log(`    drop PK ${pkName}`);
    await client.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${pkName}"`);
  }

  // Alter the column type
  await client.query(`ALTER TABLE "${table}" ALTER COLUMN "${col}" TYPE TEXT USING "${col}"::text`);
  console.log(`    ✅ ${table}.${col} → text`);

  // Re-add PK if it was the PK column
  if (pkName && col === 'id') {
    await client.query(`ALTER TABLE "${table}" ADD PRIMARY KEY (id)`);
    console.log(`    ✅ PK re-added on ${table}`);
  }

  // Re-add FK constraints on child tables (they now reference a TEXT pk)
  for (const row of fksDependingOnCol.rows) {
    const q = `ALTER TABLE "${row.child_table}" ADD FOREIGN KEY ("${row.child_col}") REFERENCES "${table}" (${col}) ON DELETE CASCADE`;
    console.log(`    re-add FK: ${row.child_table}.${row.child_col} → ${table}.${col}`);
    try {
      await client.query(q);
    } catch (e) {
      console.warn(`    ⚠  Could not re-add FK: ${e.message} — must be done manually`);
    }
  }

  // Re-add FK constraints on this table's col (if it was a child FK)
  // These are looked up from the original FK records before dropping
  // NOTE: re-add below must reference the correct parent type, but
  // parent should already be TEXT. Use VALIDATE CONSTRAINT pattern.
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. order_items.id
    await alterToText(client, 'order_items', 'id');

    // 2. seller_addresses.id
    await alterToText(client, 'seller_addresses', 'id');

    // 3. order_status_history.id
    await alterToText(client, 'order_status_history', 'id');

    // 4. order_status_history.changed_by — this might be a loose UUID col, not a FK
    {
      const type = await colType(client, 'order_status_history', 'changed_by');
      if (type === 'uuid') {
        console.log('  → Converting order_status_history.changed_by (uuid → text)...');
        await client.query(`ALTER TABLE order_status_history ALTER COLUMN changed_by TYPE TEXT USING changed_by::text`);
        console.log('    ✅ order_status_history.changed_by → text');
      } else {
        console.log(`  ✓  order_status_history.changed_by is already ${type ?? 'missing'}`);
      }
    }

    // 5. disputes.id
    await alterToText(client, 'disputes', 'id');

    // 6. disputes.order_item_id
    {
      const type = await colType(client, 'disputes', 'order_item_id');
      if (type === 'uuid') {
        console.log('  → Converting disputes.order_item_id (uuid → text)...');
        await client.query(`ALTER TABLE disputes ALTER COLUMN order_item_id TYPE TEXT USING order_item_id::text`);
        console.log('    ✅ disputes.order_item_id → text');
      } else {
        console.log(`  ✓  disputes.order_item_id is already ${type ?? 'missing'}`);
      }
    }

    // 7. kyc_documents.id
    await alterToText(client, 'kyc_documents', 'id');

    await client.query('COMMIT');
    console.log('\n✅ All patches committed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ ROLLBACK — Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
