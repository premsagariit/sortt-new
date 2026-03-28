import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { getRealtimeClient } from '../lib/realtime';
import { useAggregatorStore } from '../store/aggregatorStore';

/**
 * Subscribe to public aggregator feed channel.
 * Receives new order events and prepends to feed store.
 */
export function useAggregatorFeedChannel() {
  useFocusEffect(
    useCallback(() => {
      const ably = getRealtimeClient();

      // Public city feed channel (no HMAC suffix required)
      const channel = ably.channels.get('orders:hyd:new');
      channel.subscribe('new_order', () => {
        // Canonical filtering (area + all-material match) is server-side in /api/orders/feed.
        // Refresh from API instead of blindly prepending raw city events.
        void useAggregatorStore.getState().fetchFeed(true);
      });

      // .catch(() => {}) suppresses "Connection closed" rejections on app background
      return () => {
        try {
          channel.unsubscribe();
        } catch {
          // No-op: channel may already be disposed during fast navigation transitions.
        }

        try {
          const detachResult = channel.detach();
          if (detachResult && typeof (detachResult as Promise<void>).catch === 'function') {
            (detachResult as Promise<void>).catch(() => {});
          }
        } catch {
          // No-op: detach can throw synchronously when channel is already detached.
        }
      };
    }, [])
  );
}
