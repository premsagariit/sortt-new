/**
 * backend/scripts/drop_clerk_user_id.js
 *
 * Drops users.clerk_user_id column from the database.
 * Also removes the UNIQUE constraint on it and updates
 * the users_public view if it references the column.
 *
 * Safe to run multiple times (idempotent).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function q(sql) {
  const client = await pool.connect();
  try {
    const r = await client.query(sql);
    console.log(`  OK: ${sql.trim().slice(0, 90)}`);
    return r;
  } catch (e) {
    console.error(`  ERR: ${e.message}`);
    throw e;
  } finally {
    client.release();
  }
}

async function columnExists(table, col) {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, col]
  );
  return r.rowCount > 0;
}

async function run() {
  // 1. Check column exists
  if (!(await columnExists('users', 'clerk_user_id'))) {
    console.log('✅ users.clerk_user_id does not exist — nothing to do');
    await pool.end();
    return;
  }

  // 2. Drop unique constraint (if exists)
  const constraints = await pool.query(
    `SELECT conname FROM pg_constraint
     WHERE conrelid = 'users'::regclass
       AND contype = 'u'
       AND array_to_string(conkey, ',') IN (
         SELECT string_agg(a.attnum::text, ',') 
         FROM pg_attribute a 
         WHERE a.attrelid = 'users'::regclass AND a.attname = 'clerk_user_id'
       )`
  );
  for (const row of constraints.rows) {
    await q(`ALTER TABLE users DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    console.log(`  Dropped unique constraint: ${row.conname}`);
  }

  // Also try the predictable name pattern
  await q(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_clerk_user_id_key`);

  // 3. Drop the column
  await q(`ALTER TABLE users DROP COLUMN IF EXISTS clerk_user_id`);
  console.log('✅ users.clerk_user_id column dropped');

  // 4. Recreate the users_public view without clerk_user_id (if it exists)
  const viewExists = await pool.query(
    `SELECT 1 FROM information_schema.views WHERE table_name = 'users_public'`
  );
  if (viewExists.rowCount > 0) {
    // Get current view definition
    const viewDef = await pool.query(
      `SELECT definition FROM pg_views WHERE viewname = 'users_public'`
    );
    const def = viewDef.rows[0]?.definition ?? '';
    if (def.includes('clerk_user_id')) {
      // Recreate without that column
      await q(`DROP VIEW IF EXISTS users_public CASCADE`);
      await q(`
        CREATE VIEW users_public AS
        SELECT
          id,
          name,
          user_type,
          display_phone,
          phone_last4,
          email,
          email_normalized,
          is_active,
          created_at,
          updated_at,
          preferred_language,
          password_change_required
        FROM users
      `);
      console.log('✅ users_public view recreated without clerk_user_id');
    } else {
      console.log('✅ users_public view does not reference clerk_user_id — unchanged');
    }
  }

  await pool.end();
  console.log('\n✅ clerk_user_id fully removed from database');
}

run().catch(e => {
  console.error('\n❌ Fatal:', e.message);
  pool.end();
  process.exit(1);
});
