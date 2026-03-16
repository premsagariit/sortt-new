import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import { query, withUser, pool } from '../../lib/db';
import { DbOrder, buildOrderDto } from '../../utils/orderDto';
import { ALLOWED_TRANSITIONS, IMMUTABLE_STATUSES } from '../../utils/orderStateMachine';
import { mapProvider } from '../../providers/maps';
import { orderCreateLimiter, redis } from '../../lib/redis';
import { verifyUserRole } from '../../middleware/verifyRole';
import { storageProvider } from '../../lib/storage';
import sanitizeHtml from 'sanitize-html';
import * as Sentry from '@sentry/node';
import axios from 'axios';
import { UTApi } from 'uploadthing/server';
import { createClerkClient } from '@clerk/backend';
import { createNotification } from '../../lib/notifications';

// Multer for media uploads (5MB, images only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/heic'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
  }
});

// Uploadthing API client for signed URLs (D1)
const utapi = process.env.UPLOADTHING_TOKEN && !process.env.UPLOADTHING_TOKEN.startsWith('sk_live_xxxx')
  ? new UTApi({ token: process.env.UPLOADTHING_TOKEN })
  : null;

const router = Router();

// Validation helpers
const stripHtml = (text?: string) => text ? sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }) : '';

// 1. POST /api/orders
// Only sellers can create orders
router.post('/', verifyUserRole('seller'), async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('[DIAG] POST /api/orders | userId:', userId, 'body:', JSON.stringify(req.body));
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Rate Limiter
    if (orderCreateLimiter) {
      const { success } = await orderCreateLimiter.limit(userId);
      if (!success) {
        return res.status(429).json({ error: 'rate_limit_exceeded', retryAfter: 3600 });
      }
    }

    const {
      material_codes,
      estimated_weights,
      pickup_address,
      pickup_preference: preferred_pickup_window,
      seller_note
    } = req.body;

    if (!material_codes || !Array.isArray(material_codes) || material_codes.length === 0) {
      return res.status(400).json({ error: 'material_codes is required and must be an array' });
    }
    if (!estimated_weights || typeof estimated_weights !== 'object') {
      return res.status(400).json({ error: 'estimated_weights is required' });
    }
    if (!pickup_address) {
      return res.status(400).json({ error: 'pickup_address is required' });
    }

    const cleanAddress = stripHtml(pickup_address);
    const cleanNote = stripHtml(seller_note);

    const geo = await mapProvider.geocode(cleanAddress).catch((err: any) => {
      if (err.message === 'unsupported_city' || err.message === 'geocode_failed') {
        console.warn('[DIAG] Geocode caught error:', err.message);
        throw err;
      }
      console.error('Geocode error:', err);
      throw new Error('geocode_failed');
    });

    console.log('[DIAG] Geocode success:', JSON.stringify(geo));

    // Need to use transaction explicitly in withUser if needed.
    // withUser does NOT begin a transaction by default!
    const order = await withUser<DbOrder>(userId, async (client) => {
      await client.query('BEGIN');
      try {
        const orderRes = await client.query(`
              INSERT INTO orders (
                seller_id, city_code, pickup_address, pickup_locality, pickup_lat, pickup_lng, preferred_pickup_window, seller_note, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'created')
              RETURNING *
            `, [
          userId, geo.cityCode, cleanAddress, geo.locality, geo.lat, geo.lng, JSON.stringify({ type: preferred_pickup_window }), cleanNote
        ]);

        const newOrder = orderRes.rows[0];
        const orderId = newOrder.id;

        for (const code of material_codes) {
          const weight = estimated_weights[code] || 0;
          await client.query(`
                 INSERT INTO order_items (order_id, material_code, estimated_weight_kg)
                 VALUES ($1, $2, $3)
               `, [orderId, code, weight]);
        }

          await client.query(`
              INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
              VALUES ($1, NULL, 'created', $2, 'Order created')
            `, [orderId, userId]);

        await client.query('COMMIT');
        return newOrder;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    });

    // Fire best-effort push notification
    setImmediate(async () => {
      try {
        const aggRes = await query(`
              SELECT DISTINCT d.expo_token, d.user_id
              FROM device_tokens d
              JOIN aggregator_availability a ON d.user_id = a.user_id AND a.is_online = true
              JOIN aggregator_profiles p ON a.user_id = p.user_id AND p.city_code = $1
              JOIN aggregator_material_rates m ON p.user_id = m.aggregator_id AND m.material_code = ANY($2)
            `, [geo.cityCode, material_codes]);

        const tokens = aggRes.rows.map(r => r.expo_token).filter(t => t.startsWith('ExponentPushToken'));

        if (tokens.length > 0) {
          const messages = tokens.map(to => ({
            to,
            sound: 'default',
            title: 'New pickup nearby',
            body: 'A new scrap listing is available in your area.',
          }));
          const headers: any = {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          };
          if (process.env.EXPO_ACCESS_TOKEN) {
            headers['Authorization'] = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
          }
          await axios.post('https://exp.host/--/api/v2/push/send', messages, { headers }).catch(e => {
            console.error('Push delivery error:', e.response?.data || e.message);
          });
        }

        // --- NEW: In-app notification for all matching aggregators ---
        const userIds = aggRes.rows.map(r => r.user_id);
        for (const uid of userIds) {
          await createNotification(
            uid,
            'New order near you!',
            'A new scrap listing is available in your area.',
            'order'
          );
        }
      } catch (pushErr) {
        console.error('Best effort push failed:', pushErr);
      }
    });

    return res.status(201).json({ order: buildOrderDto(order, userId) });
  } catch (error: any) {
    if (error.message === 'unsupported_city') {
      return res.status(422).json({ error: 'unsupported_city' });
    }
    if (error.message === 'geocode_failed') {
      return res.status(422).json({ error: 'geocode_failed', message: "We couldn't find that address — please check and try again." });
    }
    console.error('POST /api/orders error:', error);
    Sentry.captureException(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET /api/orders — seller (default) or aggregator via ?role=aggregator
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { cursor, role } = req.query;
    const limit = 20;
    let result;

    if (role === 'aggregator') {
      // Return orders accepted by this aggregator
      const baseQuery = `
        SELECT o.*, 
               COALESCE(json_agg(DISTINCT oi.material_code) FILTER (WHERE oi.material_code IS NOT NULL), '[]') as material_codes,
               COALESCE(jsonb_object_agg(oi.material_code, oi.estimated_weight_kg) FILTER (WHERE oi.material_code IS NOT NULL), '{}') as estimated_weights
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.aggregator_id = $1
      `;
      if (cursor) {
        result = await query(`
            ${baseQuery} AND o.created_at < $2
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT $3
          `, [userId, cursor, limit + 1]);
      } else {
        result = await query(`
            ${baseQuery}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT $2
          `, [userId, limit + 1]);
      }
    } else {
      // Default: seller's own orders
      const baseQuery = `
        SELECT o.*, 
               COALESCE(json_agg(DISTINCT oi.material_code) FILTER (WHERE oi.material_code IS NOT NULL), '[]') as material_codes,
               COALESCE(jsonb_object_agg(oi.material_code, oi.estimated_weight_kg) FILTER (WHERE oi.material_code IS NOT NULL), '{}') as estimated_weights
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.seller_id = $1
      `;
      if (cursor) {
        result = await query(`
            ${baseQuery} AND o.created_at < $2
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT $3
          `, [userId, cursor, limit + 1]);
      } else {
        result = await query(`
            ${baseQuery}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT $2
          `, [userId, limit + 1]);
      }
    }

    const rows = result.rows;
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const nextCursor = rows.length > 0 ? rows[rows.length - 1].created_at : null;

    return res.json({
      orders: rows.map(o => buildOrderDto(o, userId)),
      nextCursor,
      hasMore
    });

  } catch (e) {
    console.error('GET /api/orders error:', e);
    Sentry.captureException(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- NEW Day 10 routes (registered BEFORE /:id to avoid param collision) ---

// 3a. GET /api/orders/feed — aggregator-only, all filters server-derived (V21)
router.get('/feed', verifyUserRole('aggregator'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch city_code from DB (V21 — never trust client-supplied)
    const profRes = await query(
      'SELECT city_code FROM aggregator_profiles WHERE user_id = $1',
      [userId]
    );
    if (!profRes.rows[0]) {
      return res.status(403).json({ error: 'Aggregator profile not found' });
    }
    const { city_code } = profRes.rows[0];

    const { cursor } = req.query;
    const limit = 20;

    // Feed: 'created' orders in aggregator's city where aggregator has ≥1 matching rate
    // G10.7: orders with NO matching rate for this aggregator are excluded
    const params: any[] = [userId, city_code];
    let cursorClause = '';
    if (cursor) {
      cursorClause = `AND o.created_at < $${params.length + 1}`;
      params.push(cursor);
    }
    params.push(limit + 1);

    const result = await query(`
            SELECT o.*, 
                   COALESCE(json_agg(DISTINCT oi.material_code) FILTER (WHERE oi.material_code IS NOT NULL), '[]') as material_codes
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            JOIN aggregator_material_rates r
                ON r.aggregator_id = $1
               AND r.material_code = oi.material_code
            WHERE o.status = 'created'
              AND o.deleted_at IS NULL
              AND o.city_code = $2
              ${cursorClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT $${params.length}
        `, params);

    const rows = result.rows;
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    if (process.env.NODE_ENV !== 'production') {
      console.log('[FEED DIAG] GET /api/orders/feed', {
        userId,
        city_code,
        returnedCount: rows.length,
        orderIds: rows.map((o: any) => o.id),
      });
    }

    // V25: pickup_address null for pre-acceptance (buildOrderDto handles this)
    return res.json({
      orders: rows.map((o: DbOrder) => buildOrderDto(o, userId)),
      nextCursor: rows.length > 0 ? rows[rows.length - 1].created_at : null,
      hasMore
    });
  } catch (e: any) {
    console.error('GET /api/orders/feed error:', e);
    Sentry.captureException(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3b. POST /api/orders/:id/media — V18: EXIF strip BEFORE any other processing
router.post('/:id/media', upload.single('file'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { id: orderId } = req.params;
    const { media_type } = req.body;

    // const ALLOWED_MEDIA_TYPES = ['scale_photo', 'before_photo', 'after_photo'];
    const ALLOWED_MEDIA_TYPES = ['scale_photo', 'scrap_photo'];
    if (!media_type || !ALLOWED_MEDIA_TYPES.includes(media_type)) {
      return res.status(400).json({ error: `media_type must be one of: ${ALLOWED_MEDIA_TYPES.join(', ')}` });
    }

    // Verify requester is a party to the order
    const orderRes = await query(
      'SELECT seller_id, aggregator_id FROM orders WHERE id = $1 AND deleted_at IS NULL',
      [orderId]
    );
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderRes.rows[0];
    const isParty = order.seller_id === userId || order.aggregator_id === userId;
    if (!isParty) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // V18: EXIF strip is the FIRST operation on the file buffer — before upload, before anything
    const strippedBuffer = await sharp(req.file.buffer)
      .jpeg({ quality: 90 }) // normalise to JPEG, strips all metadata
      .toBuffer();

    // Upload stripped buffer to storage
    const filename = `order_${orderId}_${media_type}_${Date.now()}.jpg`;
    const storageKey = await storageProvider.uploadFile(strippedBuffer, filename, 'image/jpeg');

    // INSERT into order_media
    const mediaRes = await query(
      `INSERT INTO order_media (order_id, media_type, storage_path, uploaded_by)
             VALUES ($1, $2, $3, $4)
             RETURNING id, created_at`,
      [orderId, media_type, storageKey, userId]
    );
    const mediaId = mediaRes.rows[0].id;

    // scale_photo: generate OTP + attempt WhatsApp send (non-fatal)
    if (media_type === 'scale_photo') {
      setImmediate(async () => {
        try {
          const otp = crypto.randomInt(100000, 999999).toString();
          const hmacSecret = process.env.OTP_HMAC_SECRET!;
          const hmac = crypto.createHmac('sha256', hmacSecret).update(otp).digest('hex');

          if (redis) {
            await redis.set(`otp:order:${orderId}`, hmac, { ex: 600 });
            await redis.set(`otp:order_plain:${orderId}`, otp, { ex: 600 });
          }

          // [DEV ONLY] Always log the OTP to console so we can test without WhatsApp
          if (process.env.NODE_ENV !== 'production') {
            console.log(`\n\n[DEV OTP] ==========================================`);
            console.log(`[DEV OTP] ORDER ID: ${orderId}`);
            console.log(`[DEV OTP] CODE:     ${otp}`);
            console.log(`[DEV OTP] ==========================================\n\n`);
          }

          // Fetch seller phone for WhatsApp send
          const sellerRes = await query(
            'SELECT phone_hash FROM users WHERE id = $1',
            [order.seller_id]
          );

          // WhatsApp OTP send (non-fatal — token may be expired in dev)
          const metaToken = process.env.META_WHATSAPP_TOKEN;
          const phoneId = process.env.META_PHONE_NUMBER_ID;
          if (metaToken && phoneId && sellerRes.rows[0]) {
            await axios.post(
              `https://graph.facebook.com/v18.0/${phoneId}/messages`,
              {
                messaging_product: 'whatsapp',
                to: sellerRes.rows[0].phone_hash, // phone in production
                type: 'template',
                template: {
                  name: process.env.META_OTP_TEMPLATE_NAME || 'order_otp',
                  language: { code: 'en' },
                  components: [{ type: 'body', parameters: [{ type: 'text', text: otp }] }]
                }
              },
              { headers: { Authorization: `Bearer ${metaToken}` } }
            ).catch((e: any) => {
              console.warn('[OTP DEV] WhatsApp send failed (non-fatal):', e.message);
            });
          } else {
            console.log('[OTP DEV] Skipping WhatsApp — token/phoneId missing or expired');
          }
        } catch (otpErr) {
          console.error('[OTP] scale_photo OTP flow error (non-fatal):', otpErr);
        }
      });
    }

    return res.status(201).json({ mediaId, mediaType: media_type });
  } catch (e: any) {
    if (e.message === 'Invalid file type') {
      return res.status(400).json({ error: e.message });
    }
    console.error('POST /api/orders/:id/media error:', e);
    Sentry.captureException(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3c. GET /api/orders/:id/media/:mediaId/url — D1: signed URL, 5-min expiry only
router.get('/:id/media/:mediaId/url', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id: orderId, mediaId } = req.params;

    // Verify ownership
    const orderRes = await query(
      'SELECT seller_id, aggregator_id FROM orders WHERE id = $1',
      [orderId]
    );
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderRes.rows[0];
    const isParty = order.seller_id === userId || order.aggregator_id === userId;
    if (!isParty) return res.status(403).json({ error: 'Forbidden' });

    // Fetch media record
    const mediaRes = await query(
      'SELECT storage_path FROM order_media WHERE id = $1 AND order_id = $2',
      [mediaId, orderId]
    );
    if (mediaRes.rows.length === 0) return res.status(404).json({ error: 'Media not found' });
    const storageKey = mediaRes.rows[0].storage_path;

    // D1: 5-minute signed URL — never return permanent URLs
    const expiresAt = new Date(Date.now() + 300_000).toISOString();
    let url: string;

    if (utapi && !storageKey.startsWith('/uploads/')) {
      // Uploadthing signed URL
      const result = await utapi.getSignedURL(storageKey, { expiresIn: 300 });
      url = typeof result === 'string' ? result : (result as any).url;
    } else {
      // Local dev: serve relative path (no real expiry in dev mode)
      url = `${process.env.API_BASE_URL || 'http://localhost:8080'}${storageKey}`;
    }

    return res.json({ url, expiresAt });
  } catch (e: any) {
    console.error('GET /api/orders/:id/media/:mediaId/url error:', e);
    Sentry.captureException(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- End Day 10 routes ---

// 3d. GET /api/orders/:id/media — list all media items for an order (V25: parties only)
router.get('/:id/media', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id: orderId } = req.params;

    // Verify party membership
    const orderRes = await query(
      'SELECT seller_id, aggregator_id FROM orders WHERE id = $1',
      [orderId]
    );
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderRes.rows[0];
    const isParty = order.seller_id === userId || order.aggregator_id === userId;
    if (!isParty) return res.status(403).json({ error: 'Forbidden' });

    const mediaRes = await query(
      `SELECT id, media_type, created_at
       FROM order_media
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [orderId]
    );
    return res.json({ media: mediaRes.rows });
  } catch (e: any) {
    console.error('GET /api/orders/:id/media error:', e);
    Sentry.captureException(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const result = await query(`
      SELECT o.*,
             u.name as seller_name,
             u.display_phone as seller_display_phone,
             agg.name as aggregator_name,
             agg.display_phone as aggregator_display_phone,
             COALESCE(json_agg(DISTINCT oi.material_code) FILTER (WHERE oi.material_code IS NOT NULL), '[]') as material_codes,
             jsonb_object_agg(oi.material_code, oi.estimated_weight_kg) as estimated_weights,
             (
               SELECT json_agg(h ORDER BY h.created_at ASC)
               FROM order_status_history h
               WHERE h.order_id = o.id
             ) as history
      FROM orders o
      LEFT JOIN users u ON u.id = o.seller_id
      LEFT JOIN users agg ON agg.id = o.aggregator_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id, u.name, u.display_phone, agg.name, agg.display_phone
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const order = result.rows[0];
    if (order.seller_id === userId && order.status === 'weighing_in_progress' && redis) {
      const sellerOtp = await redis.get<string>(`otp:order_plain:${id}`);
      order.otp = sellerOtp ?? '';
    }
    return res.json(buildOrderDto(order, userId));

  } catch (e) {
    console.error('GET /api/orders/:id error:', e);
    Sentry.captureException(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.user_type;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { status: newStatus, note } = req.body;

    if (!newStatus) return res.status(400).json({ error: 'status is required' });

    if ((IMMUTABLE_STATUSES as readonly string[]).includes(newStatus)) {
      return res.status(400).json({ error: 'invalid_transition' });
    }

    await withUser(userId, async (client) => {
      await client.query('BEGIN');
      try {
        const currentRes = await client.query('SELECT status, aggregator_id FROM orders WHERE id = $1 FOR UPDATE', [id]);
        if (currentRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Not found' });
        }

        const currentOrder = currentRes.rows[0];
        const currentStatus = currentOrder.status;

        const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
        if (!allowedNext || !allowedNext.includes(newStatus)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'invalid_transition' });
        }

        if ((newStatus === 'en_route' || newStatus === 'weighing_in_progress') && userType !== 'aggregator') {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'forbidden' });
        }

        if (currentOrder.aggregator_id && currentOrder.aggregator_id !== userId && userType === 'aggregator') {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'not_assigned_aggregator' });
        }

        await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);

        await client.query(`
          INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
          VALUES ($1, $2, $3, $4, $5)
             `, [id, currentStatus, newStatus, userId, stripHtml(note)]);

        await client.query('COMMIT');

        // --- NEW: Create in-app notification for the other party ---
        setImmediate(async () => {
          try {
            const orderRes = await query('SELECT seller_id, aggregator_id FROM orders WHERE id = $1', [id]);
            const order = orderRes.rows[0];
            if (!order) return;

            const otherPartyId = userId === order.seller_id ? order.aggregator_id : order.seller_id;
            if (otherPartyId) {
              let title = `Order #${id.slice(0, 8)} updated`;
              let body = `Status changed to ${newStatus}`;

              if (newStatus === 'accepted') {
                title = 'Order Accepted!';
                body = 'An aggregator is coming for your pickup.';
              } else if (newStatus === 'completed') {
                title = 'Order Completed';
                body = 'Pickup successful. Check your balance.';
              }

              await createNotification(otherPartyId, title, body, 'order');
            }
          } catch (err) {
            console.error('Failed to create notification on status change:', err);
          }
        });

        // SP1: On acceptance, cache seller's phone from Clerk into users.display_phone.
        // Non-fatal — runs after response is sent. Clerk outage cannot block acceptance.
        if (newStatus === 'accepted') {
          setImmediate(async () => {
            try {
              // Fetch the order's seller_id (not available in currentOrder without a join)
              const sellerRes = await query(
                'SELECT seller_id, display_phone FROM orders o JOIN users u ON u.id = o.seller_id WHERE o.id = $1',
                [id]
              );
              if (!sellerRes.rows[0]) return;
              const { seller_id, display_phone } = sellerRes.rows[0];

              // Early-return guard — already cached, skip Clerk API call
              if (display_phone) return;

              const clerkSecretKey = process.env.CLERK_SECRET_KEY;
              if (!clerkSecretKey) {
                console.warn('[SP1] CLERK_SECRET_KEY not set — cannot cache seller phone');
                return;
              }

              // Fetch clerk_user_id for this seller
              const userRes = await query(
                'SELECT clerk_user_id FROM users WHERE id = $1',
                [seller_id]
              );
              if (!userRes.rows[0]?.clerk_user_id) return;
              const clerkUserId = userRes.rows[0].clerk_user_id;

              const clerk = createClerkClient({ secretKey: clerkSecretKey });
              const clerkUser = await clerk.users.getUser(clerkUserId);
              const primaryPhoneId = clerkUser.primaryPhoneNumberId;
              const phoneObj = clerkUser.phoneNumbers.find(p => p.id === primaryPhoneId);
              const phoneNumber = phoneObj?.phoneNumber ?? null;

              if (phoneNumber) {
                await query(
                  'UPDATE users SET display_phone = $1 WHERE id = $2',
                  [phoneNumber, seller_id]
                );
                console.log(`[SP1] Cached seller phone for order ${id}`);
              }
            } catch (err) {
              // Non-fatal: log and swallow. Acceptance response already sent.
              console.error('[SP1] Failed to cache seller phone — non-fatal:', err);
              Sentry.captureException(err);
            }
          });
        }

        return res.json({ success: true, status: newStatus });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    });

  } catch (e: any) {
    console.error('PATCH /api/orders/:id/status error:', e);
    Sentry.captureException(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. DELETE /api/orders/:id
router.delete('/:id', verifyUserRole('seller'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    await withUser(userId, async (client) => {
      await client.query('BEGIN');
      try {
        const orderRes = await client.query('SELECT seller_id, status FROM orders WHERE id = $1 FOR UPDATE', [id]);

        if (orderRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Not found' });
        }

        const order = orderRes.rows[0];

        if (order.seller_id !== userId) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'forbidden' });
        }

        if ((IMMUTABLE_STATUSES as readonly string[]).includes(order.status) || order.status === 'cancelled') {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'cannot cancel order in this status' });
        }

        await client.query('UPDATE orders SET status = $1, deleted_at = NOW(), updated_at = NOW() WHERE id = $2', ['cancelled', id]);

        await client.query(`
          INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
          VALUES ($1, $2, 'cancelled', $3, 'Order cancelled by seller')
             `, [id, order.status, userId]);

        await client.query('COMMIT');
        return res.json({ success: true });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    });
  } catch (e) {
    console.error('DELETE /api/orders/:id error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. POST /api/orders/:orderId/accept
router.post('/:orderId/accept', verifyUserRole('aggregator'), async (req, res) => {
  const { orderId } = req.params;
  const aggregatorId = req.user!.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_user_id = '${aggregatorId}'`);

    const lockResult = await client.query(
      `SELECT id FROM orders WHERE id = $1 AND status = 'created' FOR UPDATE SKIP LOCKED`,
      [orderId]
    );

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'order_already_taken' });
    }

    await client.query(
      `UPDATE orders SET status = 'accepted', aggregator_id = $1, updated_at = NOW() WHERE id = $2`,
      [aggregatorId, orderId]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
       VALUES ($1, 'created', 'accepted', $2, 'Aggregator accepted')`,
      [orderId, aggregatorId]
    );

    await client.query('COMMIT');
    // TODO Day 13: publish Ably event — order:{orderId} channel, status_updated
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // ALWAYS — prevents pool exhaustion
  }

  // Notification (identical pattern to PATCH handler)
  setImmediate(async () => {
    try {
      const orderRes = await query('SELECT seller_id FROM orders WHERE id = $1', [orderId]);
      const order = orderRes.rows[0];
      if (!order) return;
      await createNotification(order.seller_id, 'Order Accepted!', 'An aggregator is coming for your pickup.', 'order');
    } catch (err) {
      console.error('Failed to create notification on accept:', err);
    }
  });

  // SP1: Cache seller phone — IDENTICAL block to PATCH handler
  setImmediate(async () => {
    try {
      const sellerRes = await query(
        'SELECT seller_id, display_phone FROM orders o JOIN users u ON u.id = o.seller_id WHERE o.id = $1',
        [orderId]
      );
      if (!sellerRes.rows[0]) return;
      const { seller_id, display_phone } = sellerRes.rows[0];
      if (display_phone) return;

      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (!clerkSecretKey) {
        console.warn('[SP1] CLERK_SECRET_KEY not set — cannot cache seller phone');
        return;
      }
      const userRes = await query('SELECT clerk_user_id FROM users WHERE id = $1', [seller_id]);
      if (!userRes.rows[0]?.clerk_user_id) return;
      
      const clerk = createClerkClient({ secretKey: clerkSecretKey });
      const clerkUser = await clerk.users.getUser(userRes.rows[0].clerk_user_id);
      const phoneObj = clerkUser.phoneNumbers.find(p => p.id === clerkUser.primaryPhoneNumberId);
      const phoneNumber = phoneObj?.phoneNumber ?? null;
      if (phoneNumber) {
        await query('UPDATE users SET display_phone = $1 WHERE id = $2', [phoneNumber, seller_id]);
        console.log(`[SP1] Cached seller phone for order ${orderId}`);
      }
    } catch (err) {
      console.error('[SP1] Failed to cache seller phone — non-fatal:', err);
      Sentry.captureException(err);
    }
  });

  // Return full post-acceptance DTO
  const orderRes = await query(`
    SELECT o.*,
           u.name as seller_name, u.display_phone as seller_display_phone,
           agg.name as aggregator_name, agg.display_phone as aggregator_display_phone,
           COALESCE(json_agg(DISTINCT oi.material_code) FILTER (WHERE oi.material_code IS NOT NULL), '[]') as material_codes,
           jsonb_object_agg(oi.material_code, oi.estimated_weight_kg) as estimated_weights
    FROM orders o
    LEFT JOIN users u ON u.id = o.seller_id
    LEFT JOIN users agg ON agg.id = o.aggregator_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = $1
    GROUP BY o.id, u.name, u.display_phone, agg.name, agg.display_phone
  `, [orderId]);

  return res.status(200).json({ order: buildOrderDto(orderRes.rows[0], aggregatorId) });
});

// 7. POST /api/orders/:orderId/verify-otp
router.post('/:orderId/verify-otp', verifyUserRole('aggregator'), async (req, res) => {
  const { orderId } = req.params;
  const { otp } = req.body;
  const aggregatorId = req.user!.id;

  if (!otp || typeof otp !== 'string') {
    return res.status(400).json({ error: 'otp is required' });
  }

  // Fast-path status check before acquiring lock
  const preCheck = await query('SELECT status FROM orders WHERE id = $1', [orderId]);
  if (preCheck.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  if (preCheck.rows[0].status !== 'weighing_in_progress') {
    return res.status(400).json({ error: 'invalid_order_status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_user_id = '${aggregatorId}'`);

    const lockRes = await client.query(
      'SELECT aggregator_id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    const order = lockRes.rows[0];

    // V8: only the assigned aggregator can verify OTP
    if (order.aggregator_id !== aggregatorId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'not_assigned_aggregator' });
    }

    // Re-check status inside lock (race condition guard)
    if (order.status !== 'weighing_in_progress') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_order_status' });
    }

    // Fetch OTP HMAC from Redis
    const storedHmac = redis ? await redis.get('otp:order:' + orderId) : null;
    if (!storedHmac) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'otp_expired' });
    }

    // Timing-safe OTP comparison
    const hmacSecret = process.env.OTP_HMAC_SECRET!;
    const submittedHmac = crypto.createHmac('sha256', hmacSecret).update(otp).digest('hex');
    const storedBuf = Buffer.from(storedHmac as string, 'hex');
    const submittedBuf = Buffer.from(submittedHmac, 'hex');
    if (storedBuf.length !== submittedBuf.length || !crypto.timingSafeEqual(storedBuf, submittedBuf)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_otp' });
    }

    // TODO Day 13: validate snapshotHmac binding once weighing screen computes and sends the weight snapshot HMAC.

    await client.query(
      `UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [orderId]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
       VALUES ($1, $2, 'completed', $3, 'OTP verified — order completed')`,
      [orderId, order.status, aggregatorId]
    );

    await client.query('COMMIT');
    // TODO Day 13: publish Ably event — order:{orderId} channel, status_updated
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // ALWAYS
    
    if (redis) {
      await redis.del('otp:order:' + orderId); // V-OTP-1: one-time use
      await redis.del('otp:order_plain:' + orderId);
    }
  }

  // Non-blocking invoice generation placeholder
  setImmediate(() => {
    // TODO Day 15: triggerInvoiceGeneration(orderId)
  });

  return res.status(200).json({ success: true });
});

export default router;
