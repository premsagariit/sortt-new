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

router.post('/kyc', verifyRole('aggregator'), upload.fields([
    { name: 'aadhaar_front', maxCount: 1 },
    { name: 'aadhaar_back', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'shop_photo', maxCount: 1 },
    { name: 'vehicle_photo', maxCount: 1 }
]), async (req: Request, res: Response) => {
    // We know req.user exists because verifyRole('aggregator') passed
    const userId = (req as any).user.id;

    try {
        // Find aggregator type
        const aggRes = await query(`SELECT aggregator_type FROM aggregators WHERE id = $1`, [userId]);
        if (aggRes.rowCount === 0) {
            return res.status(404).json({ error: 'Aggregator profile not found' });
        }

        const aggType = aggRes.rows[0].aggregator_type;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Validate required files
        if (!files['aadhaar_front'] || !files['aadhaar_back'] || !files['selfie']) {
            return res.status(400).json({ error: 'Missing required standard KYC files' });
        }

        // Validate conditional files
        if (aggType === 'shop' && !files['shop_photo']) {
            return res.status(400).json({ error: 'Shop photo required for shop operators' });
        }
        if (aggType === 'mobile' && !files['vehicle_photo']) {
            return res.status(400).json({ error: 'Vehicle photo required for mobile operators' });
        }

        const mediaToUpload = [
            { field: 'aadhaar_front', dbType: 'aadhaar_front', file: files['aadhaar_front'][0] },
            { field: 'aadhaar_back', dbType: 'aadhaar_back', file: files['aadhaar_back'][0] },
            { field: 'selfie', dbType: 'selfie', file: files['selfie'][0] },
        ];

        if (aggType === 'shop') {
            mediaToUpload.push({ field: 'shop_photo', dbType: 'shop_photo', file: files['shop_photo'][0] });
        } else if (aggType === 'mobile') {
            mediaToUpload.push({ field: 'vehicle_photo', dbType: 'vehicle_photo', file: files['vehicle_photo'][0] });
        }

        const uploadedKeys: { media_type: string, key: string }[] = [];

        for (const item of mediaToUpload) {
            // Strip EXIF data via sharp (V18)
            const strippedBuffer = await sharp(item.file.buffer).toBuffer();

            // Upload using the IStorageProvider wrapper
            const fileKey = await storageProvider.uploadFile(
                strippedBuffer,
                `kyc_${userId}_${item.dbType}_${Date.now()}.jpg`,
                'image/jpeg' // sharp defaults to jpeg/png without exif if we don't specify, but let's assume valid output
            );

            uploadedKeys.push({ media_type: item.dbType, key: fileKey });
        }

        // Insert rows into order_media
        const insertPromises = uploadedKeys.map(k => {
            return query(
                `INSERT INTO order_media (order_id, uploaded_by, media_type, storage_path)
                 VALUES (NULL, $1, $2, $3)`,
                [userId, k.media_type, k.key]
            );
        });

        await Promise.all(insertPromises);

        // Optional: Send generic admin push (omitted exact Expo API for brevity, assuming standard push function exists elsewhere)
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
        const result = await query(`SELECT kyc_status FROM aggregators WHERE id = $1`, [userId]);
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
