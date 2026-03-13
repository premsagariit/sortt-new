import { Router } from 'express';
import { query, withUser } from '../../lib/db';
import { DbOrder, buildOrderDto } from '../../utils/orderDto';
import { ALLOWED_TRANSITIONS, IMMUTABLE_STATUSES } from '../../utils/orderStateMachine';
import { mapProvider } from '../../providers/maps';
import { orderCreateLimiter } from '../../lib/redis';
import { verifyUserRole } from '../../middleware/verifyRole';
import sanitizeHtml from 'sanitize-html';
import * as Sentry from '@sentry/node';
import axios from 'axios';

const router = Router();

// Validation helpers
const stripHtml = (text?: string) => text ? sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }) : '';

// 1. POST /api/orders
// Only sellers can create orders
router.post('/', verifyUserRole('seller'), async (req, res) => {
  try {
    const userId = req.user?.id;
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
      pickup_address_text: pickup_address, // Map from incoming field to standardized name
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
      return res.status(400).json({ error: 'pickup_address_text is required' });
    }

    const cleanAddress = stripHtml(pickup_address);
    const cleanNote = stripHtml(seller_note);

    const geo = await mapProvider.geocode(cleanAddress).catch((err: any) => {
      if (err.message === 'unsupported_city' || err.message === 'geocode_failed') {
        throw err;
      }
      console.error('Geocode error:', err);
      throw new Error('geocode_failed');
    });

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
               INSERT INTO order_status_history (order_id, new_status, changed_by, note)
               VALUES ($1, 'created', $2, 'Order created')
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
              SELECT DISTINCT d.expo_token
              FROM device_tokens d
              JOIN aggregator_availability a ON d.user_id = a.user_id AND a.is_online = true
              JOIN aggregator_profiles p ON a.user_id = p.user_id AND p.city_code = $1
              JOIN aggregator_material_rates m ON p.user_id = m.user_id AND m.material_code = ANY($2)
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

// 2. GET /api/orders (cursor pagination for seller)
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { cursor } = req.query;

    const limit = 20;
    let result;
    if (cursor) {
      result = await query(`
          SELECT * FROM orders
          WHERE seller_id = $1 AND created_at < $2
          ORDER BY created_at DESC
          LIMIT $3
        `, [userId, cursor, limit + 1]);
    } else {
      result = await query(`
          SELECT * FROM orders
          WHERE seller_id = $1
          ORDER BY created_at DESC
          LIMIT $2
        `, [userId, limit + 1]);
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

// 3. GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const result = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const order = result.rows[0];
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
                INSERT INTO order_status_history (order_id, new_status, changed_by, note)
                VALUES ($1, $2, $3, $4)
             `, [id, newStatus, userId, stripHtml(note)]);

        await client.query('COMMIT');
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
                INSERT INTO order_status_history (order_id, new_status, changed_by, note)
                VALUES ($1, 'cancelled', $2, 'Order cancelled by seller')
             `, [id, userId]);

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

export default router;
