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
    const { business_name, city_code } = req.body;
    
    try {
        await query(
            `INSERT INTO aggregator_profiles (user_id, business_name, city_code)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
                business_name = EXCLUDED.business_name,
                city_code = EXCLUDED.city_code`,
            [userId, business_name, city_code]
        );
        res.json({ success: true });
    } catch (e: any) {
        console.error('Profile POST error:', e);
        Sentry.captureException(e);
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

// Updates operating area and hours
router.patch('/profile', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { operating_area_text, operating_hours } = req.body;
    
    try {
        await query(
            `UPDATE aggregator_profiles 
             SET operating_area_text = COALESCE($1, operating_area_text),
                 operating_hours = COALESCE($2, operating_hours)
             WHERE user_id = $3`,
            [operating_area_text, operating_hours ? JSON.stringify(operating_hours) : null, userId]
        );
        res.json({ success: true });
    } catch (e: any) {
        console.error('Profile PATCH error:', e);
        Sentry.captureException(e);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Updates materials rates
router.patch('/rates', verifyRole('aggregator'), async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { rates } = req.body; // Expects [{ material_code: 'paper', rate_per_kg: 15.5 }, ...]
    
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

    try {
        // Find aggregator profile to ensure it exists
        const aggRes = await query(`SELECT kyc_status FROM aggregator_profiles WHERE user_id = $1`, [userId]);
        if (aggRes.rowCount === 0) {
            return res.status(404).json({ error: 'Aggregator profile not found' });
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Validate required files
        if (!files['aadhaar_front'] || !files['aadhaar_back'] || !files['selfie']) {
            return res.status(400).json({ error: 'Missing required standard KYC files' });
        }

        const mediaToUpload = [
            { field: 'aadhaar_front', dbType: 'aadhaar_front', file: files['aadhaar_front'][0] },
            { field: 'aadhaar_back', dbType: 'aadhaar_back', file: files['aadhaar_back'][0] },
            { field: 'selfie', dbType: 'selfie', file: files['selfie'][0] },
        ];

        if (files['shop_photo']) {
            mediaToUpload.push({ field: 'shop_photo', dbType: 'shop_photo', file: files['shop_photo'][0] });
        }
        if (files['vehicle_photo']) {
            mediaToUpload.push({ field: 'vehicle_photo', dbType: 'vehicle_photo', file: files['vehicle_photo'][0] });
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

        // Update KYC status to pending
        await query(`UPDATE aggregator_profiles SET kyc_status = 'pending' WHERE user_id = $1`, [userId]);

        console.log(`[Admin Push Notification Stub] A new KYC submission requires review for aggregator ${userId}`);

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
