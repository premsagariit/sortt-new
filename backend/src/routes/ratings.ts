import { Router, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import * as Sentry from '@sentry/node';
import { query } from '../lib/db';
import { createNotification } from '../lib/notifications';

const router = Router();

const stripHtml = (text?: string) =>
    text ? sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }) : '';

// POST /api/ratings
// Body: { order_id, ratee_id, score, review? }
// Only if order.status = 'completed' AND rater is an order party
// One rating per (order_id, rater_id) enforced by UNIQUE constraint → 409 on duplicate
router.post('/', async (req: Request, res: Response) => {
    try {
        const raterId = req.user?.id;
        if (!raterId) return res.status(401).json({ error: 'Unauthorized' });

        const { order_id, ratee_id, score, review } = req.body;

        if (!order_id || typeof order_id !== 'string') {
            return res.status(400).json({ error: 'order_id is required' });
        }
        if (!ratee_id || typeof ratee_id !== 'string') {
            return res.status(400).json({ error: 'ratee_id is required' });
        }
        if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
            return res.status(400).json({ error: 'score must be an integer between 1 and 5' });
        }

        // Verify order is completed and rater is a party
        const orderRes = await query(
            'SELECT seller_id, aggregator_id, status FROM orders WHERE id = $1',
            [order_id]
        );
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = orderRes.rows[0];

        if (order.status !== 'completed') {
            return res.status(400).json({ error: 'Can only rate completed orders' });
        }

        const isParty = order.seller_id === raterId || order.aggregator_id === raterId;
        if (!isParty) {
            return res.status(403).json({ error: 'Forbidden: not a party to this order' });
        }

        const cleanReview = review ? stripHtml(review) : null;

        try {
            const result = await query(
                `INSERT INTO ratings (order_id, rater_id, ratee_id, score, review)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, created_at`,
                [order_id, raterId, ratee_id, score, cleanReview]
            );
            const rating = result.rows[0];

            // --- NEW: Notify the ratee ---
            setImmediate(async () => {
                try {
                    await createNotification(
                        ratee_id,
                        'New Rating',
                        `You have received a ${score}-star rating.`,
                        'rating'
                    );
                } catch (err) {
                    console.error('Failed to create notification for rating:', err);
                }
            });

            return res.status(201).json({
                ratingId: rating.id,
                createdAt: rating.created_at
            });
        } catch (dbErr: any) {
            // 23505 = unique_violation → duplicate rating
            if (dbErr.code === '23505') {
                return res.status(409).json({ error: 'Already rated this order' });
            }
            throw dbErr;
        }
    } catch (e: any) {
        console.error('POST /api/ratings error:', e);
        Sentry.captureException(e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
