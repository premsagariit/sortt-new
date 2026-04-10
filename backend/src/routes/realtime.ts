import express from 'express';
import { getChannelHmacPrefix } from '../utils/channelHelper';
import { createTokenRequest } from '../lib/realtime';

const router = express.Router();

const buildCapability = (userId: string, userType?: string) => {
  const hmacPrefix = getChannelHmacPrefix(userId);
  const capability: Record<string, string[]> = {
    [`${hmacPrefix}:*`]: ['subscribe', 'publish', 'presence'],
  };

  if (userType === 'aggregator') {
    capability['orders:hyd:new'] = ['subscribe'];
  }

  return capability;
};

/**
 * GET /api/realtime/token
 * Protected by authMiddleware — req.user.id is the internal UUID.
 * Issues an Ably token scoped to the authenticated user's channels.
 */
router.get('/token', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unable to determine user' });
    }

    const tokenRequest = await createTokenRequest(
      userId,
      buildCapability(userId, req.user?.user_type)
    );
    return res.status(200).json(tokenRequest);
  } catch (error: any) {
    console.error('[realtime] Token generation error:', error);
    return res.status(500).json({ error: 'Failed to generate realtime token' });
  }
});

/**
 * GET /api/realtime/ably-token (LEGACY — kept for mobile backward compat)
 * Falls through to the same logic as /token since both are now behind
 * the same JWT authMiddleware.
 */
router.get('/ably-token', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unable to determine user' });
    }

    const tokenRequest = await createTokenRequest(
      userId,
      buildCapability(userId, req.user?.user_type)
    );
    return res.status(200).json(tokenRequest);
  } catch (error: any) {
    console.error('[realtime] Token generation error:', error);
    return res.status(500).json({ error: 'Failed to generate realtime token' });
  }
});

export default router;
