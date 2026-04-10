/**
 * backend/src/middleware/auth.ts
 * ─────────────────────────────────────────────────────────────────
 * Express auth middleware — Clerk-free, jose-based JWT verification.
 *
 * Flow:
 *  1. Extract Bearer token from Authorization header
 *  2. verifyAppToken() — throws on expiry / invalid signature
 *  3. Look up user by internal UUID (users.id = jwt.sub)
 *  4. Attach req.user; role is fetched from DB, never trusted from JWT
 *
 * Bypass paths: /health, /api/auth/*, /api/rates
 * ─────────────────────────────────────────────────────────────────
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAppToken } from '../lib/jwt';
import { query } from '../lib/db';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                user_type: string;
                is_active: boolean;
                name: string;
                locality: string;
                city_code: string;
                preferred_language: string;
            };
        }
    }
}

const BYPASS_PATHS = new Set(['/health', '/health/']);

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token' });
        }

        const token = authHeader.substring(7);

        let userId: string;
        try {
            const payload = await verifyAppToken(token);
            userId = payload.sub;
        } catch (err: any) {
            const msg = String(err?.code ?? err?.message ?? '').toLowerCase();
            if (msg.includes('expired') || err?.code === 'ERR_JWT_EXPIRED') {
                return res.status(401).json({
                    error: 'token_expired',
                    message: 'Session expired. Please sign in again.',
                });
            }
            console.warn('[Auth] Token invalid:', err?.message);
            return res.status(401).json({
                error: 'invalid_token',
                message: 'Invalid authentication token',
            });
        }

        const result = await query(
            `SELECT u.id, u.user_type, u.is_active, u.name, u.preferred_language,
                    COALESCE(s.locality, a.operating_area) AS locality,
                    COALESCE(s.city_code, a.city_code)     AS city_code
             FROM users u
             LEFT JOIN seller_profiles s    ON u.id = s.user_id    AND u.user_type = 'seller'
             LEFT JOIN aggregator_profiles a ON u.id = a.user_id   AND u.user_type = 'aggregator'
             WHERE u.id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            console.warn('[Auth] User not found in DB for id:', userId);
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }

        const user = result.rows[0];
        if (!user.is_active) {
            return res.status(401).json({ error: 'Unauthorized: Account inactive' });
        }

        req.user = user;
        next();
    } catch (error: any) {
        console.error('[Auth] Unexpected error:', error?.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    if (
        BYPASS_PATHS.has(path) ||
        path.startsWith('/api/auth/') ||
        path.startsWith('/api/rates')
    ) {
        return next();
    }

    requireAuth(req, res, next);
};

export const verifyRole = (requiredRole: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (req.user.user_type !== requiredRole) {
            return res.status(403).json({ error: 'Forbidden: Insufficient role' });
        }
        next();
    };
};
