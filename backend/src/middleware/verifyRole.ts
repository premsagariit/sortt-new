import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { query } from '../lib/db';

// verifyUserRole(userId, requiredRole) which checks Upstash Redis cache (60s TTL) or DB for user_type and is_active.
// Crucially, never read user_type from JWT claims (V7).
export const verifyUserRole = (requiredRole: string | string[]) => {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    return async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated properly' });
        }

        try {
            let userType: string | null = null;
            let isActive: boolean = false;
            const cacheKey = `user_role:${userId}`;

            // Try reading from Redis cache first
            if (redis) {
                const cached = await redis.get<{ user_type: string; is_active: boolean }>(cacheKey);
                if (cached) {
                    userType = cached.user_type;
                    isActive = cached.is_active;
                }
            }

            // If not in cache, query DB
            if (!userType) {
                const result = await query(
                    'SELECT user_type, is_active FROM users WHERE id = $1',
                    [userId]
                );

                if (result.rows.length === 0) {
                    return res.status(401).json({ error: 'User details not found' });
                }

                userType = result.rows[0].user_type;
                isActive = result.rows[0].is_active;

                // Save to cache for 60s
                if (redis) {
                    await redis.set(cacheKey, { user_type: userType, is_active: isActive }, { ex: 60 });
                }
            }

            if (!isActive) {
                return res.status(401).json({ error: 'User account is inactive' });
            }

            if (userType && !roles.includes(userType)) {
                return res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
            }

            next();
        } catch (error) {
            console.error('Role verification error:', error);
            res.status(500).json({ error: 'Internal Server Error during role verification' });
        }
    };
};
