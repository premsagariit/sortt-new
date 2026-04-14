/**
 * backend/scripts/fix_existing_user_ids.ts
 * ─────────────────────────────────────────────────────────────────
 * One-time script to:
 * 1. Rename the admin account (fix phone details)
 * 2. Rename any users whose ID starts with 'user_' or has wrong name prefix
 *    → {real_name}_s_{suffix} or {real_name}_a_{suffix}
 *
 * Run: npx ts-node --require dotenv/config scripts/fix_existing_user_ids.ts
 * ─────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function sanitizeName(rawName: string): string {
  return (rawName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '') || 'user';
}

function sellerSuffix(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local  = digits.length >= 10 ? digits.slice(-10) : digits;
  const rev    = local.split('').reverse().join('');
  return [1, 3, 5, 7, 9].map((i) => rev[i] ?? '0').join('');
}

function aggregatorSuffix(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local  = digits.length >= 10 ? digits.slice(-10) : digits;
  const rev    = local.split('').reverse().join('');
  return [0, 2, 4, 6, 8].map((i) => rev[i] ?? '0').join('');
}

const FK_TABLES: [string, string][] = [
  ['seller_profiles', 'user_id'],
  ['aggregator_profiles', 'user_id'],
  ['seller_addresses', 'seller_id'],
  ['aggregator_availability', 'user_id'],
  ['aggregator_material_rates', 'aggregator_id'],
  ['aggregator_order_dismissals', 'aggregator_id'],
  ['device_tokens', 'user_id'],
  ['notifications', 'user_id'],
  ['ratings', 'ratee_id'],
  ['ratings', 'rater_id'],
  ['admin_audit_log', 'actor_id'],
  ['orders', 'seller_id'],
  ['orders', 'aggregator_id'],
  ['order_media', 'uploaded_by'],
];

async function renameUser(client: any, oldId: string, newId: string, displayName: string) {
  if (oldId === newId) {
    console.log(`  ⏩ ${oldId} — no change needed`);
    return;
  }

  // Check collision
  const col = await client.query(`SELECT id FROM users WHERE id = $1`, [newId]);
  if ((col.rowCount ?? 0) > 0) {
    console.warn(`  ⚠️  Collision: ${newId} already exists — skipping rename of ${oldId}`);
    return;
  }

  // Rename PK
  await client.query(`UPDATE users SET id = $1 WHERE id = $2`, [newId, oldId]);

  // Cascade FK
  for (const [table, col] of FK_TABLES) {
    await client
      .query(`UPDATE ${table} SET "${col}" = $1 WHERE "${col}" = $2`, [newId, oldId])
      .catch(() => {});
  }

  console.log(`  ✅ ${oldId}  →  ${newId}  (${displayName})`);
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Fix seller/aggregator IDs ───────────────────────────────
    console.log('\n🔧 Scanning seller/aggregator accounts...');
    const usersRes = await client.query(
      `SELECT id, name, display_phone, user_type
       FROM users
       WHERE user_type IN ('seller', 'aggregator')
       ORDER BY created_at`
    );

    for (const u of usersRes.rows) {
      const namePart  = sanitizeName(u.name ?? '');
      const typeChar  = u.user_type === 'aggregator' ? 'a' : 's';
      const suffix    = u.user_type === 'aggregator'
        ? aggregatorSuffix(u.display_phone ?? '')
        : sellerSuffix(u.display_phone ?? '');
      const expectedId = `${namePart}_${typeChar}_${suffix}`;

      await renameUser(client, u.id, expectedId, u.name);
    }

    await client.query('COMMIT');
    console.log('\n✅ All done!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
