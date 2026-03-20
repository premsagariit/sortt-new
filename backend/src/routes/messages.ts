import { Router, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { createNotification } from '../lib/notifications';
import { channelName } from '../utils/channelHelper';
import { sendPushToUsers } from '../utils/pushNotifications';
import { publishEvent } from '../lib/realtime';

const router = Router();

const stripHtml = (text?: string) =>
    text ? sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }) : '';

// V26: Phone number regex — replace with exact string checked by G10.3 gate
const PHONE_REGEX = /(?:\+91|0)?[6-9]\d{9}/g;
const sanitizePhone = (content: string) =>
    content.replace(PHONE_REGEX, '[phone number removed]');

// POST /api/messages
// Body: { order_id, content }
// V26: phone filter applied BEFORE DB insert
router.post('/', async (req: Request, res: Response) => {
    try {
        const senderId = req.user?.id;
        if (!senderId) return res.status(401).json({ error: 'Unauthorized' });

        const { order_id, content } = req.body;

        if (!order_id || typeof order_id !== 'string') {
            return res.status(400).json({ error: 'order_id is required' });
        }
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ error: 'content is required' });
        }

        // Verify sender is a party to the order (seller or assigned aggregator)
        const orderRes = await query(`
            SELECT o.seller_id, o.aggregator_id, s.clerk_user_id as seller_clerk, a.clerk_user_id as agg_clerk
            FROM orders o
            LEFT JOIN users s ON s.id = o.seller_id
            LEFT JOIN users a ON a.id = o.aggregator_id
            WHERE o.id = $1 AND o.deleted_at IS NULL
        `, [order_id]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = orderRes.rows[0];
        const isParty = order.seller_id === senderId || order.aggregator_id === senderId;
        if (!isParty) {
            return res.status(403).json({ error: 'Forbidden: not a party to this order' });
        }

        // V26: strip HTML first, then apply phone filter BEFORE insert
        const cleanContent = sanitizePhone(stripHtml(content));

        const insertRes = await query(
            `INSERT INTO messages (order_id, sender_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, content, created_at`,
            [order_id, senderId, cleanContent]
        );

        const msg = insertRes.rows[0];

        // --- NEW: Notify the recipient ---
        setImmediate(async () => {
            try {
                const recipientId = senderId === order.seller_id ? order.aggregator_id : order.seller_id;
                
        // Publish to both seller and aggregator Ably channels if Ably is configured
                // WARN 2: Lock event name to 'message' (no 'new_message' alternatives)
                try {
                    const sellerChannel = channelName(order.seller_clerk, 'chat', order_id);
                    const payload = {
                        id: msg.id,
                        order_id,
                        sender_id: senderId,
                        content: cleanContent,
                        created_at: msg.created_at
                    };
                    await publishEvent(sellerChannel, 'message', payload);

                    if (order.aggregator_id && order.agg_clerk) {
                        const aggChannel = channelName(order.agg_clerk, 'chat', order_id);
                        await publishEvent(aggChannel, 'message', payload);
                    }
                } catch (ablyErr) {
                    console.error('Ably message publish failed:', ablyErr);
                }

                if (recipientId) {
                    await createNotification(
                        recipientId,
                        'New Message',
                        cleanContent.length > 50 ? cleanContent.substring(0, 47) + '...' : cleanContent,
                        'message'
                    );

                    // NEW: Send push notification (D2: generic copy, zero PII)
                    await sendPushToUsers(
                        [recipientId],
                        'New message',
                        'You have a new message',
                        { order_id, kind: 'new_message' }
                    );
                }
            } catch (err) {
                console.error('Failed to create notification for message:', err);
            }
        });

        return res.status(201).json({
            messageId: msg.id,
            content: msg.content,
            createdAt: msg.created_at
        });
    } catch (e: any) {
        console.error('POST /api/messages error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/messages/read
// Body: { order_id }
// Marks all messages from the other party as read, notifies them via Ably
router.patch('/read', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { order_id } = req.body;
        if (!order_id || typeof order_id !== 'string') {
            return res.status(400).json({ error: 'order_id is required' });
        }

        const orderRes = await query(`
            SELECT o.seller_id, o.aggregator_id,
                   s.clerk_user_id AS seller_clerk,
                   a.clerk_user_id AS agg_clerk
            FROM orders o
            LEFT JOIN users s ON s.id = o.seller_id
            LEFT JOIN users a ON a.id = o.aggregator_id
            WHERE o.id = $1 AND o.deleted_at IS NULL
        `, [order_id]);

        if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
        const order = orderRes.rows[0];
        if (order.seller_id !== userId && order.aggregator_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Mark all unread messages sent by the OTHER party as read
        await query(
            `UPDATE messages SET read_at = NOW()
             WHERE order_id = $1 AND sender_id != $2 AND read_at IS NULL`,
            [order_id, userId]
        );

        // Notify the sender (other party) via their order channel so they see double ticks
        setImmediate(async () => {
            try {
                const otherClerkId = userId === order.seller_id ? order.agg_clerk : order.seller_clerk;
                if (otherClerkId) {
                    const otherOrderChannel = channelName(otherClerkId, 'order', order_id);
                    await publishEvent(otherOrderChannel, 'messages_read', {
                        order_id,
                        read_by: userId,
                    });
                }
            } catch (err) {
                console.error('[messages/read] Ably publish error:', err);
            }
        });

        return res.json({ success: true });
    } catch (e: any) {
        console.error('PATCH /api/messages/read error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/messages?order_id=<uuid>
// Returns messages for an order (sender must be a party)
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { order_id } = req.query;
        if (!order_id || typeof order_id !== 'string') {
            return res.status(400).json({ error: 'order_id query param is required' });
        }

        // Verify party membership
        const orderRes = await query(
            'SELECT seller_id, aggregator_id FROM orders WHERE id = $1 AND deleted_at IS NULL',
            [order_id]
        );
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = orderRes.rows[0];
        if (order.seller_id !== userId && order.aggregator_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const result = await query(
            `SELECT id, sender_id, content, read_at, created_at
             FROM messages
             WHERE order_id = $1
             ORDER BY created_at ASC`,
            [order_id]
        );

        return res.json({ messages: result.rows });
    } catch (e: any) {
        console.error('GET /api/messages error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
