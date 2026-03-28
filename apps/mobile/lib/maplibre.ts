import { NativeModules } from 'react-native';

type MapLibreModule = typeof import('@maplibre/maplibre-react-native');

let cachedMapLibre: MapLibreModule | null | undefined;

export function getMapLibreModule(): MapLibreModule | null {
  if (cachedMapLibre !== undefined) {
    return cachedMapLibre;
  }

  // Guard: if the native bridge module isn't registered (e.g. Expo Go),
  // don't even try to use components — they'll crash with
  // "Invariant Violation: View config not found for MLRNCamera"
  if (!NativeModules.MLRNModule) {
    cachedMapLibre = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@maplibre/maplibre-react-native') as MapLibreModule;
    // MapLibre requires setAccessToken(null) when using non-Mapbox tile
    // providers (like Ola Maps). Without this call the SDK crashes silently.
    if (typeof mod.setAccessToken === 'function') {
      mod.setAccessToken(null);
    } else if (mod.default && typeof (mod.default as any).setAccessToken === 'function') {
      (mod.default as any).setAccessToken(null);
    }
    cachedMapLibre = mod;
    return cachedMapLibre;
  } catch {
    cachedMapLibre = null;
    return null;
  }
}
