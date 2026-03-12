import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { query } from '../lib/db';

const router = Router();

// Endpoint for push token registration
router.post('/device-token', async (req, res) => {
  const { deviceToken, provider } = req.body;
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!deviceToken || !provider) {
    return res.status(400).json({ error: 'Device token and provider are required' });
  }

  try {
    // Basic implementation for Day 8
    await query(
      `
      INSERT INTO device_tokens (user_id, token, provider)
      VALUES ($1, $2, $3)
      ON CONFLICT (token) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          updated_at = NOW()
      `,
      [userId, deviceToken, provider]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
