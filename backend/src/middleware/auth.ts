import { Request, Response, NextFunction } from 'express';
import { requireAuth, getAuth } from '@clerk/express';
import { query } from '../lib/db';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                user_type: string;
                is_active: boolean;
            };
        }
    }
}

const requireAuthStack = [
    (req: Request, res: Response, next: NextFunction) => {
        if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
            console.error('[DIAG] Missing Auth Configuration!', {
                SECRET: !!process.env.CLERK_SECRET_KEY,
                PUBLISHABLE: !!process.env.CLERK_PUBLISHABLE_KEY,
                CWD: process.cwd(),
                ENV_KEYS: Object.keys(process.env).filter(k => k.startsWith('CLERK'))
            });
            return res.status(401).json({ error: 'Unauthorized: Missing Auth Configuration' });
        }
        return requireAuth()(req, res, next);
    },
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId: clerkUserId } = getAuth(req);
            if (!clerkUserId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const result = await query(
                'SELECT id, user_type, is_active FROM users WHERE clerk_user_id = $1',
                [clerkUserId]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'User not found in database' });
            }

            const user = result.rows[0];
            if (!user.is_active) {
                return res.status(401).json({ error: 'User account is inactive' });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Auth DB error:', error);
            res.status(500).json({ error: 'Internal Server Error during authentication' });
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
            console.warn('Authentication rejected by Clerk:', err.message || err);
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
