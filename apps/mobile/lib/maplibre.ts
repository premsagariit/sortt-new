type MapLibreModule = typeof import('@maplibre/maplibre-react-native');

let cachedMapLibre: MapLibreModule | null | undefined;

export function getMapLibreModule(): MapLibreModule | null {
  if (cachedMapLibre !== undefined) {
    return cachedMapLibre;
  }

  try {
    cachedMapLibre = require('@maplibre/maplibre-react-native') as MapLibreModule;
    return cachedMapLibre;
  } catch {
    cachedMapLibre = null;
    return null;
  }
}
