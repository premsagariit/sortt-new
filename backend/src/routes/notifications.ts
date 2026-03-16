import { Router, Request, Response } from 'express';
import { query } from '../lib/db';
import * as Sentry from '@sentry/node';

const router = Router();

// GET /api/notifications — fetch notifications for the current user
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await query(`
            SELECT id, title, body, type, is_read, created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        res.json({
            notifications: result.rows.map(n => ({
                id: n.id,
                title: n.title,
                body: n.body,
                type: n.type,
                is_read: n.is_read,
                created_at: n.created_at
            }))
        });
    } catch (e: any) {
        console.error('GET /api/notifications error:', e);
        Sentry.captureException(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/notifications/:id/read — mark a specific notification as read
router.patch('/:id/read', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const result = await query(`
            UPDATE notifications
            SET is_read = true, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [id, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true });
    } catch (e: any) {
        console.error('PATCH /api/notifications/:id/read error:', e);
        Sentry.captureException(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/notifications/read-all — mark all notifications as read
router.post('/read-all', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        await query(`
            UPDATE notifications
            SET is_read = true, updated_at = NOW()
            WHERE user_id = $1 AND is_read = false
        `, [userId]);

        res.json({ success: true });
    } catch (e: any) {
        console.error('POST /api/notifications/read-all error:', e);
        Sentry.captureException(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/notifications/:id — delete a specific notification
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const result = await query(`
            DELETE FROM notifications
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [id, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true });
    } catch (e: any) {
        console.error('DELETE /api/notifications/:id error:', e);
        Sentry.captureException(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
