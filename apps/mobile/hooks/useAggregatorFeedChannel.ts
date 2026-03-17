import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getMobileRealtimeProvider } from '../lib/realtime';
import { useAggregatorStore } from '../store/aggregatorStore';

/**
 * useAggregatorFeedChannel — Subscribe to new orders on focus
 * Listens to order feed channel for new_order events
 * Refreshes aggregator order list when new orders arrive
 */
export function useAggregatorFeedChannel() {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const fetchAggregatorOrders = useAggregatorStore((s) => s.fetchAggregatorOrders);

  const subscribe = useCallback(async () => {
    try {
      const provider = getMobileRealtimeProvider();
      
      // Subscribe to order feed channel for new orders
      const unsubscribe = provider.subscribe(
        'orders:hyd:new',      // feed channel (global, not per-user)
        'new_order',            // event name
        (payload: any) => {
          // Refresh aggregator feed to pick up new order
          fetchAggregatorOrders(false);
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error('[useAggregatorFeedChannel] Subscribe error:', err);
    }
  }, [fetchAggregatorOrders]);

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Subscribe on focus, unsubscribe on blur
  useFocusEffect(
    useCallback(() => {
      subscribe();
      
      return () => {
        unsubscribe();
      };
    }, [subscribe, unsubscribe])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);
}
