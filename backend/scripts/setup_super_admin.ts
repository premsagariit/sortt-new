/**
 * backend/scripts/setup_super_admin.ts
 * ─────────────────────────────────────────────────────────────────
 * One-time script to:
 * 1. Delete ALL existing users (and cascade to all related data)
 * 2. Reset order sequences
 * 3. Create the Super Admin account
 *
 * Run: npx ts-node --require dotenv/config scripts/setup_super_admin.ts
 * ─────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting super admin setup...');
    await client.query('BEGIN');

    // ── Step 1: Delete all existing users and cascade data ──────
    console.log('🗑️  Deleting all existing users and cascaded records...');

    // Delete in right order to avoid FK conflicts
    await client.query(`DELETE FROM otp_log`);
    await client.query(`DELETE FROM admin_audit_log`);
    await client.query(`DELETE FROM admin_access_requests`);
    await client.query(`DELETE FROM notifications`);
    await client.query(`DELETE FROM device_tokens`);
    await client.query(`DELETE FROM ratings`);
    await client.query(`DELETE FROM disputes`);
    await client.query(`DELETE FROM invoices`);
    await client.query(`DELETE FROM order_media`);
    await client.query(`DELETE FROM order_items`);
    await client.query(`DELETE FROM orders`);
    await client.query(`DELETE FROM seller_addresses`);
    await client.query(`DELETE FROM seller_profiles`);
    await client.query(`DELETE FROM aggregator_material_rates`);
    await client.query(`DELETE FROM aggregator_availability`);
    await client.query(`DELETE FROM aggregator_order_dismissals`);
    await client.query(`DELETE FROM aggregator_profiles`);
    await client.query(`DELETE FROM business_members`);
    // Messages (partitioned)
    await client.query(`DELETE FROM messages`);
    await client.query(`DELETE FROM users`);

    console.log('✅ All users and related data deleted.');

    // ── Step 2: Run email_normalized migration if column still exists ──
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='email_normalized'
    `);
    if ((colCheck.rowCount ?? 0) > 0) {
      console.log('🔧 Dropping email_normalized column...');
      await client.query(`UPDATE users SET email = email_normalized WHERE email IS NULL AND email_normalized IS NOT NULL`);
      await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS email_normalized`);
      console.log('✅ email_normalized column removed.');
    } else {
      console.log('✅ email_normalized column already removed.');
    }

    // ── Step 3: Create Super Admin account ─────────────────────
    console.log('👤 Creating Super Admin account...');

    const name = 'Prem Sagar';
    const email = 'premsagar.2mps@gmail.com';
    const phone = '7981576207';
    const rawPassword = 'Sortt@123';
    const userType = 'admin';

    // Generate ID in format: admin_{name}_{timestamp36}
    const namePart = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
    const adminId = `admin_${namePart}_${Date.now().toString(36).slice(-6)}`;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // Admin accounts have no real phone — use a deterministic hash of email
    // to satisfy the NOT NULL + UNIQUE phone_hash constraint
    const crypto = await import('crypto');
    const PHONE_HASH_SECRET = process.env.PHONE_HASH_SECRET || 'admin-no-phone';
    const adminPhoneHash = crypto.createHmac('sha256', PHONE_HASH_SECRET).update(`admin:${email}`).digest('hex');

    await client.query(
      `INSERT INTO users (
        id, name, email, phone_hash, phone_last4, user_type, is_active,
        password_hash, password_change_required,
        created_at, last_seen
      ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, true, NOW(), NOW())`,
      [adminId, name, email, adminPhoneHash, '0000', userType, passwordHash]
    );

    console.log(`✅ Super Admin created:`);
    console.log(`   ID: ${adminId}`);
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   User Type: ${userType}`);
    console.log(`   Phone: ${phone} (not stored — admin accounts use email)`);
    console.log(`   Password Change Required: true`);
    console.log(`\n⚠️  IMPORTANT: Log in with email + password, then set a new secure password.`);

    await client.query('COMMIT');
    console.log('\n✅ Setup complete!');

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
