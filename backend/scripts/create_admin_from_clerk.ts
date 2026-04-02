import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClerkClient } from '@clerk/backend';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { query, pool } = require('../src/lib/db') as typeof import('../src/lib/db');

const email = process.argv[2] ?? 'premsagar.mps.2@gmail.com';
const password = process.argv[3] ?? 'Sagar@789364';

if (!process.env.CLERK_SECRET_KEY) {
  console.error('Missing CLERK_SECRET_KEY');
  process.exit(1);
}

if (!process.env.PHONE_HASH_SECRET) {
  console.error('Missing PHONE_HASH_SECRET');
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

function buildAdminPhoneHash(adminEmail: string): string {
  return crypto
    .createHmac('sha256', process.env.PHONE_HASH_SECRET as string)
    .update(`admin:${adminEmail.trim().toLowerCase()}`)
    .digest('hex');
}

async function ensureAdminUser() {
  const normalizedEmail = email.trim().toLowerCase();
  const [local] = normalizedEmail.split('@');
  const fallbackName = local || 'Admin User';
  const username = (local || 'admin').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'admin';

  try {
    const existing = await clerk.users.getUserList({ emailAddress: [normalizedEmail], limit: 1 });

    let clerkUserId: string;
    if (existing.data.length > 0) {
      clerkUserId = existing.data[0].id;
      await clerk.users.updateUser(clerkUserId, {
        password,
        username,
        firstName: existing.data[0].firstName ?? 'Sortt',
        lastName: existing.data[0].lastName ?? 'Admin',
      });
      console.log(`Reused existing Clerk user: ${clerkUserId}`);
    } else {
      const created = await clerk.users.createUser({
        emailAddress: [normalizedEmail],
        password,
        username,
        firstName: 'Sortt',
        lastName: 'Admin',
      });
      clerkUserId = created.id;
      console.log(`Created new Clerk user: ${clerkUserId}`);
    }

    const phoneHash = buildAdminPhoneHash(normalizedEmail);

    const upsert = await query(
      `INSERT INTO users (
        clerk_user_id,
        phone_hash,
        phone_last4,
        name,
        user_type,
        is_active,
        preferred_language,
        email,
        email_normalized,
        display_phone,
        created_at,
        last_seen
      )
      VALUES ($1, $2, '0000', $3, 'admin', true, 'en', $4, $5, NULL, NOW(), NOW())
      ON CONFLICT (clerk_user_id)
      DO UPDATE SET
        user_type = 'admin',
        is_active = true,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        email_normalized = EXCLUDED.email_normalized,
        preferred_language = COALESCE(users.preferred_language, 'en'),
        last_seen = NOW()
      RETURNING id, clerk_user_id, user_type, is_active, name`,
      [clerkUserId, phoneHash, fallbackName, normalizedEmail, normalizedEmail]
    );

    console.log('Admin DB row synced:', upsert.rows[0]);
    console.log('Admin email:', normalizedEmail);
    console.log('Admin password reset/applied successfully.');
  } catch (error: any) {
    console.error('Failed to create/sync admin account:', error?.message ?? error);
    if (error?.errors) {
      console.error('Clerk details:', JSON.stringify(error.errors, null, 2));
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void ensureAdminUser();
