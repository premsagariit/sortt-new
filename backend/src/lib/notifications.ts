import { query } from './db';

export type NotificationType = 'order' | 'message' | 'payment' | 'rating' | 'review' | 'dispute';

export type NotificationData = {
    order_id?: string;
    order_display_id?: string;
    kind?: string;
    [key: string]: any;
};

export async function createNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: NotificationData
) {
    try {
        await query(`
            INSERT INTO notifications (user_id, title, body, type, data)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, title, body, type, data ?? {}]);
    } catch (error) {
        console.error('FAILED to create notification:', error);
    }
}
