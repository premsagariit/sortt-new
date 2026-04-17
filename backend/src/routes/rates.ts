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

async function getPriceIndexColumnSupport() {
        const result = await query(`
                SELECT EXISTS (
                        SELECT 1
                            FROM information_schema.columns
                         WHERE table_schema = 'public'
                             AND table_name = 'price_index'
                             AND column_name = 'previous_rate_per_kg'
                ) AS has_previous_rate_per_kg,
                EXISTS (
                        SELECT 1
                            FROM information_schema.columns
                         WHERE table_schema = 'public'
                             AND table_name = 'price_index'
                             AND column_name = 'change_percent'
                ) AS has_change_percent
        `);

        return {
                hasPreviousRatePerKg: Boolean(result.rows[0]?.has_previous_rate_per_kg),
                hasChangePercent: Boolean(result.rows[0]?.has_change_percent),
        };
}

function computeTrend(code: string, rate: number): 'up' | 'down' | 'flat' {
  const baseline = BASELINE_RATES[code];
  if (baseline === undefined) return 'flat';
  if (rate > baseline) return 'up';
  if (rate < baseline) return 'down';
  return 'flat';
}

function computeTrendFromChange(changePercent: number | null | undefined, fallbackRate: number, code: string) {
    if (typeof changePercent === 'number' && Number.isFinite(changePercent)) {
        if (changePercent > 0) return 'up' as const;
        if (changePercent < 0) return 'down' as const;
        return 'flat' as const;
    }

    return computeTrend(code, fallbackRate);
}

// GET /api/rates — PUBLIC (no auth, exempted in auth.ts)
// V17: Cache-Control + ETag headers required
// Reads latest row per (city_code, material_code) directly from price_index
// to avoid stale materialized-view lag after manual admin overrides.
router.get('/', async (req: Request, res: Response) => {
    try {
                const language = resolveRequestLanguage({
                        explicit: typeof req.query.language === 'string' ? req.query.language : null,
                        header: typeof req.headers['accept-language'] === 'string' ? req.headers['accept-language'] : null,
                        userPreferred: (req as any).user?.preferred_language ?? null,
                });
        const cityCode = typeof req.query.city_code === 'string' && req.query.city_code.trim()
          ? req.query.city_code.trim().toUpperCase()
          : 'HYD';

    const { hasPreviousRatePerKg, hasChangePercent } = await getPriceIndexColumnSupport();
    const previousRateSelect = hasPreviousRatePerKg ? 'p.previous_rate_per_kg' : 'NULL::numeric AS previous_rate_per_kg';
    const changePercentSelect = hasChangePercent ? 'p.change_percent' : 'NULL::numeric AS change_percent';

        const result = await query(`
                        WITH latest AS (
                            SELECT DISTINCT ON (p.city_code, LOWER(p.material_code))
                                     p.city_code,
                                     LOWER(p.material_code) AS material_code,
                                     p.rate_per_kg,
                     ${previousRateSelect},
                     ${changePercentSelect},
                                     p.scraped_at
                              FROM price_index p
                             WHERE p.city_code = $2
                             ORDER BY p.city_code, LOWER(p.material_code), p.scraped_at DESC, p.id DESC
                        )
                        SELECT c.city_code,
                                     c.material_code,
                                     c.rate_per_kg,
                                     c.previous_rate_per_kg,
                                     c.change_percent,
                                     c.scraped_at,
                                     COALESCE(
                                         CASE
                                             WHEN $1 = 'te' THEN mt.label_te
                                             WHEN $1 = 'hi' THEN to_jsonb(mt) ->> 'label_hi'
                                             ELSE mt.label_en
                                         END,
                                         mt.label_en
                                     ) AS material_label
                        FROM latest c
                        LEFT JOIN material_types mt ON mt.code = c.material_code
                        ORDER BY c.material_code
                `, [language, cityCode]);

        // Enrich with display name and trend before sending
        const rates = result.rows.map((r: any) => ({
            city_code:    r.city_code,
            material_code: r.material_code,
            name:          r.material_label ?? MATERIAL_NAMES[r.material_code] ?? r.material_code,
            rate_per_kg:   Number(r.rate_per_kg),
            previous_rate_per_kg: r.previous_rate_per_kg != null ? Number(r.previous_rate_per_kg) : null,
            change_percent: r.change_percent != null ? Number(r.change_percent) : null,
            trend:         computeTrendFromChange(r.change_percent != null ? Number(r.change_percent) : null, Number(r.rate_per_kg), r.material_code),
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

        // Real-time UX: avoid stale caches after admin overrides.
        res.set({
            'Cache-Control': 'no-store, max-age=0',
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
