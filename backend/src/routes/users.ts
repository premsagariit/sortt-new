import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { query } from '../lib/db';
import * as Sentry from '@sentry/node'; // Assuming Sentry is imported or needs to be added

const router = Router();

// Endpoint for push token registration
router.post('/device-token', async (req, res) => {
  const { deviceToken, provider } = req.body;
  const { userId: clerkUserId } = getAuth(req);

  console.log('[DIAG] POST /api/users/device-token', { clerkUserId, deviceToken, provider });

  if (!clerkUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!deviceToken || !provider) {
    return res.status(400).json({ error: 'Device token and provider are required' });
  }

  try {
    // Get internal user ID
    const userRes = await query('SELECT id FROM users WHERE clerk_user_id = $1', [clerkUserId]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userRes.rows[0].id;

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

// Endpoint for updating user profile (Seller onboarding)
router.post('/profile', async (req, res) => {
  const { userId: clerkUserId } = getAuth(req);
  const { name, profile_type, business_name, gstin, locality, city_code } = req.body;

  console.log('[DIAG] POST /api/users/profile', { clerkUserId, body: req.body });

  if (!clerkUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get internal user ID
    const userRes = await query('SELECT id FROM users WHERE clerk_user_id = $1', [clerkUserId]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userRes.rows[0].id;

    await query('BEGIN');

    // Update name in users table if provided
    if (name) {
      await query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
    }

    // Upsert into seller_profiles
    if (profile_type) {
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

export default router;
