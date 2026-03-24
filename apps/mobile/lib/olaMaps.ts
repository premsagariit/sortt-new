const olaMapsApiKey = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY;

export const OLA_TILE_STYLE_URL = olaMapsApiKey
  ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${encodeURIComponent(olaMapsApiKey)}`
  : '';
