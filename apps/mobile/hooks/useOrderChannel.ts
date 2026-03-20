import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';
import { getRealtimeClient } from '../lib/realtime';
import { useOrderStore } from '../store/orderStore';
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
      useOrderStore.getState().updateOrderStatus(orderId, msg.data.status);
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
        created_at?: string;
      };
      // Skip messages sent by self — already in store via optimistic update
      if (selfId && payload.sender_id === selfId) return;

      useChatStore.getState().appendMessage(orderId, {
        id: payload.id ?? String(Date.now()),
        orderId,
        senderId: payload.sender_id ?? 'unknown',
        body: payload.content ?? '',
        sentAt: payload.created_at ?? new Date().toISOString(),
        read: false,
        status: 'sent',
      });
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
