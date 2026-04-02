import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { query, pool } from '../src/lib/db';
import bcrypt from 'bcryptjs';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function setupAdmin() {
    if (!ADMIN_PASSWORD) {
        console.error('❌ Missing ADMIN_PASSWORD in .env');
        process.exit(1);
    }

    try {
        console.log('1. Adding password_hash to users table (if missing)...');
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS password_hash TEXT;
        `);

        console.log('Adding dedicated email columns for admin accounts...');
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS email TEXT,
            ADD COLUMN IF NOT EXISTS email_normalized TEXT,
            ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
        `);

        await query(`
            CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_unique
            ON users (email_normalized)
            WHERE email_normalized IS NOT NULL;
        `);

        console.log('2. Creating admin_access_requests table (if missing)...');
        await query(`
            CREATE TABLE IF NOT EXISTS admin_access_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email TEXT UNIQUE NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                reviewed_at TIMESTAMP WITH TIME ZONE
            );
        `);

        const email = 'premsagar.2iitb@gmail.com';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);

        console.log(`3. Seeding admin user: ${email}...`);
        
        // We simulate a Clerk ID since this is an isolated admin
        const dummyClerkId = `admin_${Date.now()}`;
        const dummyPhoneHash = `admin_phone_${Date.now()}`;

                const existingAdminResult = await query(
                        `SELECT id
                         FROM users
                         WHERE user_type = 'admin'
                             AND email_normalized = $1
                         LIMIT 1`,
                        [email]
                );

        if (existingAdminResult.rowCount && existingAdminResult.rowCount > 0) {
            console.log('Admin already exists. Updating password_hash...');
            await query(
                `UPDATE users
                 SET password_hash = $1,
                     email = $2,
                     email_normalized = $3
                 WHERE user_type = 'admin'
                   AND email_normalized = $3`,
                [hash, email, email]
            );
        } else {
            console.log('Inserting new admin user...');
            await query(`
                INSERT INTO users (
                    clerk_user_id,
                    phone_hash,
                    phone_last4,
                    user_type,
                    is_active,
                    name,
                    email,
                    email_normalized,
                    password_hash,
                    created_at
                )
                VALUES ($1, $2, $3, 'admin', true, 'System Admin', $4, $5, $6, NOW())
            `, [dummyClerkId, dummyPhoneHash, '0000', email, email, hash]);
        }

        console.log('✅ Admin setup complete.');
    } catch (err) {
        console.error('Database setup failed:', err);
    } finally {
        await pool.end();
    }
}

setupAdmin();
