import { Router, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import * as Sentry from '@sentry/node';
import multer from 'multer';
import sharp from 'sharp';
import { query } from '../lib/db';
import { createNotification } from '../lib/notifications';
import { channelName } from '../utils/channelHelper';
import { sendPushToUsers } from '../utils/pushNotifications';
import { publishEvent } from '../lib/realtime';
import { storageProvider } from '../lib/storage';
import { resolveProfilePhotosBucket } from '../lib/storageBuckets';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
    }
});

const stripHtml = (text?: string) =>
    text ? sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }) : '';

// V26: Phone number regex — replace with exact string checked by G10.3 gate
const PHONE_REGEX = /(?:\+91|0)?[6-9]\d{9}/g;
const sanitizePhone = (content: string) =>
    content.replace(PHONE_REGEX, '[phone number removed]');
const MESSAGE_IMAGE_PREFIX = '__image__:';

const resolveMessageRow = async (row: any) => {
    const content = String(row.content ?? '');
    const isImage = content.startsWith(MESSAGE_IMAGE_PREFIX);
    if (!isImage) {
        return {
            ...row,
            message_type: 'text',
            media_url: null,
        };
    }

    const storageKey = content.slice(MESSAGE_IMAGE_PREFIX.length);
    let mediaUrl: string | null = null;
    try {
        mediaUrl = await storageProvider.getSignedUrl(storageKey, 3600);
    } catch {
        mediaUrl = null;
    }

    return {
        ...row,
        content: '[image]',
        message_type: 'image',
        media_url: mediaUrl,
    };
};

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
            SELECT o.seller_id, o.aggregator_id, s.id as seller_clerk, a.id as agg_clerk
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
                        message_type: 'text',
                        media_url: null,
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
            messageType: 'text',
            mediaUrl: null,
            createdAt: msg.created_at
        });
    } catch (e: any) {
        console.error('POST /api/messages error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/messages/image
// multipart/form-data: { order_id, file }
router.post('/image', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const senderId = req.user?.id;
        if (!senderId) return res.status(401).json({ error: 'Unauthorized' });

        const orderId = String(req.body?.order_id || '');
        if (!orderId) {
            return res.status(400).json({ error: 'order_id is required' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'file is required' });
        }

        const orderRes = await query(`
            SELECT o.seller_id, o.aggregator_id, s.id as seller_clerk, a.id as agg_clerk
            FROM orders o
            LEFT JOIN users s ON s.id = o.seller_id
            LEFT JOIN users a ON a.id = o.aggregator_id
            WHERE o.id = $1 AND o.deleted_at IS NULL
        `, [orderId]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderRes.rows[0];
        const isParty = order.seller_id === senderId || order.aggregator_id === senderId;
        if (!isParty) return res.status(403).json({ error: 'Forbidden: not a party to this order' });

        const normalizedBuffer = await sharp(req.file.buffer)
            .rotate()
            .resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 82 })
            .toBuffer();

        const storageKey = await storageProvider.uploadFile(
            normalizedBuffer,
            `messages_${orderId}_${Date.now()}_${senderId}.jpg`,
            'image/jpeg'
        );

        const messageContent = `${MESSAGE_IMAGE_PREFIX}${storageKey}`;
        const insertRes = await query(
            `INSERT INTO messages (order_id, sender_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, content, created_at`,
            [orderId, senderId, messageContent]
        );

        const msg = insertRes.rows[0];
        const mediaUrl = await storageProvider.getSignedUrl(storageKey, 3600);

        setImmediate(async () => {
            try {
                const recipientId = senderId === order.seller_id ? order.aggregator_id : order.seller_id;

                try {
                    const sellerChannel = channelName(order.seller_clerk, 'chat', orderId);
                    const payload = {
                        id: msg.id,
                        order_id: orderId,
                        sender_id: senderId,
                        content: '[image]',
                        message_type: 'image',
                        media_url: mediaUrl,
                        created_at: msg.created_at,
                    };
                    await publishEvent(sellerChannel, 'message', payload);

                    if (order.aggregator_id && order.agg_clerk) {
                        const aggChannel = channelName(order.agg_clerk, 'chat', orderId);
                        await publishEvent(aggChannel, 'message', payload);
                    }
                } catch (ablyErr) {
                    console.error('Ably image message publish failed:', ablyErr);
                }

                if (recipientId) {
                    await createNotification(
                        recipientId,
                        'New Image',
                        'You have received an image message',
                        'message'
                    );

                    await sendPushToUsers(
                        [recipientId],
                        'New image',
                        'You received an image message',
                        { order_id: orderId, kind: 'new_message_image' }
                    );
                }
            } catch (err) {
                console.error('Failed to create notification for image message:', err);
            }
        });

        return res.status(201).json({
            messageId: msg.id,
            content: '[image]',
            messageType: 'image',
            mediaUrl,
            createdAt: msg.created_at,
        });
    } catch (e: any) {
        if (e.message === 'Invalid file type') {
            return res.status(400).json({ error: e.message });
        }
        console.error('POST /api/messages/image error:', e);
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
                   s.id AS seller_clerk,
                   a.id AS agg_clerk
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
            `SELECT o.seller_id, o.aggregator_id,
                    su.name AS seller_name, su.id AS seller_clerk,
                    su.profile_photo_url AS seller_profile_photo_url,
                    au.name AS aggregator_name, au.id AS aggregator_clerk,
                    au.profile_photo_url AS aggregator_profile_photo_url
             FROM orders o
             LEFT JOIN users su ON su.id = o.seller_id
             LEFT JOIN users au ON au.id = o.aggregator_id
             WHERE o.id = $1 AND o.deleted_at IS NULL`,
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

        const mappedMessages = await Promise.all(result.rows.map(resolveMessageRow));

        const bucketName = resolveProfilePhotosBucket();
        const signPhoto = async (key: string | null | undefined) => {
            const storageKey = String(key ?? '').trim();
            if (!storageKey) return null;
            try {
                return await storageProvider.getSignedUrl(storageKey, 3600, bucketName);
            } catch {
                return null;
            }
        };

        const sellerAvatarUrl = await signPhoto(order.seller_profile_photo_url ?? order.seller_photo_url ?? order.seller_avatar_url ?? null);
        const aggregatorAvatarUrl = await signPhoto(order.aggregator_profile_photo_url ?? order.aggregator_photo_url ?? order.aggregator_avatar_url ?? null);

        return res.json({
            messages: mappedMessages,
            participants: {
                seller_id: order.seller_id,
                seller_name: order.seller_name,
                seller_avatar_url: sellerAvatarUrl,
                aggregator_id: order.aggregator_id,
                aggregator_name: order.aggregator_name,
                aggregator_avatar_url: aggregatorAvatarUrl,
            },
        });
    } catch (e: any) {
        console.error('GET /api/messages error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
