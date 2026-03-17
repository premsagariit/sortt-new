import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getMobileRealtimeProvider } from '../lib/realtime';
import { useOrderStore } from '../store/orderStore';

/**
 * useOrderChannel — Subscribe to order status updates on focus
 * Handles channel lifecycle with focus/blur events
 * Updates order store on 'status_updated' events
 */
export function useOrderChannel(orderId: string | null | undefined) {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const fetchOrder = useOrderStore((s) => s.fetchOrder);

  const subscribe = useCallback(async () => {
    if (!orderId) return;

    try {
      const provider = getMobileRealtimeProvider();
      
      // Subscribe to order channel status updates
      const unsubscribe = provider.subscribe(
        `${orderId}:order`,  // channel name (will be prefixed with HMAC by provider)
        'status_updated',     // event name
        (payload: any) => {
          // Re-fetch order to get updated DTO with fresh status
          fetchOrder(orderId, false);
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error('[useOrderChannel] Subscribe error:', err);
    }
  }, [orderId, fetchOrder]);

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
