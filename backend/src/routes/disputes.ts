import { Router, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import * as Sentry from '@sentry/node';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import { withUser, query } from '../lib/db';
import { createNotification } from '../lib/notifications';
import { storageProvider } from '../lib/storage';
import { sendPushToUsers } from '../utils/pushNotifications';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/heic'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
    },
});

const ALLOWED_ISSUE_TYPES = [
    'wrong_weight',
    'payment_not_made',
    'no_show',
    'abusive_behaviour',
    'other',
] as const;
const ALLOWED_ISSUE_TYPES_SET = new Set<string>(ALLOWED_ISSUE_TYPES);

const stripHtml = (text?: string) =>
    text ? sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }) : '';

// POST /api/disputes
// Body: { order_id, issue_type, description, order_item_id? }
// Atomic 3-op transaction: INSERT dispute + UPDATE order + INSERT order_status_history (R3)
// Guard: reject if order is already 'disputed' or 'completed' (V13)
router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { order_id, issue_type, description, order_item_id } = req.body;

        if (!order_id || typeof order_id !== 'string') {
            return res.status(400).json({ error: 'order_id is required' });
        }
        if (!issue_type || typeof issue_type !== 'string') {
            return res.status(400).json({ error: 'issue_type is required' });
        }
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            return res.status(400).json({ error: 'description is required' });
        }

        const cleanIssueType = stripHtml(issue_type).trim();
        if (!ALLOWED_ISSUE_TYPES_SET.has(cleanIssueType)) {
            return res.status(400).json({
                error: 'invalid_issue_type',
                message: `issue_type must be one of: ${ALLOWED_ISSUE_TYPES.join(', ')}`,
            });
        }

        const cleanDescription = stripHtml(description).trim();
        if (cleanDescription.length === 0) {
            return res.status(400).json({ error: 'description is required' });
        }
        if (cleanDescription.length > 2000) {
            return res.status(400).json({
                error: 'description_too_long',
                message: 'description must be 2000 characters or fewer',
            });
        }

        let disputeId: string;
        let createdAt: string;

        await withUser(userId, async (client) => {
            await client.query('BEGIN');
            try {
                // Guard: fetch current order status (FOR UPDATE to lock the row)
                const orderRes = await client.query(
                    'SELECT status, seller_id, aggregator_id FROM orders WHERE id = $1 FOR UPDATE',
                    [order_id]
                );
                if (orderRes.rows.length === 0) {
                    await client.query('ROLLBACK');
                    res.status(404).json({ error: 'Order not found' });
                    return;
                }

                const order = orderRes.rows[0];

                // Dispute can only be raised by order parties
                const isParty = order.seller_id === userId || order.aggregator_id === userId;
                if (!isParty) {
                    await client.query('ROLLBACK');
                    res.status(403).json({ error: 'Forbidden: not a party to this order' });
                    return;
                }

                if (order.status === 'disputed') {
                    await client.query('ROLLBACK');
                    res.status(409).json({ error: 'order_already_disputed' });
                    return;
                }

                if (order.status !== 'completed') {
                    await client.query('ROLLBACK');
                    res.status(400).json({
                        error: 'invalid_status',
                        message: 'Disputes can only be raised on completed orders',
                    });
                    return;
                }

                const existingOpenDispute = await client.query(
                    `SELECT id
                     FROM disputes
                     WHERE order_id = $1 AND status = 'open'
                     LIMIT 1`,
                    [order_id]
                );
                if (existingOpenDispute.rows.length > 0) {
                    await client.query('ROLLBACK');
                    res.status(409).json({ error: 'open_dispute_exists' });
                    return;
                }

                // 1. INSERT dispute
                const disputeRes = await client.query(
                    `INSERT INTO disputes (order_id, raised_by, issue_type, description, status, order_item_id)
                     VALUES ($1, $2, $3, $4, 'open', $5)
                     RETURNING id, created_at`,
                    [order_id, userId, cleanIssueType, cleanDescription, order_item_id || null]
                );
                disputeId = disputeRes.rows[0].id;
                createdAt = disputeRes.rows[0].created_at;

                // 2. UPDATE order status to 'disputed'
                await client.query(
                    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
                    ['disputed', order_id]
                );

                // 3. INSERT order_status_history (R3 — every transition must be recorded)
                await client.query(
                    `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
                     VALUES ($1, $2, 'disputed', $3, 'Dispute raised')`,
                    [order_id, 'completed', userId]
                );

                await client.query('COMMIT');

                // Notify both parties and all admins using PII-safe generic copy.
                setImmediate(async () => {
                    try {
                        const adminRes = await query(
                            `SELECT id FROM users WHERE user_type = 'admin' AND is_active = true`
                        );

                        const recipientIds = Array.from(
                            new Set<string>(
                                [order.seller_id, order.aggregator_id, ...adminRes.rows.map((r: { id: string }) => r.id)]
                                    .filter((id: string | null | undefined): id is string => !!id)
                            )
                        );

                        const title = 'Dispute Raised';
                        const body = 'A dispute has been raised on an order. Please review in app.';

                        for (const recipientId of recipientIds) {
                            await createNotification(recipientId, title, body, 'dispute', {
                                order_id,
                                dispute_id: disputeId,
                                kind: 'dispute_created',
                            });
                        }

                        await sendPushToUsers(recipientIds, title, body, {
                            order_id,
                            dispute_id: disputeId,
                            kind: 'dispute_created',
                        });
                    } catch (err) {
                        console.error('Failed to create notification for dispute:', err);
                    }
                });

                res.status(201).json({ disputeId, createdAt });
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            }
        });
    } catch (e: any) {
        console.error('POST /api/disputes error:', e);
        Sentry.captureException(e);
        // Avoid double-response if already sent inside withUser
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// GET /api/disputes/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const disputeId = req.params.id;
        const isAdmin = req.user?.user_type === 'admin';

        await withUser(userId, async (client) => {
            const disputeRes = await client.query(
                `SELECT d.id,
                        d.order_id,
                        d.issue_type,
                        d.description,
                        d.status,
                        d.resolution_note,
                        d.created_at,
                        d.resolved_at,
                        o.seller_id,
                        o.aggregator_id
                 FROM disputes d
                 JOIN orders o ON o.id = d.order_id
                 WHERE d.id = $1
                 LIMIT 1`,
                [disputeId]
            );

            if (disputeRes.rows.length === 0) {
                res.status(404).json({ error: 'Dispute not found' });
                return;
            }

            const dispute = disputeRes.rows[0];
            const isParty = dispute.seller_id === userId || dispute.aggregator_id === userId;
            if (!isAdmin && !isParty) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            const evidenceRes = await client.query(
                `SELECT id, storage_path, created_at
                 FROM dispute_evidence
                 WHERE dispute_id = $1
                 ORDER BY created_at ASC`,
                [disputeId]
            );

            const evidence = await Promise.all(
                evidenceRes.rows.map(async (row: { id: string; storage_path: string; created_at: string }) => {
                    try {
                        const expiresAt = new Date(Date.now() + 300_000).toISOString();
                        const url = await storageProvider.getSignedUrl(row.storage_path, 300);
                        return {
                            id: row.id,
                            url,
                            created_at: row.created_at,
                            expires_at: expiresAt,
                        };
                    } catch {
                        return {
                            id: row.id,
                            url: null,
                            created_at: row.created_at,
                            expires_at: null,
                        };
                    }
                })
            );

            res.status(200).json({
                dispute: {
                    id: dispute.id,
                    order_id: dispute.order_id,
                    issue_type: dispute.issue_type,
                    description: dispute.description,
                    status: dispute.status,
                    resolution_note: dispute.resolution_note,
                    created_at: dispute.created_at,
                    resolved_at: dispute.resolved_at,
                },
                evidence,
            });
        });
    } catch (e: any) {
        console.error('GET /api/disputes/:id error:', e);
        Sentry.captureException(e);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// POST /api/disputes/:id/evidence
router.post('/:id/evidence', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const uploadedFile = req.file;

        const disputeId = req.params.id;

        await withUser(userId, async (client) => {
            const disputeRes = await client.query(
                `SELECT d.id, d.order_id, o.seller_id, o.aggregator_id
                 FROM disputes d
                 JOIN orders o ON o.id = d.order_id
                 WHERE d.id = $1
                 LIMIT 1`,
                [disputeId]
            );

            if (disputeRes.rows.length === 0) {
                res.status(404).json({ error: 'Dispute not found' });
                return;
            }

            const dispute = disputeRes.rows[0];
            const isParty = dispute.seller_id === userId || dispute.aggregator_id === userId;
            if (!isParty) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            // V18: Strip EXIF before upload.
            const strippedBuffer = await sharp(uploadedFile.buffer)
                .jpeg({ quality: 90 })
                .toBuffer();

            const randomHex = crypto.randomBytes(8).toString('hex');
            const storagePath = `disputes/${dispute.order_id}/${disputeId}/${Date.now()}-${randomHex}.jpg`;
            const uploadedKey = await storageProvider.uploadWithKey(strippedBuffer, storagePath);

            const insertRes = await client.query(
                `INSERT INTO dispute_evidence (dispute_id, submitted_by, storage_path)
                 VALUES ($1, $2, $3)
                 RETURNING id, created_at`,
                [disputeId, userId, uploadedKey]
            );

            res.status(201).json({
                evidenceId: insertRes.rows[0].id,
                createdAt: insertRes.rows[0].created_at,
            });
        });
    } catch (e: any) {
        if (e.message === 'Invalid file type') {
            return res.status(400).json({ error: e.message });
        }
        console.error('POST /api/disputes/:id/evidence error:', e);
        Sentry.captureException(e);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
});

export default router;
