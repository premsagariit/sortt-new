import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected) && (state.isInternetReachable ?? true);
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  return { isOnline };
}
