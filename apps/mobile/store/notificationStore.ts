import { create } from 'zustand';
import { api } from '../lib/api';

export type NotificationItem = {
    id: string;
    title: string;
    body: string;
    type: 'order' | 'message' | 'payment' | 'rating' | 'review' | 'dispute';
    data?: {
        order_id?: string;
        order_display_id?: string;
        kind?: string;
        [key: string]: any;
    };
    is_read: boolean;
    created_at: string;
};

interface NotificationState {
    notifications: NotificationItem[];
    loading: boolean;
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    loading: false,
    unreadCount: 0,

    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/api/notifications');
            const notifications = response.data.notifications;
            set({
                notifications,
                unreadCount: notifications.filter((n: NotificationItem) => !n.is_read).length,
                loading: false
            });
        } catch (error) {
            console.error('Failed to fetch notifications', error);
            set({ loading: false });
        }
    },

    markAsRead: async (id: string) => {
        try {
            await api.patch(`/api/notifications/${id}/read`);
            const notifications = get().notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            );
            set({
                notifications,
                unreadCount: notifications.filter(n => !n.is_read).length
            });
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    },

    markAllRead: async () => {
        try {
            await api.post('/api/notifications/read-all');
            const notifications = get().notifications.map(n => ({ ...n, is_read: true }));
            set({
                notifications,
                unreadCount: 0
            });
        } catch (error) {
            console.error('Failed to mark all notifications as read', error);
        }
    },

    deleteNotification: async (id: string) => {
        try {
            await api.delete(`/api/notifications/${id}`);
            const notifications = get().notifications.filter(n => n.id !== id);
            set({
                notifications,
                unreadCount: notifications.filter(n => !n.is_read).length
            });
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    },
}));
