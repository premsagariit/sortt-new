import type { IMapProvider } from './types';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { OlaMapsProvider } from './providers/OlaMapsProvider';

export { IMapProvider, GeoResult } from './types';
export { GoogleMapsProvider } from './providers/GoogleMapsProvider';
export { OlaMapsProvider } from './providers/OlaMapsProvider';

/**
 * Factory function to create map provider based on environment variable.
 */
export function createMapProvider(): IMapProvider {
  const provider = process.env.MAP_PROVIDER || process.env.EXPO_PUBLIC_MAP_PROVIDER || 'ola';

  if (provider === 'google') {
    return new GoogleMapsProvider();
  }

  if (provider === 'ola') {
    return new OlaMapsProvider(process.env.OLA_MAPS_API_KEY || process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY);
  }

  throw new Error(`Unknown map provider: ${provider}`);
}
