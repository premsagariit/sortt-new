import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { verifyRole } from '../middleware/auth';
import { storageProvider } from '../lib/storage';
import { publishEvent } from '../lib/realtime';
import { channelName } from '../utils/channelHelper';
import { createNotification } from '../lib/notifications';
import { sendPushToUsers } from '../utils/pushNotifications';
import {
    isAddressInOperatingAreas,
    isPickupWindowWithinSchedule,
    isWithinWorkingHoursNow,
    normalizeAreaValue,
    parseOperatingAreas,
    parseOperatingHoursSchedule,
} from '../utils/availability';

const router = Router();

const sanitizeOperatingAreas = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];

    const seen = new Set<string>();
    const next: string[] = [];

    for (const raw of value) {
        const trimmed = String(raw ?? '').trim();
        if (!trimmed) continue;

        const key = normalizeAreaValue(trimmed);
        if (!key || seen.has(key)) continue;

        seen.add(key);
        next.push(trimmed);
    }

    return next;
};

const toNumberOrNull = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const calculateDistanceKm = (
    sourceLat: number,
    sourceLng: number,
    destinationLat: number,
    destinationLng: number
): number => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const deltaLat = rad(destinationLat - sourceLat);
    const deltaLng = rad(destinationLng - sourceLng);
    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(rad(sourceLat)) * Math.cos(rad(destinationLat)) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Number((earthRadiusKm * c).toFixed(2));
};

const normalizeText = (value: unknown): string =>
    String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const formatDistanceLabel = (distanceKm: number | null, isAreaMatch: boolean): string => {
    if (distanceKm != null && Number.isFinite(distanceKm)) {
        return `${distanceKm.toFixed(1)} km`;
    }
    return isAreaMatch ? 'Nearby' : 'City-wide';
};

const formatOperatingHoursSummary = (rawHours: unknown): string => {
    const schedule = parseOperatingHoursSchedule(rawHours);
    if (!schedule.length) return 'Not set';

    const openDays = schedule.filter((entry) => Boolean(entry?.isOpen));
    if (!openDays.length) return 'Closed';

    const dayNames = openDays.map((entry) => String(entry.day || ''));
    const hasMonSat = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        .every((day) => dayNames.includes(day));
    const hasSunday = dayNames.includes('Sunday');

    const dayLabel =
        openDays.length === 7
            ? 'Daily'
            : (hasMonSat && !hasSunday)
                ? 'Mon-Sat'
                : `${dayNames[0].slice(0, 3)}-${dayNames[dayNames.length - 1].slice(0, 3)}`;

    const firstRange = `${openDays[0].start} - ${openDays[0].end}`;
    return `${dayLabel} · ${firstRange}`;
};

// Multer memory storage configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/heic'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

const kycUploadFields = upload.fields([
    { name: 'aadhaar_front', maxCount: 1 },
    { name: 'aadhaar_back', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'shop_photo', maxCount: 1 },
    { name: 'vehicle_photo', maxCount: 1 }
]);

const handleKycUpload = (req: Request, res: Response, next: any) => {
    kycUploadFields(req, res, (err: any) => {
        if (!err) return next();

        if (err?.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'Photo is too large (max 5MB).' });
        }

        if (err?.message === 'Invalid file type') {
            return res.status(400).json({ error: 'Invalid file type. Use JPEG, PNG, or HEIC.' });
        }

        if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: `Unexpected file field: ${err?.field || 'unknown'}` });
        }

        console.error('KYC Multer Error:', err);
        return res.status(400).json({ error: 'Invalid KYC upload payload.' });
    });
};

