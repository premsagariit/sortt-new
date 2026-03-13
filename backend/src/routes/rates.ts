import { Router, Request, Response } from 'express';
import etag from 'etag';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';

const router = Router();

// GET /api/rates — PUBLIC (no auth, exempted in auth.ts)
// V17: Cache-Control + ETag headers required
// Queries current_price_index materialized view (refreshed daily by node-cron)
router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT city_code, material_code, rate_per_kg, scraped_at
            FROM current_price_index
            WHERE city_code = 'HYD'
            ORDER BY material_code
        `);

        const payload = {
            rates: result.rows,
            cached_at: new Date().toISOString()
        };
        const body = JSON.stringify(payload);
        const etagValue = etag(body);

        // 304 if client already has this version
        if (req.headers['if-none-match'] === etagValue) {
            return res.status(304).end();
        }

        // V17: Cache-Control + ETag
        res.set({
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
            'ETag': etagValue
        });

        return res.json(payload);
    } catch (e: any) {
        console.error('GET /api/rates error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
