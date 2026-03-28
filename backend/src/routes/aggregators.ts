import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { verifyRole } from '../middleware/auth';
import { storageProvider } from '../lib/storage';
import { publishEvent } from '../lib/realtime';
import { channelName } from '../utils/channelHelper';

const router = Router();

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

// Creates or updates initial profile
router.post('/profile', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { name, business_name, city_code } = req.body;
    console.log('[DIAG] POST /api/aggregators/profile', { userId, body: req.body });

    try {
        await query('BEGIN');

        if (name) {
            await query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
        }

        await query(
            `INSERT INTO aggregator_profiles (user_id, business_name, city_code)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
                business_name = EXCLUDED.business_name,
                city_code = EXCLUDED.city_code`,
            [userId, business_name, city_code]
        );

        await query('COMMIT');
        res.json({ success: true });
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

    const { name, operating_area, operating_hours, business_name } = req.body;

    const diagPayload: Record<string, any> = { userId };
    if (name !== undefined) diagPayload.name = name;
    if (operating_area !== undefined) diagPayload.operating_area = operating_area;
    if (business_name !== undefined) diagPayload.business_name = business_name;
    if (operating_hours !== undefined) diagPayload.operating_hours = JSON.stringify(operating_hours);
    console.log('[DIAG] PATCH /api/aggregators/profile', diagPayload);

    try {
        const updateFields: string[] = [];
        const values: any[] = [];
        let placeholderIdx = 1;

        if (name !== undefined) {
            await query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
        }

        if (operating_area !== undefined) {
            updateFields.push(`operating_area = $${placeholderIdx++}`);
            values.push(operating_area);
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
            return res.json({ success: true, message: 'No fields to update' });
        }

        values.push(userId);
        const queryStr = `
            UPDATE aggregator_profiles 
            SET ${updateFields.join(', ')}
            WHERE user_id = $${placeholderIdx}
        `;

        await query(queryStr, values);
        res.json({ success: true });
    } catch (e: any) {
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

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Aggregator profile not found' });
        }

        return res.json(result.rows[0]);
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

router.post('/kyc', verifyRole('aggregator'), upload.fields([
    { name: 'aadhaar_front', maxCount: 1 },
    { name: 'aadhaar_back', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'shop_photo', maxCount: 1 },
    { name: 'vehicle_photo', maxCount: 1 }
]), async (req: Request, res: Response) => {
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

export default router;
