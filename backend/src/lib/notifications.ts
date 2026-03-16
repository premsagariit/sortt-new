import { query } from './db';

export type NotificationType = 'order' | 'message' | 'payment' | 'rating' | 'review' | 'dispute';

export async function createNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType
) {
    try {
        await query(`
            INSERT INTO notifications (user_id, title, body, type)
            VALUES ($1, $2, $3, $4)
        `, [userId, title, body, type]);
    } catch (error) {
        console.error('FAILED to create notification:', error);
    }
}
