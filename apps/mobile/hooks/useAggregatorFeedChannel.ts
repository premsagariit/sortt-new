import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { getRealtimeClient } from '../lib/realtime';
import { useAggregatorStore } from '../store/aggregatorStore';
import type { MaterialCode } from '../components/ui/MaterialChip';

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
      channel.subscribe('new_order', (msg) => {
        const payload = msg.data as {
          orderId: string;
          locality: string;
          materialCodes: string[];
          createdAt: string;
        };

        useAggregatorStore.getState().prependFeedOrder({
          id: payload.orderId,
          orderNumber: `#${String(payload.orderId).slice(0, 8).toUpperCase()}`,
          locality: payload.locality,
          distanceKm: 0,
          materials: (payload.materialCodes ?? []) as MaterialCode[],
          estimatedKg: 0,
          postedMinutesAgo: 0,
          estimatedPrice: 0,
          estimatedWeights: {},
          sellerType: 'individual',
          rating: 0,
          window: 'Flexible',
          createdAt: payload.createdAt,
        });
      });

      // .catch(() => {}) suppresses "Connection closed" rejections on app background
      return () => {
        channel.unsubscribe();
        channel.detach().catch(() => {});
      };
    }, [])
  );
}