// Seller browse list of aggregators in seller city, sorted online-nearest first.
router.get('/browse', verifyRole('seller'), async (req: Request, res: Response) => {
    const sellerId = (req as any).user.id;

    try {
        const sellerCtxRes = await query(
            `SELECT sp.city_code AS profile_city_code,
                    sp.locality AS profile_locality,
                    sa.city_code AS address_city_code,
                    sa.pickup_locality AS address_locality,
                    sa.latitude::float8 AS latitude,
                    sa.longitude::float8 AS longitude
               FROM users u
               LEFT JOIN seller_profiles sp ON sp.user_id = u.id
               LEFT JOIN LATERAL (
                   SELECT city_code, pickup_locality, latitude, longitude
                     FROM seller_addresses
                    WHERE seller_id = u.id
                    ORDER BY is_default DESC, created_at DESC
                    LIMIT 1
               ) sa ON true
              WHERE u.id = $1`,
            [sellerId]
        );

        const sellerCtx = sellerCtxRes.rows[0] ?? {};
        const cityCode = String(
            sellerCtx.address_city_code ?? sellerCtx.profile_city_code ?? req.user?.city_code ?? ''
        ).trim();
        const sellerLocality = String(
            sellerCtx.address_locality ?? sellerCtx.profile_locality ?? req.user?.locality ?? ''
        ).trim();
        const sellerLat = toNumberOrNull(sellerCtx.latitude);
        const sellerLng = toNumberOrNull(sellerCtx.longitude);

        if (!cityCode) {
            return res.status(400).json({ error: 'seller_city_not_set' });
        }

        const browseBaseSelect = `
            SELECT u.id,
                   COALESCE(NULLIF(a.business_name, ''), NULLIF(u.name, ''), 'Aggregator') AS display_name,
                   a.business_name,
                   a.operating_area,
                   a.operating_hours,
                   COALESCE(a.kyc_status, 'pending') AS kyc_status,
                   a.created_at,
                   COALESCE(av.is_online, false) AS is_online,
                   av.last_ping_at,
                   COALESCE(rate_stats.material_codes, '[]'::json) AS material_codes,
                   rate_stats.best_rate_material,
                   rate_stats.best_rate,
                   COALESCE(rating_stats.avg_rating, 0)::float8 AS avg_rating,
                   COALESCE(rating_stats.total_reviews, 0)::int AS total_reviews,
                   COALESCE(order_stats.completed_pickups, 0)::int AS completed_pickups,
                   COALESCE(order_stats.completion_rate, 0)::float8 AS completion_rate,
                   __REP_LAT__,
                   __REP_LNG__
              FROM users u
              JOIN aggregator_profiles a ON a.user_id = u.id
              LEFT JOIN aggregator_availability av ON av.user_id = u.id
              LEFT JOIN LATERAL (
                  SELECT COALESCE(
                             json_agg(DISTINCT r.material_code) FILTER (WHERE r.material_code IS NOT NULL),
                             '[]'::json
                         ) AS material_codes,
                         (array_agg(r.material_code ORDER BY r.rate_per_kg DESC)
                             FILTER (WHERE r.material_code IS NOT NULL))[1] AS best_rate_material,
                         MAX(r.rate_per_kg) FILTER (WHERE r.material_code IS NOT NULL) AS best_rate
                    FROM aggregator_material_rates r
                   WHERE r.aggregator_id = u.id
              ) rate_stats ON true
              LEFT JOIN LATERAL (
                  SELECT ROUND(AVG(rr.score)::numeric, 2) AS avg_rating,
                         COUNT(*)::int AS total_reviews
                    FROM ratings rr
                   WHERE rr.ratee_id = u.id
              ) rating_stats ON true
              LEFT JOIN LATERAL (
                  SELECT COUNT(*) FILTER (WHERE o.status = 'completed')::int AS completed_pickups,
                         CASE
                           WHEN COUNT(*) FILTER (
                             WHERE o.status IN ('accepted','en_route','arrived','weighing_in_progress','completed','cancelled','disputed')
                           ) = 0 THEN 0
                           ELSE ROUND(
                             (COUNT(*) FILTER (WHERE o.status = 'completed')::numeric * 100.0) /
                             COUNT(*) FILTER (
                               WHERE o.status IN ('accepted','en_route','arrived','weighing_in_progress','completed','cancelled','disputed')
                             ),
                             2
                           )
                         END AS completion_rate
                    FROM orders o
                   WHERE o.aggregator_id = u.id
                     AND o.deleted_at IS NULL
              ) order_stats ON true
              __LOCATION_JOIN__
             WHERE u.user_type = 'aggregator'
               AND u.is_active = true
               AND LOWER(TRIM(COALESCE(a.city_code, ''))) = LOWER(TRIM(COALESCE($1::text, '')))
        `;

        let aggregatorRows: any[] = [];
        try {
            const withLocationQuery = browseBaseSelect
                .replace('__REP_LAT__', 'loc.rep_lat::float8 AS rep_lat')
                .replace('__REP_LNG__', 'loc.rep_lng::float8 AS rep_lng')
                .replace(
                    '__LOCATION_JOIN__',
                    `LEFT JOIN LATERAL (
                        SELECT AVG(o.pickup_lat::float8) AS rep_lat,
                               AVG(o.pickup_lng::float8) AS rep_lng
                          FROM orders o
                         WHERE o.aggregator_id = u.id
                           AND o.deleted_at IS NULL
                           AND o.pickup_lat IS NOT NULL
                           AND o.pickup_lng IS NOT NULL
                    ) loc ON true`
                );

            aggregatorRows = (await query(withLocationQuery, [cityCode])).rows;
        } catch (locationErr: any) {
            if (locationErr?.code !== '42703') {
                throw locationErr;
            }

            const withoutLocationQuery = browseBaseSelect
                .replace('__REP_LAT__', 'NULL::float8 AS rep_lat')
                .replace('__REP_LNG__', 'NULL::float8 AS rep_lng')
                .replace('__LOCATION_JOIN__', '');
            aggregatorRows = (await query(withoutLocationQuery, [cityCode])).rows;
        }

        const normalizedSellerLocality = normalizeText(sellerLocality);

        const mapped = aggregatorRows.map((row: any) => {
            const operatingAreas = parseOperatingAreas(row.operating_area);
            const isAreaMatch =
                normalizedSellerLocality.length > 0 &&
                operatingAreas.some((area) => {
                    const normalizedArea = normalizeText(area);
                    return (
                        normalizedArea.length > 0 &&
                        (normalizedArea.includes(normalizedSellerLocality) ||
                            normalizedSellerLocality.includes(normalizedArea))
                    );
                });

            const repLat = toNumberOrNull(row.rep_lat);
            const repLng = toNumberOrNull(row.rep_lng);
            const distanceKm =
                sellerLat != null && sellerLng != null && repLat != null && repLng != null
                    ? calculateDistanceKm(sellerLat, sellerLng, repLat, repLng)
                    : null;

            const rawMaterials = Array.isArray(row.material_codes) ? row.material_codes : [];
            const materialCodes = [...new Set(rawMaterials.map((code: unknown) => String(code).toLowerCase()).filter(Boolean))];

            return {
                id: row.id,
                name: row.display_name,
                initial: String(row.display_name || 'A').charAt(0).toUpperCase(),
                distance: formatDistanceLabel(distanceKm, isAreaMatch),
                distanceKm,
                latitude: repLat,
                longitude: repLng,
                isOnline: Boolean(row.is_online),
                localities: operatingAreas.length > 0 ? operatingAreas.slice(0, 2).join(' · ') : 'City-wide service',
                rating: Number(row.avg_rating ?? 0),
                reviews: Number(row.total_reviews ?? 0),
                materials: materialCodes,
                bestRateMaterial: row.best_rate_material ? String(row.best_rate_material) : null,
                bestRate: row.best_rate != null ? `₹${Number(row.best_rate).toFixed(0)}/kg` : null,
                lastPingAt: row.last_ping_at,
                areaRank: isAreaMatch ? 0 : 1,
            };
        });

        mapped.sort((a, b) => {
            if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
            if (a.areaRank !== b.areaRank) return a.areaRank - b.areaRank;

            if (a.distanceKm == null && b.distanceKm != null) return 1;
            if (a.distanceKm != null && b.distanceKm == null) return -1;
            if (a.distanceKm != null && b.distanceKm != null && a.distanceKm !== b.distanceKm) {
                return a.distanceKm - b.distanceKm;
            }

            const aPing = a.lastPingAt ? new Date(a.lastPingAt).getTime() : 0;
            const bPing = b.lastPingAt ? new Date(b.lastPingAt).getTime() : 0;
            return bPing - aPing;
        });

        return res.json({
            cityCode,
            sellerLocality,
            aggregators: mapped.map(({ lastPingAt, areaRank, ...rest }) => rest),
        });
    } catch (error: any) {
        console.error('GET /api/aggregators/browse error:', error);
        Sentry.captureException(error);
        return res.status(500).json({ error: 'Failed to load aggregators' });
    }
});

