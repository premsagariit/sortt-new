import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import { clerkClient } from '@clerk/express';
import { query } from '../lib/db';
import {
    redis,
    otpRequestPhoneLimiter,
    otpVerifyPhoneLimiter,
    incrementMetaConvCount
} from '../lib/redis';
import axios from 'axios';

const router = Router();

const PHONE_HASH_SECRET = process.env.PHONE_HASH_SECRET || 'fallback_phone_secret';
const OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'fallback_otp_secret';
const META_TOKEN = process.env.META_WHATSAPP_TOKEN;
const META_PHONE_ID = process.env.META_PHONE_NUMBER_ID;
const META_TEMPLATE = process.env.META_OTP_TEMPLATE_NAME || 'Sortt_OTP';
const META_API_VERSION = process.env.META_API_VERSION || 'v22.0';

// Utility to compute HMAC
const computeHmac = (data: string, secret: string) => {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

router.post('/request-otp', async (req: Request, res: Response) => {
    const { phone } = req.body;

    if (!phone || !/^(\+91|91)?[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid Indian phone number' });
    }

    const phoneHmac = computeHmac(phone, PHONE_HASH_SECRET);

    // Rate limiting per phone hash
    if (otpRequestPhoneLimiter) {
        const { success } = await otpRequestPhoneLimiter.limit(phoneHmac);
        if (!success) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
    }

    try {
        // Generate OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHmac = computeHmac(otp, OTP_HMAC_SECRET);

        // Store OTP HMAC in Redis (600s TTL)
        if (redis) {
            await redis.set(`otp:phone:${phoneHmac}`, otpHmac, { ex: 600 });
        }

        // Increment Meta Counter & alert if nearing quota
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const convCount = await incrementMetaConvCount(currentMonth);
        if (convCount >= 900) {
            Sentry.captureMessage('Meta WhatsApp quota approaching 1000 free conversations', { level: 'warning' });
        }

        // Send via Meta WhatsApp API (non-fatal — OTP is still stored in Redis)
        if (META_TOKEN && META_PHONE_ID) {
            const isHelloWorld = META_TEMPLATE === 'hello_world';
            const templatePayload: any = {
                name: META_TEMPLATE,
                language: { code: 'en_US' }
            };

            // Only add components if we are not using the generic test template
            if (!isHelloWorld) {
                templatePayload.components = [
                    { type: 'body', parameters: [{ type: 'text', text: otp }] },
                    { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] }
                ];
            }

            try {
                await axios.post(`https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_ID}/messages`, {
                    messaging_product: 'whatsapp',
                    to: phone.replace('+', ''),
                    type: 'template',
                    template: templatePayload
                }, {
                    headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' }
                });
                console.log(`[OTP] WhatsApp message sent to ${phone.slice(-4)} (last 4 digits)`);
            } catch (metaErr: any) {
                // Non-fatal: log and continue. OTP is already in Redis.
                // Dev NOTE: Check if phone is whitelisted in Meta test environment.
                console.warn(`[OTP] WhatsApp send failed (non-fatal):`, metaErr?.response?.data || metaErr?.message);
                Sentry.captureException(metaErr, { level: 'warning' });
            }
        } else {
            console.warn('[OTP] META_TOKEN or META_PHONE_ID not set — WhatsApp message skipped. OTP is in Redis.');
        }


        // Log OTP code to terminal for developer testing (Security: restricted to non-production)
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[OTP DEV] Testing Code for ${phone.slice(-4)}: ${otp}`);
        }
        const expiresAt = new Date(Date.now() + 600 * 1000); // 10 min, matches Redis TTL

        // Audit Log (HMAC is not persisted - Security X3)
        await query(
            `INSERT INTO otp_log (phone_hash, otp_hmac, expires_at)
            VALUES ($1, $2, $3)`,
            [phoneHmac, 'otp_sent', expiresAt]
        );


        res.json({ success: true });
    } catch (error: any) {
        console.error('[OTP] Request OTP Error:', error?.message || error);
        if (error?.response?.data) console.error('[OTP] API Error detail:', error.response.data);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to request OTP' });
    }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
    const { phone, otp, user_type } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const phoneHmac = computeHmac(phone, PHONE_HASH_SECRET);

    if (otpVerifyPhoneLimiter) {
        const { success } = await otpVerifyPhoneLimiter.limit(phoneHmac);
        if (!success) {
            return res.status(429).json({ error: 'Too many verification attempts' });
        }
    }

    try {
        if (!redis) {
            return res.status(500).json({ error: 'Redis unconfigured' });
        }

        const storedHmac = await redis.get<string>(`otp:phone:${phoneHmac}`);
        if (!storedHmac) {
            // Log failure
            await query(`INSERT INTO otp_log (phone_hash, otp_hmac, expires_at) VALUES ($1, 'otp_failed', NOW())`, [phoneHmac]);
            return res.status(400).json({ error: 'OTP expired or not found' });
        }

        const submittedHmac = computeHmac(otp, OTP_HMAC_SECRET);
        const isValid = crypto.timingSafeEqual(Buffer.from(storedHmac), Buffer.from(submittedHmac));

        // Enforce one-time use immediately
        await redis.del(`otp:phone:${phoneHmac}`);

        if (!isValid) {
            await query(`INSERT INTO otp_log (phone_hash, otp_hmac, expires_at) VALUES ($1, 'otp_failed', NOW())`, [phoneHmac]);
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // OTP Verified successfully
        await query(`INSERT INTO otp_log (phone_hash, otp_hmac, expires_at) VALUES ($1, 'otp_verified', NOW())`, [phoneHmac]);
        // UPSERT User based on phone_hash. Create corresponding Clerk User if doesn't exist.
        // NOTE: Clerk does NOT support Indian phone numbers for phone-based auth.
        // We use Clerk purely as an identity/session provider.
        // Users are identified by externalId = phone_hash (HMAC, never raw phone).
        let clerkUserId = null;
        const existingClerkUsers = await clerkClient.users.getUserList({ externalId: [phoneHmac] });
        if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
            clerkUserId = existingClerkUsers.data[0].id;
        } else {
            // Create a Clerk user with externalId = phone_hash.
            // No real PII stored in Clerk — phone data stays in our PostgreSQL DB.
            console.log(`[Clerk] Creating user for ${phoneHmac.slice(0, 8)}...`);
            const newClerkUser = await clerkClient.users.createUser({
                externalId: phoneHmac,
                username: `u_${phoneHmac.slice(0, 16)}`,
                password: crypto.randomBytes(32).toString('hex'),
            });
            clerkUserId = newClerkUser.id;
        }

        const phoneLast4 = phone.slice(-4);
        const requestedUserType = user_type || 'seller';

        const upsertResult = await query(
            `INSERT INTO users (clerk_user_id, phone_hash, phone_last4, user_type, name)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (clerk_user_id)
            DO UPDATE SET phone_last4 = EXCLUDED.phone_last4
            RETURNING id, user_type, is_active, name`,
            [clerkUserId, phoneHmac, phoneLast4, requestedUserType === 'dealer' ? 'aggregator' : requestedUserType, '']
        );

        const userRecord = upsertResult.rows[0];

        // Generate SignIn Token for Frontend
        const sessionResponse = await clerkClient.sessions.createSession({
            userId: clerkUserId,
        });

        const sessionToken = await clerkClient.sessions.getToken(
            sessionResponse.id
        );

        // Return token and safe user DTO (excluding phone_hash and clerk_user_id)
        res.json({
            token: sessionToken,
            user: {
                id: userRecord.id,
                user_type: userRecord.user_type,
                is_active: userRecord.is_active,
                name: userRecord.name
            }
        });

    } catch (error: any) {
        console.error('Verify OTP Error:', error?.message || error);
        if (error?.errors?.[0]) console.error('Clerk Error:', error.errors[0].code, error.errors[0].message);
        Sentry.captureException(error);
        res.status(500).json({ error: error?.errors?.[0]?.message || 'Internal Server Error' });
    }
});

export default router;
