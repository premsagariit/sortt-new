import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';
import { getRealtimeClient } from '../lib/realtime';
import { api } from '../lib/api';
import { useOrderStore } from '../store/orderStore';
import type { OrderStatus } from '../store/orderStore';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

/**
 * Subscribe to order status + chat channels for a specific order.
 *
 * IMPORTANT (V32):
 * - `orderChannelToken` and `chatChannelToken` are FULL channel names from backend
 * - Do NOT construct channel names on mobile
 * - Backend computes HMAC prefix via channelHelper.ts
 *
 * V38: Switched from useFocusEffect+useCallback to useIsFocused+useEffect so that
 * the subscription is established immediately whenever tokens arrive (dep change),
 * not just on the next focus event. This fixes the agg→seller live delivery gap.
 */
export function useOrderChannel(
  orderId: string,
  orderChannelToken: string | null,
  chatChannelToken: string | null
) {
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused || !orderId || !orderChannelToken || !chatChannelToken) {
      return;
    }

    const ably = getRealtimeClient();
    const selfId = useAuthStore.getState().userId;

    // Status channel — backend-provided full token (e.g. "<hmac>:order:<id>")
    const statusChannel = ably.channels.get(orderChannelToken);

    statusChannel.subscribe('status_updated', (msg) => {
      const payload = msg.data as { status?: string };
      const allowedStatuses: OrderStatus[] = [
        'created',
        'accepted',
        'en_route',
        'arrived',
        'weighing_in_progress',
        'completed',
        'cancelled',
        'disputed',
      ];

      if (payload.status && allowedStatuses.includes(payload.status as OrderStatus)) {
        useOrderStore.getState().updateOrderStatus(orderId, payload.status as OrderStatus);
      }
    });

    statusChannel.subscribe('location_updated', (msg) => {
      const payload = msg.data as {
        aggregator_lat?: number;
        aggregator_lng?: number;
        distance_km?: number;
      };

      if (typeof payload.aggregator_lat !== 'number' || typeof payload.aggregator_lng !== 'number') {
        return;
      }

      useOrderStore.getState().updateOrderLiveLocation(orderId, {
        aggregatorLat: payload.aggregator_lat,
        aggregatorLng: payload.aggregator_lng,
        liveDistanceKm: typeof payload.distance_km === 'number' ? payload.distance_km : null,
      });
    });

    // When the other party reads our messages, update local status to 'read'
    statusChannel.subscribe('messages_read', () => {
      if (selfId) {
        useChatStore.getState().markSentMessagesAsRead(orderId, selfId);
      }
    });

    // Chat channel — backend-provided full token (e.g. "<hmac>:chat:<id>")
    const chatChannel = ably.channels.get(chatChannelToken);

    chatChannel.subscribe('message', (msg) => {
      const payload = msg.data as {
        id?: string;
        sender_id?: string;
        content?: string;
        message_type?: 'text' | 'image';
        media_url?: string | null;
        created_at?: string;
      };
      // Skip messages sent by self — already in store via optimistic update
      if (selfId && payload.sender_id === selfId) return;

      useChatStore.getState().appendMessage(orderId, {
        id: payload.id ?? String(Date.now()),
        orderId,
        senderId: payload.sender_id ?? 'unknown',
        body: payload.content ?? '',
        messageType: payload.message_type === 'image' ? 'image' : 'text',
        mediaUrl: typeof payload.media_url === 'string' ? payload.media_url : null,
        sentAt: payload.created_at ?? new Date().toISOString(),
        read: false,
        status: 'sent',
      });

      // If this screen is focused, immediately ack fresh inbound messages as read.
      if (focused && selfId) {
        useChatStore.getState().markAllReceived(orderId, selfId);
        api.patch('/api/messages/read', { order_id: orderId }).catch(() => {});
      }
    });

    // Cleanup when screen blurs, unmounts, or deps change (tokens updated).
    // Only unsubscribe (remove listeners) — do NOT call detach().
    // detach() is async: if a message arrives while the channel is mid-detach,
    // Ably throws "Channel detached" as an unhandled promise rejection.
    // Leaving the channel attached is safe; it will be cleaned up when
    // disconnectRealtime() closes the whole connection on app background.
    return () => {
      statusChannel.unsubscribe();
      chatChannel.unsubscribe();
    };
  }, [focused, orderId, orderChannelToken, chatChannelToken]);
}
