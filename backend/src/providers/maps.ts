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

export class GoogleMapsProvider implements IMapProvider {
  async geocode(addressText: string) {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY missing');
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: addressText,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      console.error('[DIAG] Geocode API Error:', response.data.status, response.data.error_message);
      throw new Error('geocode_failed');
    }

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

    let cityCode = CITY_CODE_MAP[(cityLookupName || '').toLowerCase()];

    if (!cityCode && cityLookupName) {
      // Fallback to DB query
      const dbResult = await query('SELECT code FROM cities WHERE name ILIKE $1 LIMIT 1', [cityLookupName]);
      if (dbResult.rows.length > 0) {
        cityCode = dbResult.rows[0].code;
      }
    }

    if (!cityCode) {
      throw new Error('unsupported_city');
    }

    return {
      lat,
      lng,
      cityCode,
      locality: locality || cityLookupName || 'Unknown Locality',
      formattedAddress
    };
  }
}

export const mapProvider = new GoogleMapsProvider();
