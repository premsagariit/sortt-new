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

const PHONE_HASH_SECRET = process.env.PHONE_HASH_SECRET;
const OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET;
const META_TOKEN = process.env.META_WHATSAPP_TOKEN;
const META_PHONE_ID = process.env.META_PHONE_NUMBER_ID;
const META_TEMPLATE = process.env.META_OTP_TEMPLATE_NAME || 'Sortt_OTP';
const META_API_VERSION = process.env.META_API_VERSION || 'v22.0';
const LOG_PLAINTEXT_OTP = process.env.LOG_PLAINTEXT_OTP === 'true';

type AuthMode = 'login' | 'signup';

// Utility to compute HMAC
const computeHmac = (data: string, secret: string) => {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

const normalizeIndianPhone = (raw: string): string | null => {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    if (!/^[6-9]\d{9}$/.test(local)) return null;
    return `+91${local}`;
};

const isValidMode = (value: unknown): value is AuthMode => value === 'login' || value === 'signup';

const isMetaTemplateParamMismatch = (error: any): boolean => {
    const code = error?.response?.data?.error?.code;
    const details = String(error?.response?.data?.error?.error_data?.details ?? '').toLowerCase();
    return code === 132000 && details.includes('number of localizable_params');
};

const getOrCreateClerkUserId = async (phoneHmac: string): Promise<string> => {
    const existing = await clerkClient.users.getUserList({ externalId: [phoneHmac] });
    if (existing.data && existing.data.length > 0) {
        return existing.data[0].id;
    }

    const created = await clerkClient.users.createUser({
        externalId: phoneHmac,
        username: `u_${phoneHmac.slice(0, 16)}`,
        password: crypto.randomBytes(32).toString('hex'),
    });
    return created.id;
};

router.post('/request-otp', async (req: Request, res: Response) => {
    if (!PHONE_HASH_SECRET || !OTP_HMAC_SECRET) {
        return res.status(500).json({ error: 'Server auth configuration missing' });
    }

    const { phone, mode } = req.body as { phone?: string; mode?: AuthMode };
    const normalizedPhone = normalizeIndianPhone(phone || '');

    if (!normalizedPhone) {
        return res.status(400).json({ error: 'Invalid Indian phone number' });
    }

    if (!isValidMode(mode)) {
        return res.status(400).json({ error: 'mode must be login or signup' });
    }

    const phoneHmac = computeHmac(normalizedPhone, PHONE_HASH_SECRET);

    // Rate limiting per phone hash
    if (otpRequestPhoneLimiter) {
        const { success } = await otpRequestPhoneLimiter.limit(phoneHmac);
        if (!success) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
    }

    try {
        const existingUser = await query(
            `SELECT id FROM users WHERE phone_hash = $1 LIMIT 1`,
            [phoneHmac]
        );

        const userExists = (existingUser.rowCount ?? 0) > 0;

        if (mode === 'login' && !userExists) {
            return res.status(404).json({ error: 'no_account', message: 'No account found with this number.' });
        }

        if (mode === 'signup' && userExists) {
            return res.status(409).json({ error: 'account_exists', message: 'An account already exists with this number.' });
        }

        // Generate OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHmac = computeHmac(otp, OTP_HMAC_SECRET);

        // Store OTP HMAC in Redis (300s TTL)
        if (redis) {
            await redis.set(`otp:phone:${phoneHmac}`, otpHmac, { ex: 300 });
            await redis.set(`otp:mode:${phoneHmac}`, mode, { ex: 300 });
        }

        // Increment Meta Counter & alert if nearing quota
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const convCount = await incrementMetaConvCount(currentMonth);
        if (convCount >= 900) {
            Sentry.captureMessage('Meta WhatsApp quota approaching 1000 free conversations', { level: 'warning' });
        }

        // ── Send OTP via Meta WhatsApp Cloud API ──────────────────────────────
        // The template MUST be an approved "authentication" category template.
        // Always inject body + url-button components so the OTP appears in the
        // message. The hello_world template does NOT accept components — if you
        // are still using it, replace META_OTP_TEMPLATE_NAME in Azure env with
        // your approved authentication template name.
        const whatsappConfigured = !!(META_TOKEN && META_PHONE_ID);
        if (whatsappConfigured) {
            const sendTemplateMessage = async (template: any) => {
                await axios.post(
                    `https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_ID}/messages`,
                    {
                        messaging_product: 'whatsapp',
                        to: normalizedPhone.replace('+', ''),
                        type: 'template',
                        template
                    },
                    { headers: { Authorization: `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' } }
                );
            };

            const templateWithOtpParams: any = {
                name: META_TEMPLATE,
                language: { code: 'en_US' },
                components: [
                    { type: 'body', parameters: [{ type: 'text', text: otp }] },
                    { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] }
                ]
            };

            const templateWithoutParams: any = {
                name: META_TEMPLATE,
                language: { code: 'en_US' },
            };

            try {
                await sendTemplateMessage(templateWithOtpParams);
                console.log(`[OTP] WhatsApp OTP sent to ...${normalizedPhone.slice(-4)} using parameterized template payload.`);
            } catch (metaErr: any) {
                if (isMetaTemplateParamMismatch(metaErr)) {
                    try {
                        console.warn('[OTP] WhatsApp template parameter mismatch detected. Retrying without template components.');
                        await sendTemplateMessage(templateWithoutParams);
                        console.log(`[OTP] WhatsApp OTP sent to ...${normalizedPhone.slice(-4)} using zero-parameter template payload.`);
                    } catch (retryErr: any) {
                        console.warn('[OTP] WhatsApp send retry failed (non-fatal):', retryErr?.response?.data || retryErr?.message);
                        Sentry.captureException(retryErr, { level: 'warning' });
                    }
                } else {
                    // Non-fatal: OTP is already stored in Redis.
                    // Common causes:
                    //   - Template not approved yet → change META_OTP_TEMPLATE_NAME
                    //   - Recipient number not whitelisted in Meta test sandbox
                    //   - hello_world template used (doesn't accept components)
                    console.warn('[OTP] WhatsApp send failed (non-fatal):', metaErr?.response?.data || metaErr?.message);
                    Sentry.captureException(metaErr, { level: 'warning' });
                }
            }
        } else {
            console.warn('[OTP] META_TOKEN or META_PHONE_ID not set — WhatsApp delivery skipped. OTP is held in Redis only.');
        }


        // Log OTP code to terminal for developer testing.
        // In production, only log when explicitly enabled via LOG_PLAINTEXT_OTP=true.
        if (process.env.NODE_ENV !== 'production' || LOG_PLAINTEXT_OTP) {
            console.log(`[OTP DEV] Testing Code for ${normalizedPhone.slice(-4)}: ${otp}`);
        }
        const expiresAt = new Date(Date.now() + 300 * 1000); // 5 min, matches Redis TTL

        // Audit Log (HMAC is not persisted - Security X3)
        await query(
            `INSERT INTO otp_log (phone_hash, otp_hmac, expires_at)
            VALUES ($1, $2, $3)`,
            [phoneHmac, 'otp_sent', expiresAt]
        );


        // In dev mode (no Meta keys) expose the OTP in the response so the
        // mobile app can auto-fill it without needing Azure log access.
        // NEVER include dev_otp when WhatsApp is configured (production).
        const devOtp = whatsappConfigured ? undefined : otp;

        res.json({ success: true, ...(devOtp !== undefined && { dev_otp: devOtp }) });
    } catch (error: any) {
        console.error('[OTP] Request OTP Error:', error?.message || error);
        if (error?.response?.data) console.error('[OTP] API Error detail:', error.response.data);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to request OTP' });
    }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
    if (!PHONE_HASH_SECRET || !OTP_HMAC_SECRET) {
        return res.status(500).json({ error: 'Server auth configuration missing' });
    }

    const { phone, otp } = req.body as { phone?: string; otp?: string };

    const normalizedPhone = normalizeIndianPhone(phone || '');
    if (!normalizedPhone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const phoneHmac = computeHmac(normalizedPhone, PHONE_HASH_SECRET);

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
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        const submittedHmac = computeHmac(otp, OTP_HMAC_SECRET);
        const isValid = crypto.timingSafeEqual(Buffer.from(storedHmac), Buffer.from(submittedHmac));

        if (!isValid) {
            await query(`INSERT INTO otp_log (phone_hash, otp_hmac, expires_at) VALUES ($1, 'otp_failed', NOW())`, [phoneHmac]);
            return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });
        }

        const mode = await redis.get<AuthMode>(`otp:mode:${phoneHmac}`);
        await redis.del(`otp:mode:${phoneHmac}`);

        if (!isValidMode(mode)) {
            return res.status(400).json({ error: 'OTP mode missing or expired. Please request a new OTP.' });
        }

        // Enforce one-time OTP use only after successful validation
        await redis.del(`otp:phone:${phoneHmac}`);

        // OTP Verified successfully
        await query(`INSERT INTO otp_log (phone_hash, otp_hmac, expires_at) VALUES ($1, 'otp_verified', NOW())`, [phoneHmac]);

        let userRecord: { id: string; user_type: 'seller' | 'aggregator' | null; is_active: boolean; clerk_user_id: string; };
        let isNewUser = false;

        if (mode === 'signup') {
            const clerkUserId = await getOrCreateClerkUserId(phoneHmac);
            const phoneLast4 = normalizedPhone.slice(-4);
            try {
                const insertResult = await query(
                    `INSERT INTO users (clerk_user_id, phone_hash, phone_last4, user_type, is_active, name, display_phone, created_at, last_seen)
                     VALUES ($1, $2, $3, $4, true, $5, $6, NOW(), NOW())
                     RETURNING id, user_type, is_active, clerk_user_id`,
                    [clerkUserId, phoneHmac, phoneLast4, 'seller', `User ${phoneLast4}`, normalizedPhone]
                );
                userRecord = insertResult.rows[0];
                isNewUser = true;
            } catch (dbError: any) {
                if (dbError?.code === '23505') {
                    return res.status(409).json({ error: 'account_exists', message: 'Account already exists. Please log in.' });
                }
                throw dbError;
            }
        } else {
            const updateResult = await query(
                `UPDATE users
                 SET last_seen = NOW()
                 WHERE phone_hash = $1
                 RETURNING id, user_type, is_active, clerk_user_id`,
                [phoneHmac]
            );

            if (updateResult.rowCount === 0) {
                return res.status(404).json({ error: 'no_account' });
            }

            userRecord = updateResult.rows[0];
            if (!userRecord.is_active) {
                return res.status(403).json({ error: 'account_suspended' });
            }
            isNewUser = false;
        }

        // Generate SignIn Token for Frontend (Ticket Strategy)
        const signInToken = await clerkClient.signInTokens.createSignInToken({
            userId: userRecord.clerk_user_id,
            expiresInSeconds: 60 * 5, // 5 minutes validity
        });

        // Return safe user DTO (excluding phone_hash and clerk_user_id)
        res.json({
            token: { jwt: signInToken.token },
            user: {
                id: userRecord.id,
                user_type: isNewUser ? null : userRecord.user_type,
            },
            is_new_user: isNewUser,
        });

    } catch (error: any) {
        console.error('Verify OTP Error:', error?.message || error);
        if (error?.errors?.[0]) console.error('Clerk Error:', error.errors[0].code, error.errors[0].message);
        Sentry.captureException(error);
        res.status(500).json({ error: error?.errors?.[0]?.message || 'Internal Server Error' });
    }
});

export default router;
