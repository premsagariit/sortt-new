import { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
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
            };
        }
    }
}

// Initialize Clerk Client if needed for other operations, 
// though verifyToken just needs the secret key.
const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!
});

const requireAuthStack = [
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;
            // console.log('TOKEN:', authHeader);
            if (!authHeader?.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Unauthorized: No token' });
            }

            const token = authHeader.substring(7);

            let clerkUserId: string;
            try {
                const payload = await verifyToken(token, {
                    secretKey: process.env.CLERK_SECRET_KEY!,
                    authorizedParties: []
                });
                clerkUserId = payload.sub;
            } catch (e: any) {
                console.warn('[Auth] Token invalid:', e?.message);
                return res.status(401).json({ error: 'Unauthorized: Invalid token' });
            }

            const result = await query(
                `SELECT u.id, u.user_type, u.is_active, u.name,
                        COALESCE(s.locality, a.operating_area) as locality,
                        COALESCE(s.city_code, a.city_code) as city_code
                 FROM users u
                 LEFT JOIN seller_profiles s ON u.id = s.user_id AND u.user_type = 'seller'
                 LEFT JOIN aggregator_profiles a ON u.id = a.user_id AND u.user_type = 'aggregator'
                 WHERE u.clerk_user_id = $1`,
                [clerkUserId]
            );

            if (result.rows.length === 0) {
                console.warn('[Auth] User not found in DB for clerkId:', clerkUserId);
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
    }
];

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    if (
        path === '/health' ||
        path === '/health/' ||
        path.startsWith('/api/auth/') ||
        path.startsWith('/api/rates')
    ) {
        return next();
    }

    // Execute middleware stack
    let idx = 0;
    const executeNext = (err?: any) => {
        if (err) {
            console.warn('Authentication rejected:', err.message || err);
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (idx >= requireAuthStack.length) {
            return next();
        }
        const middleware = requireAuthStack[idx++];
        middleware(req, res, executeNext);
    };

    executeNext();
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
