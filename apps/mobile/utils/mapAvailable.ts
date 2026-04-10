import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

export type MapRenderAvailabilityReason =
  | 'web-unsupported'
  | 'disabled-by-config'
  | 'missing-ola-key'
  | 'expo-go'
  | 'missing-native-module';

export interface MapRenderAvailability {
  canRenderMap: boolean;
  reason: MapRenderAvailabilityReason | null;
  heading: string;
  body: string;
}

const isTruthyEnvValue = (value: string | undefined): boolean => {
  if (value == null) return true;

  const normalized = value.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'no' && normalized !== 'off';
};

const hasMapLibreNativeModule = (): boolean => {
  try {
    return !!NativeModules.MLRNModule;
  } catch {
    return false;
  }
};

const hasOlaTileKey = (): boolean => Boolean(process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY?.trim());

const isExpoGo = (): boolean => Constants.appOwnership === 'expo';

export function getMapRenderAvailability(): MapRenderAvailability {
  if (process.env.EXPO_OS === 'web') {
    return {
      canRenderMap: false,
      reason: 'web-unsupported',
      heading: 'Map preview unavailable on web',
      body: 'Open the app in a native dev build to view Ola map tiles.',
    };
  }

  if (!isTruthyEnvValue(process.env.EXPO_PUBLIC_MAP_RENDERING_AVAILABLE)) {
    return {
      canRenderMap: false,
      reason: 'disabled-by-config',
      heading: 'Map rendering is disabled',
      body: 'Set EXPO_PUBLIC_MAP_RENDERING_AVAILABLE=true in the mobile env and rebuild the dev client.',
    };
  }

  if (!hasOlaTileKey()) {
    return {
      canRenderMap: false,
      reason: 'missing-ola-key',
      heading: 'Ola Maps key is missing',
      body: 'Add EXPO_PUBLIC_OLA_MAPS_API_KEY to apps/mobile/.env and rebuild or restart Metro.',
    };
  }

  if (!hasMapLibreNativeModule()) {
    return {
      canRenderMap: false,
      reason: isExpoGo() ? 'expo-go' : 'missing-native-module',
      heading: isExpoGo() ? 'Native maps are unavailable in Expo Go' : 'MapLibre native module is missing',
      body: isExpoGo()
        ? 'Use a development build or production build to render Ola vector tiles.'
        : 'Rebuild the development client so the MapLibre native module is linked.',
    };
  }

  return {
    canRenderMap: true,
    reason: null,
    heading: '',
    body: '',
  };
}

export const MAP_RENDERING_AVAILABLE = getMapRenderAvailability().canRenderMap;