// Creates or updates initial profile
router.post('/profile', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { name, business_name, city_code, email } = req.body;
    console.log('[DIAG] POST /api/aggregators/profile', { userId, body: req.body });

    try {
        await query('BEGIN');

        // ── ID rename: if provisional account (tmp_...) and name/business_name is being set ──
        let finalUserId = userId;
        const targetName = name || business_name;
        if (targetName && userId.startsWith('tmp_')) {
            const phoneRes = await query(
                `SELECT display_phone FROM users WHERE id = $1`,
                [userId]
            );
            if ((phoneRes.rowCount ?? 0) > 0) {
                const { display_phone } = phoneRes.rows[0];
                const { sanitizeName, aggregatorSuffix } = require('../lib/idGenerator');
                const namePart = sanitizeName(targetName);
                const suffix = aggregatorSuffix(display_phone);
                const newId = `${namePart}_a_${suffix}`;

                const collision = await query(`SELECT id FROM users WHERE id = $1`, [newId]);
                if ((collision.rowCount ?? 0) === 0) {
                    await query(`UPDATE users SET id = $1 WHERE id = $2`, [newId, userId]);
                    const fkTables = [
                        ['seller_profiles', 'user_id'],
                        ['aggregator_profiles', 'user_id'],
                        ['seller_addresses', 'seller_id'],
                        ['aggregator_availability', 'user_id'],
                        ['aggregator_material_rates', 'aggregator_id'],
                        ['aggregator_order_dismissals', 'aggregator_id'],
                        ['device_tokens', 'user_id'],
                        ['notifications', 'user_id'],
                        ['ratings', 'ratee_id'],
                        ['ratings', 'rater_id'],
                        ['admin_audit_log', 'actor_id'],
                        ['orders', 'seller_id'],
                        ['orders', 'aggregator_id'],
                        ['order_media', 'uploaded_by'],
                    ];
                    for (const [table, col] of fkTables) {
                        await query(
                            `UPDATE ${table} SET "${col}" = $1 WHERE "${col}" = $2`,
                            [newId, userId]
                        ).catch(() => {});
                    }
                    finalUserId = newId;
                    console.log(`[ID-RENAME] ${userId} → ${newId}`);
                }
            }
        }

        if (name) {
            await query('UPDATE users SET name = $1 WHERE id = $2', [name, finalUserId]);
        }

        if (typeof email === 'string' && email.trim().length > 0) {
            const normalizedEmail = email.trim().toLowerCase();
            await query(
                `UPDATE users
                 SET email = $1,
                     email_verified_at = NULL
                 WHERE id = $2`,
                [normalizedEmail, finalUserId]
            );
        }

        await query(
            `INSERT INTO aggregator_profiles (user_id, business_name, city_code)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
                business_name = EXCLUDED.business_name,
                city_code = EXCLUDED.city_code`,
            [finalUserId, business_name, city_code]
        );

        await query('COMMIT');
        // Return id_changed so frontend can update its store if needed
        res.json({ success: true, id_changed: finalUserId !== userId ? finalUserId : undefined });
    } catch (e: any) {
        await query('ROLLBACK');
        console.error('Profile POST error:', e);
        Sentry.captureException(e);
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

// Updates operating area, hours, and business_name (V35: kyc_status/city_code/user_id are blocklisted)
router.patch('/profile', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    // V35 — blocklist: any of these in body → immediate 400
    const BLOCKED_FIELDS = ['kyc_status', 'city_code', 'user_id'];
    const blockedPresent = BLOCKED_FIELDS.filter(f => f in req.body);
    if (blockedPresent.length > 0) {
        return res.status(400).json({ error: 'invalid_fields', fields: blockedPresent });
    }

    const { name, operating_area, operating_hours, business_name, email } = req.body;

    const diagPayload: Record<string, any> = { userId };
    if (name !== undefined) diagPayload.name = name;
    if (operating_area !== undefined) diagPayload.operating_area = operating_area;
    if (business_name !== undefined) diagPayload.business_name = business_name;
    if (email !== undefined) diagPayload.email = email;
    if (operating_hours !== undefined) diagPayload.operating_hours = JSON.stringify(operating_hours);
    console.log('[DIAG] PATCH /api/aggregators/profile', diagPayload);

    try {
        await query('BEGIN');

        const updateFields: string[] = [];
        const values: any[] = [];
        let placeholderIdx = 1;

        // ── ID rename: if provisional account (tmp_...) and name/business_name is being set ──
        let finalUserId = userId;
        const targetName = name || business_name;
        if (targetName && userId.startsWith('tmp_')) {
            const phoneRes = await query(
                `SELECT display_phone FROM users WHERE id = $1`,
                [userId]
            );
            if ((phoneRes.rowCount ?? 0) > 0) {
                const { display_phone } = phoneRes.rows[0];
                const { sanitizeName, aggregatorSuffix } = require('../lib/idGenerator');
                const namePart = sanitizeName(targetName);
                const suffix = aggregatorSuffix(display_phone);
                const newId = `${namePart}_a_${suffix}`;

                const collision = await query(`SELECT id FROM users WHERE id = $1`, [newId]);
                if ((collision.rowCount ?? 0) === 0) {
                    await query(`UPDATE users SET id = $1 WHERE id = $2`, [newId, userId]);
                    const fkTables = [
                        ['seller_profiles', 'user_id'],
                        ['aggregator_profiles', 'user_id'],
                        ['seller_addresses', 'seller_id'],
                        ['aggregator_availability', 'user_id'],
                        ['aggregator_material_rates', 'aggregator_id'],
                        ['aggregator_order_dismissals', 'aggregator_id'],
                        ['device_tokens', 'user_id'],
                        ['notifications', 'user_id'],
                        ['ratings', 'ratee_id'],
                        ['ratings', 'rater_id'],
                        ['admin_audit_log', 'actor_id'],
                        ['orders', 'seller_id'],
                        ['orders', 'aggregator_id'],
                        ['order_media', 'uploaded_by'],
                    ];
                    for (const [table, col] of fkTables) {
                        await query(
                            `UPDATE ${table} SET "${col}" = $1 WHERE "${col}" = $2`,
                            [newId, userId]
                        ).catch(() => {});
                    }
                    finalUserId = newId;
                    console.log(`[ID-RENAME] ${userId} → ${newId}`);
                }
            }
        }

        if (name !== undefined) {
            await query('UPDATE users SET name = $1 WHERE id = $2', [name, finalUserId]);
        }

        if (typeof email === 'string' && email.trim().length > 0) {
            const normalizedEmail = email.trim().toLowerCase();
            await query(
                `UPDATE users
                 SET email = $1,
                     email_verified_at = NULL
                 WHERE id = $2`,
                [normalizedEmail, finalUserId]
            );
        }

        if (operating_area !== undefined) {
            updateFields.push(`operating_area = $${placeholderIdx++}`);
            if (Array.isArray(operating_area)) {
                const sanitizedAreas = sanitizeOperatingAreas(operating_area);
                values.push(JSON.stringify(sanitizedAreas));
            } else {
                values.push(String(operating_area ?? '').trim());
            }
        }

        if (operating_hours !== undefined) {
            updateFields.push(`operating_hours = $${placeholderIdx++}`);
            values.push(JSON.stringify(operating_hours));

            if (operating_hours.days) {
                console.log(`[DIAG] Saving operating days for ${userId}:`, operating_hours.days);
            }
        }

        if (business_name !== undefined) {
            updateFields.push(`business_name = $${placeholderIdx++}`);
            values.push(business_name);
        }

        if (updateFields.length === 0) {
            await query('COMMIT');
            return res.json({ success: true, message: 'No fields to update', id_changed: finalUserId !== userId ? finalUserId : undefined });
        }

        values.push(finalUserId);
        const queryStr = `
            UPDATE aggregator_profiles 
            SET ${updateFields.join(', ')}
            WHERE user_id = $${placeholderIdx}
        `;

        await query(queryStr, values);
        await query('COMMIT');
        res.json({ success: true, id_changed: finalUserId !== userId ? finalUserId : undefined });
    } catch (e: any) {
        await query('ROLLBACK');
        console.error('Profile PATCH error:', e);
        Sentry.captureException(e);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Fetch current aggregator profile details
router.get('/me', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    try {
        const result = await query(
                `SELECT u.id,
                    u.name,
                    u.email,
                    a.business_name,
                    a.city_code,
                    a.operating_area,
                    a.operating_hours,
                    a.kyc_status,
                                        COALESCE(av.is_online, true) AS is_online,
                    COALESCE(r.material_count, 0) AS material_count
             FROM users u
             JOIN aggregator_profiles a ON a.user_id = u.id
                         LEFT JOIN aggregator_availability av ON av.user_id = u.id
             LEFT JOIN (
               SELECT aggregator_id, COUNT(*)::int AS material_count
               FROM aggregator_material_rates
               GROUP BY aggregator_id
             ) r ON r.aggregator_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        const profile = result.rows[0];
        if (profile.operating_area && typeof profile.operating_area === 'string') {
            if (profile.operating_area.startsWith('[') && profile.operating_area.endsWith(']')) {
                try {
                    profile.operating_area = JSON.parse(profile.operating_area);
                } catch {
                    profile.operating_area = profile.operating_area.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
            } else {
                profile.operating_area = profile.operating_area.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
        } else if (!profile.operating_area) {
            profile.operating_area = [];
        }

        return res.json(profile);
    } catch (e: any) {
        console.error('GET /api/aggregators/me error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Failed to load aggregator profile' });
    }
});

// Returns authenticated aggregator's configured material rates
router.get('/me/rates', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    try {
        const result = await query(
            `SELECT material_code, custom_label, is_custom, rate_per_kg, updated_at
             FROM aggregator_material_rates
             WHERE aggregator_id = $1
             ORDER BY is_custom ASC, COALESCE(material_code, custom_label) ASC`,
            [userId]
        );

        return res.json(result.rows);
    } catch (e: any) {
        console.error('GET /api/aggregators/me/rates error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Failed to load aggregator rates' });
    }
});

// Aggregator earnings summary by period (today|week|month)
router.get('/earnings', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const period = String(req.query.period ?? 'month');

    let intervalExpr = "INTERVAL '30 days'";
    if (period === 'today') intervalExpr = "INTERVAL '1 day'";
    else if (period === 'week') intervalExpr = "INTERVAL '7 days'";
    const isAllTime = period === 'all';

    try {
        // ⚠️ CRITICAL: Parallelize 3 queries instead of sequential awaits
        // This reduces earnings endpoint latency from ~700ms to ~250ms
        const [totals, materialBreakdown, dailySeries] = await Promise.all([
            query(
                `SELECT COALESCE(SUM(item_totals.order_total), 0) AS total_earned,
                        COUNT(*)::int AS orders_completed,
                        COALESCE(SUM(item_totals.total_weight_kg), 0) AS total_weight_kg
                 FROM orders o
                 JOIN LATERAL (
                                     SELECT COALESCE(
                                                        NULLIF(o.confirmed_value, 0),
                                                        NULLIF(o.estimated_value, 0),
                                                        COALESCE(SUM(COALESCE(oi.amount, oi.confirmed_weight_kg * oi.rate_per_kg, oi.estimated_weight_kg * oi.rate_per_kg, 0)), 0)
                                                    ) AS order_total,
                                                    COALESCE(SUM(COALESCE(oi.confirmed_weight_kg, oi.estimated_weight_kg, 0)), 0) AS total_weight_kg
                   FROM order_items oi
                   WHERE oi.order_id = o.id
                 ) item_totals ON true
                 WHERE o.aggregator_id = $1
                   AND o.status = 'completed'
                   AND o.deleted_at IS NULL
                   ${isAllTime ? '' : `AND o.created_at >= NOW() - ${intervalExpr}`}`,
                [userId]
            ),
            query(
                `SELECT oi.material_code,
                        COALESCE(SUM(COALESCE(oi.amount, oi.confirmed_weight_kg * oi.rate_per_kg, 0)), 0) AS amount,
                        COALESCE(SUM(COALESCE(oi.confirmed_weight_kg, oi.estimated_weight_kg, 0)), 0) AS weight_kg
                 FROM orders o
                 JOIN order_items oi ON oi.order_id = o.id
                 WHERE o.aggregator_id = $1
                   AND o.status = 'completed'
                   AND o.deleted_at IS NULL
                   ${isAllTime ? '' : `AND o.created_at >= NOW() - ${intervalExpr}`}
                 GROUP BY oi.material_code
                 ORDER BY amount DESC`,
                [userId]
            ),
            query(
                `SELECT TO_CHAR(DATE_TRUNC('day', o.created_at), 'YYYY-MM-DD') AS date,
                        COALESCE(SUM(COALESCE(oi.amount, oi.confirmed_weight_kg * oi.rate_per_kg, 0)), 0) AS amount
                 FROM orders o
                 JOIN order_items oi ON oi.order_id = o.id
                 WHERE o.aggregator_id = $1
                   AND o.status = 'completed'
                   AND o.deleted_at IS NULL
                   ${isAllTime ? '' : `AND o.created_at >= NOW() - ${intervalExpr}`}
                 GROUP BY DATE_TRUNC('day', o.created_at)
                 ORDER BY DATE_TRUNC('day', o.created_at) ASC`,
                [userId]
            ),
        ]);

        return res.json({
            total_earned: Number(totals.rows[0]?.total_earned ?? 0),
            orders_completed: Number(totals.rows[0]?.orders_completed ?? 0),
            total_weight_kg: Number(totals.rows[0]?.total_weight_kg ?? 0),
            material_breakdown: materialBreakdown.rows.map((row: any) => ({
                material_code: row.material_code,
                amount: Number(row.amount ?? 0),
                weight_kg: Number(row.weight_kg ?? 0),
            })),
            daily_series: dailySeries.rows.map((row: any) => ({
                date: row.date,
                amount: Number(row.amount ?? 0),
            })),
        });
    } catch (e: any) {
        console.error('GET /api/aggregators/earnings error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Failed to load earnings' });
    }
});

// Heartbeat — upserts aggregator online status (called every ~2 min from mobile foreground)
router.post('/heartbeat', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    // Accept optional is_online from body — defaults to true for backward compatibility
    const isOnline = req.body?.is_online !== undefined ? Boolean(req.body.is_online) : true;
    const orderId = typeof req.body?.order_id === 'string' ? req.body.order_id : null;
    const latitude = toNumberOrNull(req.body?.latitude);
    const longitude = toNumberOrNull(req.body?.longitude);
    try {
        await query(`
            INSERT INTO aggregator_availability (user_id, is_online, last_ping_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id) DO UPDATE
                SET is_online = $2, last_ping_at = NOW()
        `, [userId, isOnline]);

        if (isOnline) {
            const profileRes = await query(
                `SELECT city_code, operating_area, operating_hours
                   FROM aggregator_profiles
                  WHERE user_id = $1`,
                [userId]
            );

            if (profileRes.rows.length > 0) {
                const profile = profileRes.rows[0];
                const cityCode = String(profile.city_code || '').trim();
                const operatingAreas = parseOperatingAreas(profile.operating_area);
                const schedule = parseOperatingHoursSchedule(profile.operating_hours);

                if (cityCode && operatingAreas.length > 0) {
                    const candidatesRes = await query(
                        `SELECT o.id,
                                o.order_number,
                                o.pickup_locality,
                                o.pickup_address,
                                o.preferred_pickup_window,
                                o.created_at,
                                COALESCE(
                                    json_agg(DISTINCT oi.material_code) FILTER (WHERE oi.material_code IS NOT NULL),
                                    '[]'::json
                                ) AS material_codes
                           FROM orders o
                           JOIN order_items oi ON oi.order_id = o.id
                           LEFT JOIN aggregator_material_rates r
                             ON r.aggregator_id = $1
                            AND r.material_code = oi.material_code
                          WHERE o.status = 'created'
                            AND o.deleted_at IS NULL
                                                        AND NOT EXISTS (
                                                                SELECT 1
                                                                FROM aggregator_order_dismissals dod
                                                                WHERE dod.aggregator_id = $1
                                                                    AND dod.order_id = o.id
                                                        )
                            AND LOWER(TRIM(COALESCE(o.city_code, ''))) = LOWER(TRIM(COALESCE($2::text, '')))
                          GROUP BY o.id
                          HAVING COUNT(DISTINCT oi.material_code) FILTER (WHERE oi.material_code IS NOT NULL)
                               = COUNT(DISTINCT r.material_code) FILTER (WHERE r.material_code IS NOT NULL)
                          ORDER BY o.created_at DESC
                          LIMIT 25`,
                        [userId, cityCode]
                    );

                    const eligibleOrders = candidatesRes.rows.filter((order: any) => {
                        const matchesArea = isAddressInOperatingAreas(
                            order.pickup_locality,
                            order.pickup_address,
                            operatingAreas
                        );
                        const matchesPickupWindow = isPickupWindowWithinSchedule(
                            schedule,
                            order.preferred_pickup_window
                        );
                        return matchesArea && matchesPickupWindow;
                    });

                    if (eligibleOrders.length > 0) {
                        const eligibleOrderIds = eligibleOrders.map((o: any) => String(o.id));
                        const alreadyNotifiedRes = await query(
                            `SELECT DISTINCT data->>'order_id' AS order_id
                               FROM notifications
                              WHERE user_id = $1
                                AND type = 'order'
                                AND COALESCE(data->>'kind', '') = 'new_pickup_listing'
                                AND data->>'order_id' = ANY($2::text[])`,
                            [userId, eligibleOrderIds]
                        );

                        const alreadyNotifiedIds = new Set(
                            alreadyNotifiedRes.rows
                                .map((r: any) => String(r.order_id || '').trim())
                                .filter(Boolean)
                        );

                        const pendingToNotify = eligibleOrders.filter(
                            (o: any) => !alreadyNotifiedIds.has(String(o.id))
                        );

                        if (pendingToNotify.length > 0) {
                            const latest = pendingToNotify[0];
                            const singleTitle = 'New order near you!';
                            const singleBody = 'A pending scrap listing in your area is now available.';
                            const multiTitle = `${pendingToNotify.length} orders near you`;
                            const multiBody = 'Pending scrap listings in your area are now available.';

                            await sendPushToUsers(
                                [userId],
                                pendingToNotify.length === 1 ? singleTitle : multiTitle,
                                pendingToNotify.length === 1 ? singleBody : multiBody,
                                {
                                    order_id: latest.id,
                                    city_code: cityCode,
                                    kind: 'new_order_listing',
                                }
                            );

                            for (const order of pendingToNotify) {
                                const orderDisplayId = typeof order.order_number === 'number' && Number.isFinite(order.order_number)
                                    ? `#${String(order.order_number).padStart(6, '0')}`
                                    : `#${String(order.id).slice(0, 8).toUpperCase()}`;

                                await createNotification(
                                    userId,
                                    'New order near you!',
                                    'A pending scrap listing in your area is now available.',
                                    'order',
                                    {
                                        order_id: order.id,
                                        order_display_id: orderDisplayId,
                                        kind: 'new_pickup_listing',
                                    }
                                );
                            }
                        }
                    }
                }
            }
        }

        if (orderId && latitude != null && longitude != null) {
            const orderRes = await query(
                `SELECT id, seller_id, aggregator_id, status, pickup_lat, pickup_lng
                   FROM orders
                  WHERE id = $1
                    AND aggregator_id = $2
                    AND status IN ('accepted', 'en_route', 'arrived', 'weighing_in_progress')`,
                [orderId, userId]
            );

            if (orderRes.rows.length > 0) {
                const order = orderRes.rows[0];
                const pickupLat = toNumberOrNull(order.pickup_lat);
                const pickupLng = toNumberOrNull(order.pickup_lng);
                const distanceKm =
                    pickupLat != null && pickupLng != null
                        ? calculateDistanceKm(latitude, longitude, pickupLat, pickupLng)
                        : null;

                const locationPayload = {
                    orderId,
                    aggregator_lat: latitude,
                    aggregator_lng: longitude,
                    distance_km: distanceKm,
                    updatedAt: new Date().toISOString(),
                };

                if (order.seller_id) {
                    await publishEvent(channelName(order.seller_id, 'order', orderId), 'location_updated', locationPayload);
                }
                if (order.aggregator_id) {
                    await publishEvent(channelName(order.aggregator_id, 'order', orderId), 'location_updated', locationPayload);
                }
            }
        }

        console.log(`[HEARTBEAT] User ${userId} status updated: online=${isOnline}`);
        return res.json({ success: true });
    } catch (e: any) {
        console.error('Heartbeat error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Failed to update heartbeat' });
    }
});

