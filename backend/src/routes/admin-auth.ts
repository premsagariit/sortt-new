/**
 * backend/src/routes/admin-auth.ts
 * ─────────────────────────────────────────────────────────────────
 * Admin authentication — email/password, Clerk-free.
 * All tokens issued via jose (issueToken / verifyAppToken from lib/jwt).
 * ─────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { redis } from '../lib/redis';
import { issueToken, verifyAppToken } from '../lib/jwt';

const router = Router();

const ADMIN_MAX_ATTEMPTS = 10;
const ADMIN_LOCKOUT_DURATION = 15 * 60; // 15 mins in seconds

/**
 * Resolves a Bearer token to a user row.
 * Returns null if token is absent, invalid, or user inactive/not found.
 */
async function getAuthenticatedUser(req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);

    let userId: string;
    try {
        const payload = await verifyAppToken(token);
        userId = payload.sub;
    } catch {
        return null;
    }

    const result = await query(
        `SELECT id, user_type, is_active
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [userId]
    );

    if ((result.rowCount ?? 0) === 0) return null;

    const user = result.rows[0];
    if (!user.is_active) return null;

    return user;
}

// ── POST /api/admin/auth/login ────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Lockout check
        const attemptKey = `admin_login_attempts:${normalizedEmail}`;
        const attemptsStr = await redis?.get<string>(attemptKey);
        const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

        if (attempts >= ADMIN_MAX_ATTEMPTS) {
            return res.status(429).json({
                error: 'account_locked',
                message: 'Account locked due to too many failed attempts.',
                attempts,
                maxAttempts: ADMIN_MAX_ATTEMPTS
            });
        }

        const userResult = await query(
            `SELECT id, user_type, password_hash, is_active, password_change_required
             FROM users
             WHERE email = $1
             LIMIT 1`,
            [normalizedEmail]
        );

        if ((userResult.rowCount ?? 0) === 0) {
            await redis?.incr(attemptKey);
            await redis?.expire(attemptKey, ADMIN_LOCKOUT_DURATION);
            return res.status(401).json({
                error: 'invalid_credentials',
                message: 'Incorrect email or password',
                attempts: attempts + 1,
                maxAttempts: ADMIN_MAX_ATTEMPTS
            });
        }

        const userRecord = userResult.rows[0];

        if (userRecord.user_type !== 'admin') {
            return res.status(403).json({ error: 'not_admin', message: 'Invalid admin access.' });
        }

        if (!userRecord.is_active) {
            return res.status(403).json({ error: 'account_suspended' });
        }

        if (!userRecord.password_hash) {
            return res.status(400).json({ error: 'password_not_set', message: 'Admin account has no password set.' });
        }

        const isMatch = await bcrypt.compare(password, userRecord.password_hash);

        if (!isMatch) {
            await redis?.incr(attemptKey);
            await redis?.expire(attemptKey, ADMIN_LOCKOUT_DURATION);
            return res.status(401).json({
                error: 'invalid_credentials',
                message: 'Incorrect email or password',
                attempts: attempts + 1,
                maxAttempts: ADMIN_MAX_ATTEMPTS
            });
        }

        // Success — reset attempts
        await redis?.del(attemptKey);

        // Issue 15-min admin JWT
        const adminJwt = await issueToken(userRecord.id, '15m');

        console.log(`[AUDIT] Admin Login: ${normalizedEmail}`);

        return res.json({
            token: { jwt: adminJwt },
            user: {
                id: userRecord.id,
                user_type: userRecord.user_type,
            },
            must_change_password: Boolean(userRecord.password_change_required),
        });

    } catch (error: any) {
        console.error('Admin Login Error:', error?.message || error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── POST /api/admin/auth/request-access ──────────────────────────
router.post('/request-access', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const normalizedEmail = email.toLowerCase().trim();

        const existing = await query(
            `SELECT status FROM admin_access_requests WHERE email = $1`,
            [normalizedEmail]
        );
        if (existing.rowCount && existing.rowCount > 0) {
            return res.status(409).json({ error: 'request_exists', status: existing.rows[0].status });
        }

        await query(`INSERT INTO admin_access_requests (email) VALUES ($1)`, [normalizedEmail]);
        console.log(`[AUDIT] Admin Access Requested: ${normalizedEmail}`);

        return res.json({ success: true, message: 'Request submitted' });
    } catch (error: any) {
        console.error('Request Access Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── POST /api/admin/auth/forgot-password ─────────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const normalizedEmail = email.toLowerCase().trim();

        const user = await query(
            `SELECT id FROM users WHERE email = $1 AND user_type = 'admin'`,
            [normalizedEmail]
        );
        if ((user.rowCount ?? 0) === 0) {
            return res.json({ success: true, message: 'If registered, a reset link was generated.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenKey = `admin_reset:${resetToken}`;
        await redis?.set(tokenKey, normalizedEmail, { ex: 15 * 60 });

        console.log(`\n\n[ADMIN] 🔒 PASSWORD RESET LINK:`);
        console.log(`http://localhost:3000/admin/reset-password?token=${resetToken}\n\n`);

        return res.json({ success: true, message: 'If registered, a reset link was generated.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── POST /api/admin/auth/reset-password ──────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and newPassword are required' });
        }

        const tokenKey = `admin_reset:${token}`;
        const email = await redis?.get<string>(tokenKey);

        if (!email) {
            return res.status(400).json({ error: 'invalid_token', message: 'Reset token is invalid or expired.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await query(
            `UPDATE users
             SET password_hash = $1,
                 password_change_required = false,
                 password_updated_at = NOW()
             WHERE email = $2 AND user_type = 'admin'`,
            [hash, email]
        );

        await redis?.del(tokenKey);

        console.log(`[AUDIT] Password reset for ${email}`);

        return res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ── POST /api/admin/auth/change-password ─────────────────────────
router.post('/change-password', async (req: Request, res: Response) => {
    try {
        const currentUser = await getAuthenticatedUser(req);
        const { newPassword } = req.body as { newPassword?: string };

        if (!currentUser || currentUser.user_type !== 'admin') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (
            !newPassword ||
            newPassword.length < 12 ||
            !/\d/.test(newPassword) ||
            !/[^A-Za-z0-9]/.test(newPassword)
        ) {
            return res.status(400).json({
                error: 'weak_password',
                message: 'Password must be at least 12 characters and include a number and a special character.',
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await query(
            `UPDATE users
             SET password_hash = $1,
                 password_change_required = false,
                 password_updated_at = NOW()
             WHERE id = $2 AND user_type = 'admin'`,
            [hash, currentUser.id]
        );

        console.log(`[AUDIT] Admin password changed for id: ${currentUser.id}`);

        return res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
        console.error('Change Password Error:', error?.message || error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
