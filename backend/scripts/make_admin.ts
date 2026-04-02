import { query, pool } from '../src/lib/db';
import crypto from 'crypto';

const PHONE_HASH_SECRET = process.env.PHONE_HASH_SECRET;

async function makeAdmin(phoneRaw: string) {
    if (!PHONE_HASH_SECRET) {
        console.error('❌ Missing PHONE_HASH_SECRET in environment.');
        process.exit(1);
    }

    const digits = phoneRaw.replace(/\D/g, '');
    const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    
    if (!/^[6-9]\d{9}$/.test(local)) {
        console.error('❌ Please provide a valid 10-digit Indian phone number.');
        process.exit(1);
    }

    const normalizedPhone = `+91${local}`;
    const phoneHmac = crypto.createHmac('sha256', PHONE_HASH_SECRET)
                            .update(normalizedPhone)
                            .digest('hex');

    try {
        const result = await query(
            `UPDATE users SET user_type = 'admin' WHERE phone_hash = $1 RETURNING id, display_phone`,
            [phoneHmac]
        );

        if (result.rowCount === 0) {
            console.error(`❌ User with phone ${normalizedPhone} not found.`);
            console.log('💡 Please sign up first via the mobile app or request an OTP, then run this script again.');
        } else {
            console.log(`✅ Success! ${result.rows[0].display_phone} is now an Admin.`);
            console.log('You can now log in at http://localhost:3000/admin/login');
        }
    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        await pool.end();
    }
}

const arg = process.argv[2];
if (!arg) {
    console.error('Usage: npx ts-node scripts/make_admin.ts <10-digit-phone>');
    process.exit(1);
}

makeAdmin(arg);