// Updates materials rates (standard + custom)
router.patch('/rates', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    // Expects: [
    //   { material_code: 'paper', rate_per_kg: 15.5 },          // standard
    //   { custom_label: 'Copper Wire', rate_per_kg: 80, is_custom: true }, // custom
    // ]
    const { rates } = req.body;
    console.log('[DIAG] PATCH /api/aggregators/rates', { userId, ratesCount: rates?.length });

    try {
        if (!rates || !Array.isArray(rates)) {
            return res.status(400).json({ error: 'Rates array is required' });
        }

        await query('BEGIN');

        // Separate standard vs custom
        const standardRates = rates.filter((r: any) => !r.is_custom && r.material_code);
        const customRates   = rates.filter((r: any) =>  r.is_custom && r.custom_label);

        // Remove standard entries no longer in the payload (user deselected a material)
        const keepCodes = standardRates.map((r: any) => r.material_code as string);
        if (keepCodes.length > 0) {
            // Delete rows not present in the new set
            await query(
                `DELETE FROM aggregator_material_rates
                 WHERE aggregator_id = $1
                   AND is_custom = FALSE
                   AND material_code <> ALL($2::text[])`,
                [userId, keepCodes]
            );
        } else {
            // All standard rates removed
            await query(
                `DELETE FROM aggregator_material_rates
                 WHERE aggregator_id = $1 AND is_custom = FALSE`,
                [userId]
            );
        }

        // Remove custom entries no longer in the payload
        const keepLabels = customRates.map((r: any) => r.custom_label as string);
        if (keepLabels.length > 0) {
            await query(
                `DELETE FROM aggregator_material_rates
                 WHERE aggregator_id = $1
                   AND is_custom = TRUE
                   AND custom_label <> ALL($2::text[])`,
                [userId, keepLabels]
            );
        } else {
            await query(
                `DELETE FROM aggregator_material_rates
                 WHERE aggregator_id = $1 AND is_custom = TRUE`,
                [userId]
            );
        }

        // Upsert standard rates
        for (const rate of standardRates) {
            const rateValue = Number(rate.rate_per_kg);
            if (!Number.isFinite(rateValue) || rateValue <= 0) continue;
            await query(
                `INSERT INTO aggregator_material_rates
                    (aggregator_id, material_code, rate_per_kg, is_custom, updated_at)
                 VALUES ($1, $2, $3, FALSE, NOW())
                 ON CONFLICT (aggregator_id, material_code)
                 WHERE is_custom = FALSE AND material_code IS NOT NULL
                 DO UPDATE SET rate_per_kg = EXCLUDED.rate_per_kg, updated_at = NOW()`,
                [userId, rate.material_code, rateValue]
            );
        }

        // Upsert custom rates
        for (const rate of customRates) {
            const rateValue = Number(rate.rate_per_kg);
            if (!Number.isFinite(rateValue) || rateValue <= 0) continue;
            const label = String(rate.custom_label).trim().slice(0, 100);
            if (!label) continue;
            await query(
                `INSERT INTO aggregator_material_rates
                    (aggregator_id, material_code, custom_label, rate_per_kg, is_custom, updated_at)
                 VALUES ($1, NULL, $2, $3, TRUE, NOW())
                 ON CONFLICT (aggregator_id, custom_label)
                 WHERE is_custom = TRUE AND custom_label IS NOT NULL
                 DO UPDATE SET rate_per_kg = EXCLUDED.rate_per_kg, updated_at = NOW()`,
                [userId, label, rateValue]
            );
        }

        await query('COMMIT');
        res.json({ success: true });
    } catch (e: any) {
        await query('ROLLBACK');
        console.error('Rates PATCH error:', e);
        Sentry.captureException(e);
        res.status(500).json({ error: 'Failed to update rates' });
    }
});

