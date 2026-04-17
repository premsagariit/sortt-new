import { Router } from 'express';
import { createMapProvider } from '@sortt/maps';

const router = Router();

const mapProvider = createMapProvider();

type MapAutocompleteProvider = {
  autocomplete?: (input: string) => Promise<Array<{ description: string; place_id: string }>>;
};

const LANDMARK_KEYWORDS = [
  'road',
  'rd',
  'street',
  'st',
  'station',
  'hospital',
  'mall',
  'nagar',
  'colony',
  'building',
  'apartment',
  'centre',
  'center',
  'near',
  'opp',
  'opposite',
];

const normalizeAutocompleteText = (value: unknown): string => {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeCityCode = (value: unknown): string => {
  return String(value ?? '').trim().toUpperCase();
};

const CITY_CODE_ALIAS: Record<string, string[]> = {
  HYD: ['hyderabad', 'secunderabad'],
  BLR: ['bengaluru', 'bangalore'],
  BOM: ['mumbai', 'bombay'],
  MAA: ['chennai', 'madras'],
  DEL: ['delhi', 'new delhi'],
  CCU: ['kolkata', 'calcutta'],
  AMD: ['ahmedabad'],
  JAI: ['jaipur'],
  PNQ: ['pune'],
};

const splitAddressSegments = (value: string): string[] => {
  return String(value)
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const looksLikeLandmarkSegment = (value: string): boolean => {
  const normalized = normalizeAutocompleteText(value);
  if (!normalized) return false;
  if (/\d/.test(normalized)) return true;
  return LANDMARK_KEYWORDS.some((keyword) => normalized.split(' ').includes(keyword));
};

const extractLocalityFromDescription = (description: string): string => {
  const parts = splitAddressSegments(description);
  if (parts.length === 0) return '';

  const first = parts[0] ?? '';
  const second = parts[1] ?? '';

  if (second && looksLikeLandmarkSegment(first)) {
    return second;
  }

  return first;
};

const formatSuggestionLabel = (description: string, locality: string): string => {
  const parts = splitAddressSegments(description);
  if (parts.length === 0) return locality;

  const city = parts.length >= 2 ? parts[parts.length - 3] : '';
  const state = parts.length >= 2 ? parts[parts.length - 2] : '';
  const country = parts.length >= 1 ? parts[parts.length - 1] : '';

  const formatted = [locality, city, state, country].map((item) => String(item ?? '').trim()).filter(Boolean);
  return formatted.join(', ');
};

const COORDINATE_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

const parseCoordinateString = (text: string): { lat: number; lng: number } | null => {
  const match = text.match(COORDINATE_PATTERN);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

const parsePincode = (text: string): string | null => {
  const match = text.match(/\b\d{6}\b/);
  return match ? match[0] : null;
};

const CITY_CODE_BY_NAME: Record<string, string> = {
  hyderabad: 'HYD',
  bangalore: 'BLR',
  bengaluru: 'BLR',
  mumbai: 'MUM',
  delhi: 'DEL',
  'new delhi': 'DEL',
  pune: 'PUN',
  chennai: 'CHN',
  kolkata: 'KOL',
};

const inferCityCodeFromAddress = (displayAddress: string): string | null => {
  const segments = displayAddress.split(',').map((segment) => segment.trim().toLowerCase()).filter(Boolean);
  for (const segment of segments) {
    if (CITY_CODE_BY_NAME[segment]) return CITY_CODE_BY_NAME[segment];
  }
  return null;
};

const inferCityName = (cityCode: string | null, displayAddress: string): string | null => {
  if (cityCode === 'HYD') return 'Hyderabad';
  if (cityCode === 'BLR') return 'Bengaluru';
  if (cityCode === 'MUM') return 'Mumbai';
  if (cityCode === 'DEL') return 'Delhi';
  if (cityCode === 'PUN') return 'Pune';
  if (cityCode === 'CHN') return 'Chennai';
  if (cityCode === 'KOL') return 'Kolkata';
  const segments = displayAddress.split(',').map((segment) => segment.trim()).filter(Boolean);
  if (segments.length >= 2) return segments[segments.length - 2];
  return null;
};

router.get('/geocode', async (req, res) => {
  const address = String(req.query.address ?? '').trim();
  if (!address) return res.status(400).json({ error: 'address query param is required' });

  const parsedCoordinates = parseCoordinateString(address);
  if (parsedCoordinates) {
    try {
      const displayAddress = await mapProvider.reverseGeocode(parsedCoordinates.lat, parsedCoordinates.lng);
      let geo: Awaited<ReturnType<typeof mapProvider.geocode>> | null = null;
      try {
        geo = await mapProvider.geocode(displayAddress);
      } catch {
        geo = null;
      }

      return res.json({
        city_code: geo?.city_code ?? inferCityCodeFromAddress(displayAddress),
        locality: geo?.locality,
        display_address: displayAddress,
        lat: parsedCoordinates.lat,
        lng: parsedCoordinates.lng,
      });
    } catch {
      return res.status(422).json({ error: 'geocode_failed' });
    }
  }

  try {
    const result = await mapProvider.geocode(address);
    return res.json({
      city_code: result.city_code,
      locality: result.locality,
      display_address: result.display_address,
      lat: result.lat,
      lng: result.lng,
    });
  } catch {
    return res.status(422).json({ error: 'geocode_failed' });
  }
});

router.get('/reverse', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  try {
    const displayAddress = await mapProvider.reverseGeocode(lat, lng);
    let geo: Awaited<ReturnType<typeof mapProvider.geocode>> | null = null;
    try {
      geo = await mapProvider.geocode(displayAddress);
    } catch {
      geo = null;
    }

    return res.json({
      display_address: displayAddress,
      city_code: geo?.city_code ?? inferCityCodeFromAddress(displayAddress),
      locality: geo?.locality,
      city: inferCityName(geo?.city_code ?? inferCityCodeFromAddress(displayAddress), displayAddress),
      pincode: parsePincode(displayAddress),
    });
  } catch {
    return res.status(422).json({ error: 'reverse_geocode_failed' });
  }
});

router.get('/autocomplete', async (req, res) => {
  const input = String(req.query.input ?? '').trim();
  const cityCode = normalizeCityCode(req.query.city_code);
  if (!input) return res.status(400).json({ error: 'input query param is required' });

  const provider = process.env.MAP_PROVIDER || process.env.EXPO_PUBLIC_MAP_PROVIDER || 'ola';
  if (provider !== 'ola') {
    return res.json({ predictions: [] });
  }

  try {
    const olaProvider = mapProvider as unknown as MapAutocompleteProvider;
    if (typeof olaProvider.autocomplete !== 'function') {
      return res.json({ predictions: [] });
    }

    const predictions = await olaProvider.autocomplete(input);
    const cityAliases = CITY_CODE_ALIAS[cityCode] ?? [];

    const filtered = cityAliases.length > 0
      ? predictions.filter((item) => {
          const normalizedDesc = normalizeAutocompleteText(item.description);
          return cityAliases.some((alias) => normalizedDesc.includes(alias));
        })
      : predictions;

    const deduped: Array<{ description: string; place_id: string; locality: string }> = [];
    const seen = new Set<string>();
    for (const item of filtered) {
      const desc = String(item.description ?? '').trim();
      const placeId = String(item.place_id ?? '').trim();
      if (!desc || !placeId) continue;

      const locality = extractLocalityFromDescription(desc);
      if (!locality) continue;

      const normalizedLocality = normalizeAutocompleteText(locality);
      const label = formatSuggestionLabel(desc, locality);
      if (!label) continue;

      const key = `${normalizedLocality}::${normalizeAutocompleteText(label)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push({ description: label, place_id: placeId, locality: locality.trim() });
    }

    return res.json({ predictions: deduped });
  } catch {
    return res.status(422).json({ error: 'autocomplete_failed' });
  }
});

export default router;