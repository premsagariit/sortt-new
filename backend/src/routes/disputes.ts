import { Router, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import * as Sentry from '@sentry/node';
import { withUser } from '../lib/db';

const router = Router();

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

        const cleanDescription = stripHtml(description);
        const cleanIssueType = stripHtml(issue_type);

        let disputeId: string;

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

                // V13: completed is immutable; disputed is already in dispute path
                if (['disputed', 'completed'].includes(order.status)) {
                    await client.query('ROLLBACK');
                    res.status(400).json({
                        error: 'invalid_status',
                        message: `Cannot open a dispute on an order with status '${order.status}'`
                    });
                    return;
                }

                // Verify raiser is a party to the order
                const isParty = order.seller_id === userId || order.aggregator_id === userId;
                if (!isParty) {
                    await client.query('ROLLBACK');
                    res.status(403).json({ error: 'Forbidden: not a party to this order' });
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

                // 2. UPDATE order status to 'disputed'
                await client.query(
                    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
                    ['disputed', order_id]
                );

                // 3. INSERT order_status_history (R3 — every transition must be recorded)
                await client.query(
                    `INSERT INTO order_status_history (order_id, new_status, changed_by, note)
                     VALUES ($1, 'disputed', $2, 'Dispute raised')`,
                    [order_id, userId]
                );

                await client.query('COMMIT');
                res.status(201).json({ disputeId, createdAt: disputeRes.rows[0].created_at });
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

export default router;
