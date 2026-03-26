import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { createAnalysisProvider } from '@sortt/analysis';
import { redis } from '../lib/redis';
import { storageProvider } from '../lib/storage';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const VALID_CODES = new Set(['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass']);

router.post('/analyze', upload.single('image'), async (req: any, res: any, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file?.buffer) {
      console.warn('[Scrap] Missing uploaded image buffer', {
        hasFile: !!req.file,
        contentType: req.headers['content-type'],
        userId: req.user?.id,
      });
      return res.status(400).json({ status: 'analysis_failed' });
    }

    const dailyLimit = Number(process.env.GEMINI_DAILY_LIMIT || 1200);
    const dayKey = `gemini:daily:${new Date().toISOString().split('T')[0]}`;
    const legacyGlobalKey = 'globalGeminiCounter';

    if (redis) {
      const count = await redis.get<string>(dayKey);
      if (count && Number(count) >= dailyLimit) {
        return res.status(200).json({ status: 'degraded', manual_entry_required: true });
      }

      const legacyCount = await redis.get<string>(legacyGlobalKey);
      if (legacyCount && Number(legacyCount) >= dailyLimit) {
        return res.status(200).json({ status: 'degraded', manual_entry_required: true });
      }
    }

    const imageHash = createHash('sha256').update(req.file.buffer).digest('hex');
    const cacheKey = `gemini:img:${imageHash}`;

    if (redis) {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return res.json({ ...parsed, is_ai_estimate: true });
      }
    }

    const strippedBuffer = await sharp(req.file.buffer).toBuffer();

    try {
      const provider = createAnalysisProvider();
      const result = await provider.analyzeScrapImage(strippedBuffer);

      console.log('[Scrap] Gemini analysis response', {
        userId: req.user?.id,
        material_code: result.material_code,
        estimated_weight_kg: result.estimated_weight_kg,
        confidence: result.confidence,
        is_ai_estimate: result.is_ai_estimate,
      });

      if (!VALID_CODES.has(result.material_code) || Number(result.estimated_weight_kg) <= 0) {
        return res.status(400).json({ status: 'analysis_failed' });
      }

      // Upload image to Cloudflare R2
      let imageUrl: string | null = null;
      try {
        const timestamp = Date.now();
        const fileKey = `scrap/analysis/${req.user?.id}/${timestamp}-${imageHash.slice(0, 8)}.jpg`;
        // Use R2_BUCKET_NAME from env (defaults to configured bucket)
        imageUrl = await storageProvider.uploadWithKey(strippedBuffer, fileKey);
        console.log('[Scrap] Image uploaded to R2', { fileKey, userId: req.user?.id });
      } catch (uploadError) {
        console.warn('[Scrap] Image upload to R2 failed (non-fatal)', uploadError);
        // Continue even if upload fails — analysis is still valid
      }

      if (redis) {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 86400 });
        await redis.incr(dayKey);
        await redis.expire(dayKey, 86400);
        await redis.incr(legacyGlobalKey);
      }

      return res.json({
        ...result,
        is_ai_estimate: true,
        image_key: imageUrl || null
      });
    } catch (providerError: any) {
      console.error('[Scrap] Provider initialization or analysis error', {
        error: providerError?.message,
        code: providerError?.code,
        userId: req.user?.id,
      });
      return res.status(400).json({ status: 'analysis_failed' });
    }
  } catch (error) {
    console.error('[Scrap] Analysis failed', error);
    return res.status(400).json({ status: 'analysis_failed' });
  }
});

export default router;
