import { Router, Request, Response } from 'express';
import etag from 'etag';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { resolveRequestLanguage } from '../utils/language';

const router = Router();

// ── Material display names (canonical) ────────────────────────────────────────
const MATERIAL_NAMES: Record<string, string> = {
  metal:   'Metal / Iron',
  paper:   'Paper / Cardboard',
  plastic: 'Plastic (PET)',
  ewaste:  'E-Waste',
  fabric:  'Fabric / Cloth',
  glass:   'Glass',
};

// ── Baseline rates for trend computation (update when scraper is live) ─────────
const BASELINE_RATES: Record<string, number> = {
  metal: 28, paper: 12, plastic: 8, ewaste: 60, fabric: 6, glass: 5,
};

function computeTrend(code: string, rate: number): 'up' | 'down' | 'flat' {
  const baseline = BASELINE_RATES[code];
  if (baseline === undefined) return 'flat';
  if (rate > baseline) return 'up';
  if (rate < baseline) return 'down';
  return 'flat';
}

// GET /api/rates — PUBLIC (no auth, exempted in auth.ts)
// V17: Cache-Control + ETag headers required
// Queries current_price_index materialized view (refreshed daily by node-cron)
router.get('/', async (req: Request, res: Response) => {
    try {
                const language = resolveRequestLanguage({
                        explicit: typeof req.query.language === 'string' ? req.query.language : null,
                        header: typeof req.headers['accept-language'] === 'string' ? req.headers['accept-language'] : null,
                        userPreferred: (req as any).user?.preferred_language ?? null,
                });

        const result = await query(`
                        SELECT c.city_code,
                                     c.material_code,
                                     c.rate_per_kg,
                                     c.scraped_at,
                                     COALESCE(
                                         CASE
                                             WHEN $1 = 'te' THEN mt.label_te
                                             WHEN $1 = 'hi' THEN to_jsonb(mt) ->> 'label_hi'
                                             ELSE mt.label_en
                                         END,
                                         mt.label_en
                                     ) AS material_label
                        FROM current_price_index c
                        LEFT JOIN material_types mt ON mt.code = c.material_code
                        ORDER BY c.material_code
                `, [language]);

        // Enrich with display name and trend before sending
        const rates = result.rows.map((r: any) => ({
            city_code:    r.city_code,
            material_code: r.material_code,
            name:          r.material_label ?? MATERIAL_NAMES[r.material_code] ?? r.material_code,
            rate_per_kg:   Number(r.rate_per_kg),
            trend:         computeTrend(r.material_code, Number(r.rate_per_kg)),
            scraped_at:    r.scraped_at,
        }));

        const payload = {
            rates,
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