router.post('/kyc', verifyRole('aggregator'), handleKycUpload, async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    console.log('[DIAG] POST /api/aggregators/kyc', { userId, files: Object.keys(req.files || {}) });

    try {
        // Find aggregator profile to ensure it exists
        const aggRes = await query(`SELECT kyc_status FROM aggregator_profiles WHERE user_id = $1`, [userId]);
        if (aggRes.rowCount === 0) {
            return res.status(404).json({ error: 'Aggregator profile not found' });
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const mediaToUpload: { field: string, dbType: string, file: Express.Multer.File }[] = [];

        if (files['aadhaar_front']) {
            mediaToUpload.push({ field: 'aadhaar_front', dbType: 'kyc_aadhaar_front', file: files['aadhaar_front'][0] });
        }
        if (files['aadhaar_back']) {
            mediaToUpload.push({ field: 'aadhaar_back', dbType: 'kyc_aadhaar_back', file: files['aadhaar_back'][0] });
        }
        if (files['selfie']) {
            mediaToUpload.push({ field: 'selfie', dbType: 'kyc_selfie', file: files['selfie'][0] });
        }
        if (files['shop_photo']) {
            mediaToUpload.push({ field: 'shop_photo', dbType: 'kyc_shop', file: files['shop_photo'][0] });
        }
        if (files['vehicle_photo']) {
            mediaToUpload.push({ field: 'vehicle_photo', dbType: 'kyc_vehicle', file: files['vehicle_photo'][0] });
        }

        if (mediaToUpload.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedKeys: { media_type: string, key: string }[] = [];

        for (const item of mediaToUpload) {
            const strippedBuffer = await sharp(item.file.buffer).toBuffer();
            const fileKey = await storageProvider.uploadFile(
                strippedBuffer,
                `kyc_${userId}_${item.dbType}_${Date.now()}.jpg`,
                'image/jpeg'
            );
            uploadedKeys.push({ media_type: item.dbType, key: fileKey });
        }

        const insertPromises = uploadedKeys.map(k => {
            return query(
                `INSERT INTO order_media (order_id, uploaded_by, media_type, storage_path)
                 VALUES (NULL, $1, $2, $3)`,
                [userId, k.media_type, k.key]
            );
        });

        await Promise.all(insertPromises);

        // Update KYC status ONLY if regular onboarding photos are present (or just mark as pending if any photo uploaded)
        await query(`UPDATE aggregator_profiles SET kyc_status = 'pending' WHERE user_id = $1`, [userId]);

        res.json({ success: true, submitted_at: new Date().toISOString() });

    } catch (error: any) {
        console.error('KYC Upload Error:', error);
        Sentry.captureException(error);
        if (error.message === 'Invalid file type') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to process KYC upload' });
    }
});

router.get('/kyc/status', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    try {
        const result = await query(`SELECT kyc_status FROM aggregator_profiles WHERE user_id = $1`, [userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Aggregator not found' });
        }

        res.json({ kyc_status: result.rows[0].kyc_status });
    } catch (error) {
        console.error('KYC Status Error:', error);
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to fetch KYC status' });
    }
});

// Seller view: public aggregator profile details
router.get('/:id/public-profile', verifyRole('seller'), async (req: Request, res: Response) => {
        const aggregatorId = String(req.params.id || '').trim();
        if (!aggregatorId) {
                return res.status(400).json({ error: 'aggregator_id_required' });
        }

        try {
                const profileRes = await query(
                        `SELECT u.id,
                                        COALESCE(NULLIF(a.business_name, ''), NULLIF(u.name, ''), 'Aggregator') AS display_name,
                                        a.business_name,
                                        a.operating_area,
                                        a.operating_hours,
                                        a.kyc_status,
                                        a.created_at,
                                        COALESCE(av.is_online, false) AS is_online,
                                        COALESCE(rating_stats.avg_rating, 0)::float8 AS avg_rating,
                                        COALESCE(rating_stats.total_reviews, 0)::int AS total_reviews,
                                        COALESCE(order_stats.completed_pickups, 0)::int AS completed_pickups,
                                        COALESCE(order_stats.completion_rate, 0)::float8 AS completion_rate,
                                        COALESCE(order_stats.avg_pickup_mins, 0)::float8 AS avg_pickup_mins
                             FROM users u
                             JOIN aggregator_profiles a ON a.user_id = u.id
                             LEFT JOIN aggregator_availability av ON av.user_id = u.id
                             LEFT JOIN LATERAL (
                                     SELECT ROUND(AVG(rr.score)::numeric, 2) AS avg_rating,
                                                    COUNT(*)::int AS total_reviews
                                         FROM ratings rr
                                        WHERE rr.ratee_id = u.id
                             ) rating_stats ON true
                             LEFT JOIN LATERAL (
                                     WITH per_order AS (
                                             SELECT o.id,
                                                            o.status,
                                                            MAX(CASE WHEN h.new_status = 'accepted' THEN h.created_at END) AS accepted_at,
                                                            MAX(CASE WHEN h.new_status = 'completed' THEN h.created_at END) AS completed_at
                                                 FROM orders o
                                                 LEFT JOIN order_status_history h ON h.order_id = o.id
                                                WHERE o.aggregator_id = u.id
                                                    AND o.deleted_at IS NULL
                                                GROUP BY o.id, o.status
                                     )
                                     SELECT COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_pickups,
                                                    CASE
                                                        WHEN COUNT(*) FILTER (
                                                            WHERE status IN ('accepted','en_route','arrived','weighing_in_progress','completed','cancelled','disputed')
                                                        ) = 0 THEN 0
                                                        ELSE ROUND(
                                                            (COUNT(*) FILTER (WHERE status = 'completed')::numeric * 100.0) /
                                                            COUNT(*) FILTER (
                                                                WHERE status IN ('accepted','en_route','arrived','weighing_in_progress','completed','cancelled','disputed')
                                                            ),
                                                            2
                                                        )
                                                    END AS completion_rate,
                                                    ROUND(
                                                            AVG(EXTRACT(EPOCH FROM (completed_at - accepted_at)) / 60.0)
                                                                    FILTER (
                                                                            WHERE accepted_at IS NOT NULL
                                                                                AND completed_at IS NOT NULL
                                                                                AND completed_at >= accepted_at
                                                                    )::numeric,
                                                            0
                                                    ) AS avg_pickup_mins
                                         FROM per_order
                             ) order_stats ON true
                            WHERE u.id = $1
                                AND u.user_type = 'aggregator'
                                AND u.is_active = true`,
                        [aggregatorId]
                );

                if (profileRes.rows.length === 0) {
                        return res.status(404).json({ error: 'Aggregator not found' });
                }

                const ratesRes = await query(
                        `SELECT material_code, rate_per_kg
                             FROM aggregator_material_rates
                            WHERE aggregator_id = $1
                                AND material_code IS NOT NULL
                            ORDER BY rate_per_kg DESC, material_code ASC`,
                        [aggregatorId]
                );

                const reviewsRes = await query(
                        `SELECT r.score,
                                        r.review,
                                        r.created_at,
                                        COALESCE(NULLIF(u.name, ''), 'User') AS reviewer_name
                             FROM ratings r
                             LEFT JOIN users u ON u.id = r.rater_id
                            WHERE r.ratee_id = $1
                            ORDER BY r.created_at DESC
                            LIMIT 5`,
                        [aggregatorId]
                );

                const row = profileRes.rows[0];
                const operatingAreas = parseOperatingAreas(row.operating_area);
                const memberSinceYear = row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear();

                return res.json({
                        id: row.id,
                        name: row.display_name,
                        aggregatorTypeLabel: `Aggregator · Since ${memberSinceYear}`,
                        isOnline: Boolean(row.is_online),
                        isVerified: String(row.kyc_status || '').toLowerCase() === 'verified',
                        rating: Number(row.avg_rating ?? 0),
                        reviewsCount: Number(row.total_reviews ?? 0),
                        stats: {
                                pickups: Number(row.completed_pickups ?? 0),
                                completionRate: Number(row.completion_rate ?? 0),
                                avgPickupMinutes: Number(row.avg_pickup_mins ?? 0),
                        },
                        rates: ratesRes.rows.map((rate: any) => ({
                                materialCode: String(rate.material_code),
                                ratePerKg: Number(rate.rate_per_kg ?? 0),
                        })),
                        operatingAreas,
                        operatingHoursSummary: formatOperatingHoursSummary(row.operating_hours),
                        reviews: reviewsRes.rows.map((review: any) => ({
                                reviewerName: String(review.reviewer_name || 'User'),
                                score: Number(review.score ?? 0),
                                review: typeof review.review === 'string' ? review.review : '',
                                createdAt: review.created_at,
                        })),
                });
        } catch (error: any) {
                console.error('GET /api/aggregators/:id/public-profile error:', error);
                Sentry.captureException(error);
                return res.status(500).json({ error: 'Failed to load aggregator profile' });
        }
});

export default router;
