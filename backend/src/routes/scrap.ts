import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { createAnalysisProvider } from '@sortt/analysis';
import { redis } from '../lib/redis';
import { storageProvider } from '../lib/storage';
import { resolveRequestLanguage } from '../utils/language';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'];
    const isAllowed = allowed.includes(file.mimetype);
    console.error('[Scrap] multer fileFilter - fieldname:', file.fieldname, '| mimetype:', file.mimetype, '| allowed:', isAllowed);
    cb(null, isAllowed);
  },
});

const VALID_CODES = new Set(['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass']);

router.post('/analyze', upload.single('image'), async (req: any, res: any) => {
  try {
    console.error('[Scrap] POST /analyze called');
    console.error('[SCrap] hasUser:', !!req.user?.id, 'hasFile:', !!req.file?.buffer);

    if (!req.user?.id) {
      console.error('[Scrap] No user');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file?.buffer) {
      console.error('[Scrap] No file buffer — content-type:', req.headers['content-type'], '| req.files:', JSON.stringify(req.files), '| req.body keys:', Object.keys(req.body || {}));
      return res.status(400).json({ status: 'analysis_failed' });
    }

    const language = resolveRequestLanguage({
      explicit: typeof req.query?.language === 'string'
        ? req.query.language
        : typeof req.body?.language === 'string'
          ? req.body.language
          : null,
      header: typeof req.headers['accept-language'] === 'string' ? req.headers['accept-language'] : null,
      userPreferred: req.user?.preferred_language ?? null,
    });

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
    const cacheKey = `gemini:img:${imageHash}:${language}`;

    if (redis) {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // parsed could be an array of items
        const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
        return res.json({
          language,
          items: items.map((i: any) => ({ ...i, is_ai_estimate: true })),
        });
      }
    }

    const strippedBuffer = await sharp(req.file.buffer).toBuffer();

    try {
      console.log('[Scrap] About to create provider');
      const provider = createAnalysisProvider();
      console.log('[Scrap] Provider created, calling analyzeScrapImage');

      const resultsRaw = await provider.analyzeScrapImage(strippedBuffer, language);
      const resultsArray = Array.isArray(resultsRaw) ? resultsRaw : (resultsRaw as any).items || [];

      console.log('[Scrap] Analysis complete, items mapped:', resultsArray.length);

      const validItems = resultsArray.filter((result: any) => {
        return VALID_CODES.has(result.material_code) && Number(result.estimated_weight_kg) > 0;
      });

      if (validItems.length === 0) {
        console.warn('[Scrap] Analysis validation failed or no valid items found');
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
        await redis.set(cacheKey, JSON.stringify(validItems), { ex: 86400 });
        await redis.incr(dayKey);
        await redis.expire(dayKey, 86400);
        await redis.incr(legacyGlobalKey);
      }

      return res.json({
        language,
        items: validItems.map((i: any) => ({ ...i, is_ai_estimate: true })),
        image_key: imageUrl || null
      });
    } catch (providerError: any) {
      console.error('[Scrap] Provider error - CRITICAL', {
        message: providerError?.message,
        code: providerError?.code,
        stack: providerError?.stack?.split('\n').slice(0, 5).join('\n'),
        userId: req.user?.id,
      });
      return res.status(400).json({ status: 'analysis_failed' });
    }
  } catch (error: any) {
    console.error('[Scrap] Outer catch - CRITICAL', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    });
    return res.status(400).json({ status: 'analysis_failed' });
  }
});

export default router;
