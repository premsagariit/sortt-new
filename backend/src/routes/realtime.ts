import express from 'express';
import { verifyToken } from '@clerk/backend';
import { getChannelHmacPrefix } from '../utils/channelHelper';
import { createTokenRequest } from '../lib/realtime';

const router = express.Router();

// GET /api/realtime/token (NEW — standard endpoint with JWT middleware)
// Requires Clerk JWT in Authorization header  
router.get('/token', async (req, res) => {
  try {
    const clerkUserId = req.user?.clerk_user_id;
    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unable to determine user' });
    }

    const tokenRequest = await createTokenRequest(clerkUserId);
    return res.status(200).json(tokenRequest);
  } catch (error: any) {
    console.error('[realtime] Token generation error:', error);
    return res.status(500).json({ error: 'Failed to generate realtime token' });
  }
});

// GET /api/realtime/ably-token (LEGACY)
// Endpoint used by mobile client to retrieve short-lived Ably tokens
router.get('/ably-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token missing' });
    }

    // Verify token manually using Clerk client to extract user securely
    let verified;
    try {
      verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
        authorizedParties: []
      });
    } catch (e: any) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const clerkUserId = verified.sub;
    if (!clerkUserId) {
      return res.status(401).json({ error: 'No subject in token' });
    }

    // Generate secure prefix constraint
    const hmacPrefix = getChannelHmacPrefix(clerkUserId);

    // Request token bounded to exact channels this user can access
    const tokenRequest = await createTokenRequest(clerkUserId, {
      [`${hmacPrefix}:*`]: ['subscribe', 'publish', 'presence']
    });

    return res.status(200).json(tokenRequest);
  } catch (error: any) {
    console.error('[realtime] Token generation error:', error);
    return res.status(500).json({ error: 'Failed to generate realtime token' });
  }
});

export default router;
