import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import { clerkClient } from '@clerk/clerk-sdk-node';
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

        // Send via Meta WhatsApp API
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

            await axios.post(`https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_ID}/messages`, {
                messaging_product: 'whatsapp',
                to: phone.replace('+', ''),
                type: 'template',
                template: templatePayload
            }, {
                headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' }
            });
        }

        // Audit Log (HMAC is not persisted - Security X3)
        await query(
            `INSERT INTO otp_log (phone_hash, action, expires_at) VALUES ($1, 'otp_sent', NOW() + INTERVAL '10 minutes')`,
            [phoneHmac]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Request OTP Error:', error);
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
            await query(`INSERT INTO otp_log (phone_hash, action, expires_at) VALUES ($1, 'otp_failed', NOW())`, [phoneHmac]);
            return res.status(400).json({ error: 'OTP expired or not found' });
        }

        const submittedHmac = computeHmac(otp, OTP_HMAC_SECRET);
        const isValid = crypto.timingSafeEqual(Buffer.from(storedHmac), Buffer.from(submittedHmac));

        // Enforce one-time use immediately
        await redis.del(`otp:phone:${phoneHmac}`);

        if (!isValid) {
            await query(`INSERT INTO otp_log (phone_hash, action, expires_at) VALUES ($1, 'otp_failed', NOW())`, [phoneHmac]);
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // OTP Verified successfully
        await query(`INSERT INTO otp_log (phone_hash, action, expires_at) VALUES ($1, 'otp_verified', NOW())`, [phoneHmac]);

        // UPSERT User based on phone_hash. Create corresponding Clerk User if doesn't exist
        // Note: Sortt handles Clerk provisioning server-side for OTP.
        let clerkUserId = null;
        const existingClerkUsers = await clerkClient.users.getUserList({ phoneNumber: [phone] });
        if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
            clerkUserId = existingClerkUsers.data[0].id;
        } else {
            const newClerkUser = await clerkClient.users.createUser({
                phoneNumber: [phone]
            });
            clerkUserId = newClerkUser.id;
        }

        const phoneLast4 = phone.slice(-4);
        const requestedUserType = user_type || 'seller';

        const upsertResult = await query(
            `INSERT INTO users (clerk_user_id, phone_hash, phone_last4, user_type) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (clerk_user_id) 
             DO UPDATE SET phone_last4 = EXCLUDED.phone_last4
             RETURNING id, user_type, is_active, name`,
            [clerkUserId, phoneHmac, phoneLast4, requestedUserType === 'dealer' ? 'aggregator' : requestedUserType]
        );

        const userRecord = upsertResult.rows[0];

        // Generate SignIn Token for Frontend
        const signInToken = await clerkClient.signInTokens.createSignInToken({
            userId: clerkUserId,
            expiresInSeconds: 60 * 5, // 5 minutes validity
        });

        // Return token and safe user DTO (excluding phone_hash and clerk_user_id)
        res.json({
            token: signInToken.token,
            user: {
                id: userRecord.id,
                user_type: userRecord.user_type,
                is_active: userRecord.is_active,
                name: userRecord.name
            }
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
