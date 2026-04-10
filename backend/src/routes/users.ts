import { Router } from 'express';
import { query } from '../lib/db';
import { normalizeLanguage } from '../utils/language';
import * as Sentry from '@sentry/node';

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

    if (name) {
      await query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
    }

    if (typeof email === 'string' && email.trim().length > 0) {
      const normalizedEmail = email.trim().toLowerCase();
      await query(
        `UPDATE users
         SET email = $1,
             email_normalized = $2,
             email_verified_at = NULL
         WHERE id = $3`,
        [email.trim(), normalizedEmail, userId]
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
        [userId, profile_type, business_name, gstin, locality, city_code]
      );
    }

    await query('COMMIT');
    res.json({ success: true });
  } catch (e: any) {
    await query('ROLLBACK');
    console.error('Profile update error:', e);
    Sentry.captureException(e);
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
          u.password_change_required,
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
              u.password_change_required,
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

    // Strip sensitive fields
    delete userObj.phone_hash;
    delete userObj.clerk_user_id;

    res.json(userObj);
  } catch (error: any) {
    console.error('GET /api/users/me error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
