import { Router } from 'express';
import { createMapProvider } from '@sortt/maps';

const router = Router();

const mapProvider = createMapProvider();

type MapAutocompleteProvider = {
  autocomplete?: (input: string) => Promise<Array<{ description: string; place_id: string }>>;
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

const inferCityName = (cityCode: string | null, displayAddress: string): string | null => {
  if (cityCode === 'HYD') return 'Hyderabad';
  const segments = displayAddress.split(',').map((segment) => segment.trim()).filter(Boolean);
  if (segments.length >= 2) return segments[segments.length - 2];
  return null;
};

const inferLocalityName = (displayAddress: string): string | null => {
  const segments = displayAddress.split(',').map((segment) => segment.trim()).filter(Boolean);
  if (segments.length >= 1) return segments[0];
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
        city_code: geo?.city_code ?? null,
        locality: geo?.locality ?? inferLocalityName(displayAddress),
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
      city_code: geo?.city_code ?? null,
      locality: geo?.locality ?? inferLocalityName(displayAddress),
      city: inferCityName(geo?.city_code ?? null, displayAddress),
      pincode: parsePincode(displayAddress),
    });
  } catch {
    return res.status(422).json({ error: 'reverse_geocode_failed' });
  }
});

router.get('/autocomplete', async (req, res) => {
  const input = String(req.query.input ?? '').trim();
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
    return res.json({ predictions });
  } catch {
    return res.status(422).json({ error: 'autocomplete_failed' });
  }
});

export default router;