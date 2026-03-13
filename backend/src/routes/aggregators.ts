import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { verifyRole } from '../middleware/auth';
import { storageProvider } from '../lib/storage';

const router = Router();

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

    const { operating_area, operating_hours, business_name } = req.body;

    console.log('[DIAG] PATCH /api/aggregators/profile', {
        userId,
        operating_area,
        business_name,
        operating_hours: JSON.stringify(operating_hours)
    });

    try {
        const updateFields: string[] = [];
        const values: any[] = [];
        let placeholderIdx = 1;

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

// Heartbeat — upserts aggregator online status (called every ~2 min from mobile foreground)
router.post('/heartbeat', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        await query(`
            INSERT INTO aggregator_availability (user_id, is_online, last_ping_at)
            VALUES ($1, true, NOW())
            ON CONFLICT (user_id) DO UPDATE
                SET is_online = true, last_ping_at = NOW()
        `, [userId]);
        return res.json({ success: true });
    } catch (e: any) {
        console.error('Heartbeat error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Failed to update heartbeat' });
    }
});

// Updates materials rates
router.patch('/rates', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { rates } = req.body; // Expects [{ material_code: 'paper', rate_per_kg: 15.5 }, ...]
    console.log('[DIAG] PATCH /api/aggregators/rates', { userId, ratesCount: rates?.length });

    try {
        if (!rates || !Array.isArray(rates)) {
            return res.status(400).json({ error: 'Rates array is required' });
        }

        await query('BEGIN');

        for (const rate of rates) {
            await query(
                `INSERT INTO aggregator_material_rates (aggregator_id, material_code, rate_per_kg, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (aggregator_id, material_code) DO UPDATE SET
                    rate_per_kg = EXCLUDED.rate_per_kg,
                    updated_at = NOW()`,
                [userId, rate.material_code, rate.rate_per_kg]
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
