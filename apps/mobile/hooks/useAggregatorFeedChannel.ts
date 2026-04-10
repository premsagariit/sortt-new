import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { getRealtimeClient } from '../lib/realtime';
import { useAggregatorStore } from '../store/aggregatorStore';
import { useAuthStore } from '../store/authStore';

/**
 * Subscribe to public aggregator feed channel.
 * Receives new order events and prepends to feed store.
 */
export function useAggregatorFeedChannel() {
  const token = useAuthStore((s) => s.token);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return () => {};
      }

      const ably = getRealtimeClient();

      // Public city feed channel (no HMAC suffix required)
      const channel = ably.channels.get('orders:hyd:new');
      try {
        channel.subscribe('new_order', () => {
          // Canonical filtering (area + all-material match) is server-side in /api/orders/feed.
          // Refresh from API instead of blindly prepending raw city events.
          void useAggregatorStore.getState().fetchFeed(true);
        });
      } catch (error) {
        console.warn('[AggregatorFeedChannel] subscribe failed; using API refresh fallback', error);
        void useAggregatorStore.getState().fetchFeed(true);
      }

      // .catch(() => {}) suppresses "Connection closed" rejections on app background
      return () => {
        try {
          channel.unsubscribe();
        } catch {
          // No-op: channel may already be disposed during fast navigation transitions.
        }
      };
    }, [token])
  );
}
