import axios from 'axios';
import { query } from '../lib/db';

export interface IMapProvider {
  geocode(addressText: string): Promise<{
    lat: number;
    lng: number;
    cityCode: string;
    locality: string;
    formattedAddress: string;
  }>;
}

const CITY_CODE_MAP: Record<string, string> = {
  'hyderabad': 'HYD',
};

// Shared: resolve city code from name via map lookup then DB
async function resolveCityCode(cityLookupName: string): Promise<string | undefined> {
  const cityCode = CITY_CODE_MAP[cityLookupName.toLowerCase()];
  if (cityCode) return cityCode;

  if (cityLookupName) {
    const dbResult = await query('SELECT code FROM cities WHERE name ILIKE $1 LIMIT 1', [cityLookupName]);
    if (dbResult.rows.length > 0) return dbResult.rows[0].code;
  }

  return undefined;
}

// Free fallback: OpenStreetMap Nominatim (no API key required)
// Tries the full address first, then progressively drops leading components
// (flat/building/road) until Nominatim finds a match at locality or city level.
async function geocodeWithNominatim(addressText: string) {
  const parts = addressText.split(',').map(p => p.trim()).filter(Boolean);

  // Build candidates: full → drop 1 leading part → drop 2 → ... (min 2 parts)
  const candidates: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    candidates.push(parts.slice(i).join(', '));
  }

  for (const candidate of candidates) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: candidate, format: 'json', addressdetails: 1, limit: 1, countrycodes: 'in' },
        headers: { 'User-Agent': 'Sortt/1.0 (geocode-fallback)' },
        timeout: 8000,
      });

      if (!response.data || response.data.length === 0) continue;

      const result = response.data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      const formattedAddress = result.display_name;
      const addr = result.address || {};

      const locality = addr.suburb || addr.neighbourhood || addr.city_district || addr.city || '';
      const cityLookupName = addr.city || addr.county || addr.state_district || '';

      const cityCode = await resolveCityCode(cityLookupName);
      if (!cityCode) throw new Error('unsupported_city');

      if (candidate !== addressText) {
        console.warn(`[MAPS] Nominatim matched on simplified address: "${candidate}"`);
      }
      return { lat, lng, cityCode, locality: locality || cityLookupName || 'Unknown Locality', formattedAddress };
    } catch (err: any) {
      if (err.message === 'unsupported_city') throw err;
      // network/parse error on this candidate — try the next
    }
  }

  throw new Error('geocode_failed');
}

export class GoogleMapsProvider implements IMapProvider {
  async geocode(addressText: string) {
    // --- Try Google Maps first if key is present ---
    if (process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: { address: addressText, key: process.env.GOOGLE_MAPS_API_KEY },
          timeout: 8000,
        });

        if (response.data.status === 'OK' && response.data.results?.length > 0) {
          const result = response.data.results[0];
          const lat = result.geometry.location.lat;
          const lng = result.geometry.location.lng;
          const formattedAddress = result.formatted_address;

          let locality = '';
          let cityLookupName = '';

          for (const component of result.address_components) {
            if (component.types.includes('sublocality_level_1') || component.types.includes('neighborhood')) {
              if (!locality) locality = component.long_name;
            }
            if (component.types.includes('administrative_area_level_2')) {
              if (!cityLookupName) cityLookupName = component.long_name;
            }
            if (component.types.includes('locality')) {
              if (!cityLookupName) cityLookupName = component.long_name;
              if (!locality) locality = component.long_name;
            }
          }

          const cityCode = await resolveCityCode(cityLookupName);
          if (!cityCode) throw new Error('unsupported_city');

          return { lat, lng, cityCode, locality: locality || cityLookupName || 'Unknown Locality', formattedAddress };
        }

        console.warn('[MAPS] Google geocode non-OK status:', response.data.status, response.data.error_message, '— trying Nominatim fallback');
      } catch (err: any) {
        if (err.message === 'unsupported_city') throw err;
        console.warn('[MAPS] Google geocode error:', err.message, '— trying Nominatim fallback');
      }
    } else {
      console.warn('[MAPS] GOOGLE_MAPS_API_KEY not set — using Nominatim fallback');
    }

    // --- Fallback: OpenStreetMap Nominatim ---
    return geocodeWithNominatim(addressText);
  }
}

export const mapProvider = new GoogleMapsProvider();
