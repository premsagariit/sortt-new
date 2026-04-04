import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createClerkClient, verifyToken } from '@clerk/backend';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { redis } from '../lib/redis';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'sortt-admin-dev-secret-change-in-prod';
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const router = Router();

// Rate limiter for admin login attempts based on email
const ADMIN_MAX_ATTEMPTS = 10;
const ADMIN_LOCKOUT_DURATION = 15 * 60; // 15 mins

async function getAuthenticatedUser(req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    let clerkUserId: string | null = null;
    let adminUserId: string | null = null;

    try {
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY!,
            authorizedParties: [],
        });
        clerkUserId = payload.sub;
    } catch {
        try {
            const payload = jwt.verify(token, ADMIN_JWT_SECRET) as jwt.JwtPayload;
            if (payload?.sub) {
                adminUserId = payload.sub;
            } else {
                return null;
            }
        } catch {
            return null;
        }
    }

    const result = clerkUserId
        ? await query(
            `SELECT id, user_type, is_active, clerk_user_id
             FROM users
             WHERE clerk_user_id = $1
             LIMIT 1`,
            [clerkUserId]
          )
        : await query(
            `SELECT id, user_type, is_active, clerk_user_id
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [adminUserId]
          );

    if (result.rowCount === 0) {
        return null;
    }

    const user = result.rows[0];
    if (!user.is_active) {
        return null;
    }

    return user;
}

router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. IP Check Simulation (From Reference UI Note: IP Check happens server-side first)
        // If we decide to enforce an allowlist, check it here:
        // if (!CLIENT_IP_IN_ALLOWLIST) return res.status(403).json({ error: 'unauthorized_network' });

        // 2. Lockout Check
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

        // 3. User verification
                const userResult = await query(
                    `SELECT id, user_type, clerk_user_id, password_hash, is_active, password_change_required
                     FROM users
                     WHERE email_normalized = $1
                     LIMIT 1`,
                    [normalizedEmail]
                );

        if (userResult.rowCount === 0) {
            await redis?.incr(attemptKey);
            await redis?.expire(attemptKey, ADMIN_LOCKOUT_DURATION);
            return res.status(401).json({ error: 'invalid_credentials', message: 'Incorrect email or password', attempts: attempts + 1, maxAttempts: ADMIN_MAX_ATTEMPTS });
        }

        const userRecord = userResult.rows[0];

                if (userRecord.user_type !== 'admin') {
                    return res.status(403).json({
                        error: 'not_admin',
                        message: 'Invalid admin access.',
                    });
                }

        if (!userRecord.is_active) {
            return res.status(403).json({ error: 'account_suspended' });
        }

        if (!userRecord.password_hash) {
            return res.status(400).json({ error: 'password_not_set', message: 'Admin account has no password set.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, userRecord.password_hash);

        if (!isMatch) {
            await redis?.incr(attemptKey);
            await redis?.expire(attemptKey, ADMIN_LOCKOUT_DURATION);
            return res.status(401).json({ error: 'invalid_credentials', message: 'Incorrect email or password', attempts: attempts + 1, maxAttempts: ADMIN_MAX_ATTEMPTS });
        }

        // On success, reset attempts
        await redis?.del(attemptKey);

        // Issue a self-signed JWT for admin (no Clerk dependency for admin accounts)
        // The AdminAuthGuard calls /api/users/me with this token
        const adminJwt = jwt.sign(
            {
                sub: userRecord.id,
                user_type: 'admin',
                clerk_user_id: userRecord.clerk_user_id,
            },
            ADMIN_JWT_SECRET,
            { expiresIn: '15m' }
        );

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

router.post('/request-access', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const normalizedEmail = email.toLowerCase().trim();

        // Ensure not already pending or approved
        const existing = await query(`SELECT status FROM admin_access_requests WHERE email = $1`, [normalizedEmail]);
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

router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const normalizedEmail = email.toLowerCase().trim();

                const user = await query(
                        `SELECT id
                         FROM users
                         WHERE email_normalized = $1
                             AND user_type = 'admin'`,
                        [normalizedEmail]
                );
        if (user.rowCount === 0) {
            // Generic success message to prevent user enumeration
            return res.json({ success: true, message: 'If registered, a reset link was generated.' });
        }

        // Generate reset token and store in redis (15 min expiry)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenKey = `admin_reset:${resetToken}`;
        await redis?.set(tokenKey, normalizedEmail, { ex: 15 * 60 });

        // LOG TO CONSOLE as requested instead of sending an email during dev
        console.log(`\n\n[ADMIN] 🔒 PASSWORD RESET LINK:`);
        console.log(`http://localhost:3000/admin/reset-password?token=${resetToken}\n\n`);

        return res.json({ success: true, message: 'If registered, a reset link was generated.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token and newPassword are required' });

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
                         WHERE email_normalized = $2
                             AND user_type = 'admin'`,
                        [hash, email]
                );

        // Consume token
        await redis?.del(tokenKey);

        console.log(`[AUDIT] Password reset for ${email}`);

        return res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/change-password', async (req: Request, res: Response) => {
    try {
        const currentUser = await getAuthenticatedUser(req);
        const { newPassword } = req.body as { newPassword?: string };

        if (!currentUser || currentUser.user_type !== 'admin') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!newPassword || newPassword.length < 12 || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
            return res.status(400).json({ error: 'weak_password', message: 'Password must be at least 12 characters and include a number and a special character.' });
        }

        const adminResult = await query(
            `SELECT id, clerk_user_id
             FROM users
             WHERE id = $1
               AND user_type = 'admin'
             LIMIT 1`,
            [currentUser.id]
        );

        if (adminResult.rowCount === 0) {
            return res.status(404).json({ error: 'admin_not_found' });
        }

        const adminRow = adminResult.rows[0];
        if (!adminRow.clerk_user_id) {
            return res.status(400).json({ error: 'clerk_account_missing' });
        }

        await clerk.users.updateUser(adminRow.clerk_user_id, { password: newPassword });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await query(
            `UPDATE users
             SET password_hash = $1,
                 password_change_required = false,
                 password_updated_at = NOW()
             WHERE id = $2
               AND user_type = 'admin'`,
            [hash, currentUser.id]
        );

        return res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
        console.error('Change Password Error:', error?.message || error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
