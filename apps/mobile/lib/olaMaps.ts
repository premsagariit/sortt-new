const olaMapsApiKey = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY;

export const OLA_TILE_STYLE_URL = olaMapsApiKey
  ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${encodeURIComponent(olaMapsApiKey)}`
  : '';

export type AuthenticatedMapStyle = Record<string, unknown>;

const styleCache = new Map<string, AuthenticatedMapStyle | null>();
const inFlightStyleRequests = new Map<string, Promise<AuthenticatedMapStyle | null>>();

function addApiKeyToUrl(rawUrl: string, apiKey: string, baseUrl?: string): string {
  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) return rawUrl;

  try {
    const resolved = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
    resolved.searchParams.set('api_key', apiKey);
    // Preserve tile template placeholders like {z}/{x}/{y} for MapLibre.
    return resolved
      .toString()
      .replace(/%7B/gi, '{')
      .replace(/%7D/gi, '}');
  } catch {
    return rawUrl;
  }
}

async function expandSourceTileJson(
  source: Record<string, unknown>,
  apiKey: string,
  styleUrl: string
): Promise<void> {
  if (typeof source.url !== 'string') return;

  const sourceUrl = addApiKeyToUrl(source.url, apiKey, styleUrl);
  source.url = sourceUrl;

  try {
    const tileJsonRes = await fetch(sourceUrl);
    if (!tileJsonRes.ok) return;

    const tileJson = await tileJsonRes.json();
    if (!Array.isArray(tileJson?.tiles) || tileJson.tiles.length === 0) return;

    source.tiles = tileJson.tiles.map((tileUrl: unknown) =>
      typeof tileUrl === 'string' ? addApiKeyToUrl(tileUrl, apiKey, sourceUrl) : tileUrl
    );
    delete source.url;

    if (typeof tileJson.minzoom === 'number') source.minzoom = tileJson.minzoom;
    if (typeof tileJson.maxzoom === 'number') source.maxzoom = tileJson.maxzoom;
    if (typeof tileJson.attribution === 'string') source.attribution = tileJson.attribution;
  } catch {
  }
}

async function transformOlaStyleWithAuth(
  style: Record<string, unknown>,
  apiKey: string,
  styleUrl: string
): Promise<Record<string, unknown> | null> {
  const next = JSON.parse(JSON.stringify(style || {})) as Record<string, unknown>;

  if (typeof next.sprite === 'string') {
    next.sprite = addApiKeyToUrl(next.sprite, apiKey, styleUrl);
  }

  if (typeof next.glyphs === 'string') {
    next.glyphs = addApiKeyToUrl(next.glyphs, apiKey, styleUrl);
  }

  if (next.sources && typeof next.sources === 'object') {
    for (const source of Object.values(next.sources) as Record<string, unknown>[]) {
      if (!source || typeof source !== 'object') continue;

      if (typeof source.url === 'string') {
        await expandSourceTileJson(source, apiKey, styleUrl);
      }

      if (Array.isArray(source.tiles)) {
        source.tiles = source.tiles.map((tileUrl: unknown) =>
          typeof tileUrl === 'string' ? addApiKeyToUrl(tileUrl, apiKey, styleUrl) : tileUrl
        );
      }
    }
  }

  const isValidStyle =
    next.version != null &&
    typeof next.sources === 'object' &&
    Array.isArray(next.layers) &&
    next.layers.length > 0;

  return isValidStyle ? next : null;
}

export async function getAuthenticatedMapStyle(styleUrl: string = OLA_TILE_STYLE_URL): Promise<AuthenticatedMapStyle | null> {
  if (!olaMapsApiKey || !styleUrl) return null;

  if (styleCache.has(styleUrl)) {
    return styleCache.get(styleUrl) ?? null;
  }

  const existingPromise = inFlightStyleRequests.get(styleUrl);
  if (existingPromise) return existingPromise;

  const request = (async () => {
    try {
      const response = await fetch(styleUrl);
      if (!response.ok) {
        throw new Error(`failed to fetch map style (${response.status})`);
      }

      const styleJson = await response.json() as Record<string, unknown>;
      const transformed = await transformOlaStyleWithAuth(styleJson, olaMapsApiKey, styleUrl);
      styleCache.set(styleUrl, transformed);
      return transformed;
    } catch (error) {
      console.warn('[olaMaps] Unable to build authenticated map style', error);
      styleCache.set(styleUrl, null);
      return null;
    } finally {
      inFlightStyleRequests.delete(styleUrl);
    }
  })();

  inFlightStyleRequests.set(styleUrl, request);
  return request;
}
