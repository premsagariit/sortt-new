/**
 * backend/scripts/setup_super_admin.ts
 * ─────────────────────────────────────────────────────────────────
 * Fixes/recreates the Super Admin account.
 * Deletes only the existing admin row (preserves sellers/aggregators).
 * Uses the real phone for phone_hash + phone_last4.
 *
 * Run: npx ts-node --require dotenv/config scripts/setup_super_admin.ts
 * ─────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const PHONE_HASH_SECRET = process.env.PHONE_HASH_SECRET ?? 'sortt-phone-secret';

function hashPhone(normalizedPhone: string): string {
  return crypto.createHmac('sha256', PHONE_HASH_SECRET).update(normalizedPhone).digest('hex');
}

async function run() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting super admin fix...');
    await client.query('BEGIN');

    // ── Delete existing admin users only ────────────────────────
    console.log('🗑️  Removing existing admin accounts...');
    await client.query(`DELETE FROM admin_audit_log WHERE actor_id IN (SELECT id FROM users WHERE user_type = 'admin')`);
    await client.query(`DELETE FROM users WHERE user_type = 'admin'`);
    console.log('✅ Old admin accounts removed.');

    // ── Admin account details ───────────────────────────────────
    const name        = 'Prem Sagar';
    const email       = 'premsagar.2mps@gmail.com';
    const rawPhone    = '7981576207';                     // 10-digit local phone
    const normalizedPhone = `+91${rawPhone}`;            // +917981576207
    const phoneLast4  = rawPhone.slice(-4);              // 6207
    const rawPassword = 'Sortt@123';
    const userType    = 'admin';

    // Proper phone hash (same algorithm as auth.ts)
    const phoneHash = hashPhone(normalizedPhone);

    // ID format for admin: admin_{name_snake}
    // (no timestamp — fixed, deterministic)
    const namePart = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
    const adminId  = `admin_${namePart}`;

    // Password hash
    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    await client.query(
      `INSERT INTO users (
        id, name, email, phone_hash, phone_last4, display_phone, user_type, is_active,
        password_hash, password_change_required,
        created_at, last_seen
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, true, NOW(), NOW())`,
      [adminId, name, email, phoneHash, phoneLast4, normalizedPhone, userType, passwordHash]
    );

    console.log(`\n✅ Super Admin created:`);
    console.log(`   ID:                   ${adminId}`);
    console.log(`   Name:                 ${name}`);
    console.log(`   Email:                ${email}`);
    console.log(`   Phone:                ${normalizedPhone}  (last4: ${phoneLast4})`);
    console.log(`   User Type:            ${userType}`);
    console.log(`   Password:             ${rawPassword}  ← change this on first login`);
    console.log(`   Password Change Req:  true`);

    await client.query('COMMIT');
    console.log('\n✅ Setup complete!\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Setup failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
