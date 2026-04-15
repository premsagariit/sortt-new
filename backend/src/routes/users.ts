import { Router } from 'express';
import { query } from '../lib/db';
import { normalizeLanguage, resolveRequestLanguage } from '../utils/language';
import * as Sentry from '@sentry/node';
import multer from 'multer';
import sharp from 'sharp';
import { sanitizeName, sellerSuffix, aggregatorSuffix } from '../lib/idGenerator';
import { issueToken } from '../lib/jwt';
import { storageProvider } from '../lib/storage';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
  }
});

const router = Router();

// PATCH /api/users/language
router.patch('/language', async (req, res) => {
  const userId = req.user?.id;
  const preferredLanguageRaw = req.body?.preferred_language;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const requestedLanguage = typeof preferredLanguageRaw === 'string'
    ? preferredLanguageRaw.trim().toLowerCase().replace('_', '-').split('-')[0]
    : '';

  if (!['en', 'te', 'hi'].includes(requestedLanguage)) {
    return res.status(400).json({ error: 'Invalid preferred language' });
  }

  const preferredLanguage = normalizeLanguage(requestedLanguage);

  try {
    const result = await query(
      `UPDATE users
       SET preferred_language = $1
       WHERE id = $2
       RETURNING preferred_language`,
      [preferredLanguage, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ success: true, preferred_language: result.rows[0].preferred_language });
  } catch (error: any) {
    console.error('PATCH /api/users/language error:', error);
    Sentry.captureException(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/user-type — persist selected user type during onboarding
router.post('/user-type', async (req, res) => {
  const userId = req.user?.id;
  const { user_type } = req.body as { user_type?: 'seller' | 'aggregator' };

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user_type !== 'seller' && user_type !== 'aggregator') {
    return res.status(400).json({ error: 'Invalid user type' });
  }

  try {
    const result = await query(
      `UPDATE users
       SET user_type = $1
       WHERE id = $2
       RETURNING id, user_type`,
      [user_type, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user_type: result.rows[0].user_type });
  } catch (error: any) {
    console.error('POST /api/users/user-type error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/device-token — push token registration
router.post('/device-token', async (req, res) => {
  const userId = req.user?.id;
  const { deviceToken, provider } = req.body;

  console.log('[DIAG] POST /api/users/device-token', { userId, deviceToken, provider });

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!deviceToken || !provider) {
    return res.status(400).json({ error: 'Device token and provider are required' });
  }

  try {
    await query(
      `INSERT INTO device_tokens (user_id, expo_token, token_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, expo_token) DO UPDATE SET last_seen_at = NOW()`,
      [userId, deviceToken, provider]
    );

    res.json({ success: true });
  } catch (e: any) {
    console.error('Device token registration error:', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/profile — seller onboarding profile update
router.post('/profile', async (req, res) => {
  const userId = req.user?.id;
  const { name, profile_type, business_name, gstin, locality, city_code, email } = req.body;

  console.log('[DIAG] POST /api/users/profile', { userId, body: req.body });

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await query('BEGIN');

    // ── ID rename: if provisional account (tmp_...) and name is being set ──
    let finalUserId = userId;
    if (name && userId.startsWith('tmp_')) {
      // Fetch display_phone to rebuild proper suffix
      const phoneRes = await query(
        `SELECT display_phone, user_type FROM users WHERE id = $1`,
        [userId]
      );
      if ((phoneRes.rowCount ?? 0) > 0) {
        const { display_phone, user_type } = phoneRes.rows[0];
        const namePart = sanitizeName(name);
        const typeChar = user_type === 'aggregator' ? 'a' : 's';
        const suffix = user_type === 'aggregator'
          ? aggregatorSuffix(display_phone)
          : sellerSuffix(display_phone);
        const newId = `${namePart}_${typeChar}_${suffix}`;

        // Check for collision
        const collision = await query(`SELECT id FROM users WHERE id = $1`, [newId]);
        if ((collision.rowCount ?? 0) === 0) {
          // Rename: update PK + cascade all FK tables
          await query(`UPDATE users SET id = $1, name = $2 WHERE id = $3`, [newId, name, userId]);
          // Cascade — all FKs that reference users.id
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
            ).catch(() => { /* table may not exist yet, that's fine */ });
          }
          finalUserId = newId;
          console.log(`[ID-RENAME] ${userId} → ${newId}`);
        } else {
          // Collision — just set the name, keep old id
          await query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
        }
      }
    } else if (name) {
      await query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
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

    if (profile_type || business_name || gstin || locality || city_code) {
      await query(
        `INSERT INTO seller_profiles (user_id, profile_type, business_name, gstin, locality, city_code)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           profile_type = EXCLUDED.profile_type,
           business_name = COALESCE(EXCLUDED.business_name, seller_profiles.business_name),
           gstin = COALESCE(EXCLUDED.gstin, seller_profiles.gstin),
           locality = COALESCE(EXCLUDED.locality, seller_profiles.locality),
           city_code = COALESCE(EXCLUDED.city_code, seller_profiles.city_code)`,
        [finalUserId, profile_type, business_name, gstin, locality, city_code]
      );
    }

    await query('COMMIT');
    // Issue fresh JWT if ID was renamed — old JWT sub (tmp_...) no longer maps to a DB row
    let newToken: string | undefined;
    if (finalUserId !== userId) {
      try {
        newToken = await issueToken(finalUserId, '7d');
      } catch (jwtErr) {
        console.warn('[ID-RENAME] Failed to issue new token after rename:', jwtErr);
      }
    }
    res.json({
      success: true,
      id: finalUserId,
      id_changed: finalUserId !== userId,
      new_token: newToken,
    });
  } catch (e: any) {
    await query('ROLLBACK');
    console.error('Profile update error:', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/profile-photo
router.post('/profile-photo', upload.single('file'), async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'File is required' });
  }

  try {
    const normalizedBuffer = await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 500, height: 500, fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const bucketName = 'sortt-profiles'; 
    const storageKey = await storageProvider.uploadWithKey(
      normalizedBuffer,
      `profile_${userId}_${Date.now()}.jpg`,
      bucketName
    );

    await query(
      `UPDATE users
       SET profile_photo_url = $1
       WHERE id = $2`,
      [storageKey, userId]
    );

    const signedUrl = await storageProvider.getSignedUrl(storageKey, 3600 * 24 * 7, bucketName); // 7 days expiry

    res.json({ success: true, profile_photo_url: signedUrl });
  } catch (error: any) {
    if (error.message === 'Invalid file type') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Profile photo upload error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me — fetch current user details
router.get('/me', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let dbRes;
    try {
      dbRes = await query(
        `SELECT u.id, u.user_type, u.is_active, u.name, u.email, u.created_at, u.preferred_language,
          u.password_change_required, u.profile_photo_url, u.display_phone,
                s.profile_type as seller_profile_type, s.business_name as seller_business_name,
                s.gstin as seller_gstin, s.locality as seller_locality, s.city_code as seller_city_code,
                a.business_name as aggregator_business_name, a.operating_area as aggregator_locality,
                a.city_code as aggregator_city_code, a.kyc_status as aggregator_kyc_status,
                COALESCE(r.material_count, 0) as aggregator_material_count,
                COALESCE(k.has_kyc_media, false) as aggregator_has_kyc_media
         FROM users_public u
         LEFT JOIN seller_profiles s ON u.id = s.user_id AND u.user_type = 'seller'
         LEFT JOIN aggregator_profiles a ON u.id = a.user_id AND u.user_type = 'aggregator'
         LEFT JOIN (
           SELECT aggregator_id, COUNT(*)::int AS material_count
           FROM aggregator_material_rates
           GROUP BY aggregator_id
         ) r ON r.aggregator_id = u.id
         LEFT JOIN (
           SELECT uploaded_by, true AS has_kyc_media
           FROM order_media
           WHERE media_type IN ('kyc_shop', 'kyc_vehicle')
           GROUP BY uploaded_by
         ) k ON k.uploaded_by = u.id
         WHERE u.id = $1`,
        [userId]
      );
    } catch (viewError: any) {
      if (viewError.code === '42P01' || viewError.code === '42703') {
        dbRes = await query(
          `SELECT u.id, u.user_type, u.is_active, u.name, u.email, u.created_at, u.preferred_language,
              u.password_change_required, u.profile_photo_url, u.display_phone,
                  s.profile_type as seller_profile_type, s.business_name as seller_business_name,
                  s.gstin as seller_gstin, s.locality as seller_locality, s.city_code as seller_city_code,
                  a.business_name as aggregator_business_name, a.operating_area as aggregator_locality,
                  a.city_code as aggregator_city_code, a.kyc_status as aggregator_kyc_status,
                  COALESCE(r.material_count, 0) as aggregator_material_count,
                  COALESCE(k.has_kyc_media, false) as aggregator_has_kyc_media
           FROM users u
           LEFT JOIN seller_profiles s ON u.id = s.user_id AND u.user_type = 'seller'
           LEFT JOIN aggregator_profiles a ON u.id = a.user_id AND u.user_type = 'aggregator'
           LEFT JOIN (
             SELECT aggregator_id, COUNT(*)::int AS material_count
             FROM aggregator_material_rates
             GROUP BY aggregator_id
           ) r ON r.aggregator_id = u.id
           LEFT JOIN (
             SELECT uploaded_by, true AS has_kyc_media
             FROM order_media
             WHERE media_type IN ('kyc_shop', 'kyc_vehicle')
             GROUP BY uploaded_by
           ) k ON k.uploaded_by = u.id
           WHERE u.id = $1`,
          [userId]
        );
      } else {
        throw viewError;
      }
    }

    if (dbRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userObj = { ...dbRes.rows[0] };
    userObj.must_change_password = Boolean(userObj.password_change_required);
    userObj.full_name = userObj.name ?? null;
    userObj.phone = userObj.display_phone ?? null;
    userObj.photo_url = userObj.profile_photo_url ?? null;

    // Fetch signed URL for profile photo
    if (userObj.profile_photo_url) {
      const bucketName = 'sortt-profiles';
      try {
        userObj.profile_photo_url = await storageProvider.getSignedUrl(userObj.profile_photo_url, 3600 * 24 * 7, bucketName);
      } catch (err) {
        console.warn('Failed to get signed URL for profile photo', err);
        userObj.profile_photo_url = null;
      }
    }

    // Strip sensitive fields
    delete userObj.phone_hash;

    res.json(userObj);
  } catch (error: any) {
    console.error('GET /api/users/me error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me/local-rates - seller city-level average from verified active aggregators
router.get('/me/local-rates', async (req, res) => {
  const userId = req.user?.id;
  const userType = req.user?.user_type;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (userType !== 'seller') {
    return res.status(403).json({ error: 'Forbidden: Seller access only' });
  }

  try {
    const sellerCityRes = await query(
      `SELECT COALESCE(NULLIF(TRIM(s.city_code), ''), NULLIF(TRIM($2::text), '')) AS city_code
       FROM users u
       LEFT JOIN seller_profiles s ON s.user_id = u.id
       WHERE u.id = $1`,
      [userId, req.user?.city_code ?? null]
    );

    const cityCode = String(sellerCityRes.rows[0]?.city_code ?? '').trim();
    if (!cityCode) {
      return res.status(400).json({ error: 'seller_city_not_set' });
    }

    const language = resolveRequestLanguage({
      explicit: typeof req.query.language === 'string' ? req.query.language : null,
      header: typeof req.headers['accept-language'] === 'string' ? req.headers['accept-language'] : null,
      userPreferred: req.user?.preferred_language ?? null,
    });

    const ratesRes = await query(
      `WITH eligible_aggregators AS (
          SELECT u.id
          FROM users u
          JOIN aggregator_profiles a ON a.user_id = u.id
          WHERE u.user_type = 'aggregator'
            AND u.is_active = true
            AND LOWER(TRIM(COALESCE(a.city_code, ''))) = LOWER(TRIM($1::text))
            AND LOWER(TRIM(COALESCE(a.kyc_status, ''))) = 'verified'
      ),
      averaged AS (
          SELECT r.material_code,
                 AVG(r.rate_per_kg)::numeric(10,2) AS avg_rate_per_kg,
                 COUNT(*)::int AS contributor_count
          FROM aggregator_material_rates r
          JOIN eligible_aggregators e ON e.id = r.aggregator_id
          WHERE r.material_code IS NOT NULL
            AND COALESCE(r.is_custom, false) = false
            AND r.rate_per_kg > 0
          GROUP BY r.material_code
      )
      SELECT mt.code AS material_code,
             COALESCE(
               CASE
                 WHEN $2 = 'te' THEN mt.label_te
                 WHEN $2 = 'hi' THEN to_jsonb(mt) ->> 'label_hi'
                 ELSE mt.label_en
               END,
               mt.label_en,
               mt.code
             ) AS name,
             a.avg_rate_per_kg::float8 AS rate_per_kg,
             (a.material_code IS NOT NULL) AS is_available,
             COALESCE(a.contributor_count, 0)::int AS contributor_count
      FROM material_types mt
      LEFT JOIN averaged a ON a.material_code = mt.code
      ORDER BY mt.code ASC`,
      [cityCode, language]
    );

    return res.json({
      city_code: cityCode,
      rates: ratesRes.rows.map((row: any) => ({
        material_code: row.material_code,
        name: row.name,
        rate_per_kg: row.rate_per_kg != null ? Number(row.rate_per_kg) : null,
        is_available: Boolean(row.is_available),
        contributor_count: Number(row.contributor_count ?? 0),
      })),
      computed_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('GET /api/users/me/local-rates error:', error);
    Sentry.captureException(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
