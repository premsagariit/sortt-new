import { GeoResult, IMapProvider } from '../types';

type GoogleAddressComponent = {
  long_name?: string;
  short_name?: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address: string;
  address_components: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

type GoogleGeocodeResponse = {
  status?: string;
  error_message?: string;
  results: GoogleGeocodeResult[];
};

/**
 * Google Maps implementation of IMapProvider.
 * Uses Google Geocoding API.
 * V19: SSRF prevention — always uses official Google API endpoint, no UDF-supplied URLs.
 */
export class GoogleMapsProvider implements IMapProvider {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY or EXPO_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  private async requestGeocode(address: string): Promise<GoogleGeocodeResponse> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('region', 'in');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Google Maps API returned ${response.status}`);
    }

    return (await response.json()) as GoogleGeocodeResponse;
  }

  async geocode(address: string): Promise<GeoResult> {
    try {
      let data = await this.requestGeocode(address);

      if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_DAILY_LIMIT') {
        throw new Error(`geocode_failed:${data.error_message || data.status}`);
      }

      if (!Array.isArray(data.results) || data.results.length === 0) {
        const hasHydContext = /hyderabad|telangana|india/i.test(address);
        if (!hasHydContext) {
          data = await this.requestGeocode(`${address}, Hyderabad, Telangana, India`);
        }
      }

      if (!Array.isArray(data.results) || data.results.length === 0) {
        throw new Error('geocode_failed');
      }

      const result = data.results[0];
      const location = result.geometry?.location;
      const lat = typeof location?.lat === 'number' ? location.lat : 0;
      const lng = typeof location?.lng === 'number' ? location.lng : 0;

      const cityComponent = result.address_components.find(
        (c: GoogleAddressComponent) =>
          c.types.includes('locality') || c.types.includes('administrative_area_level_2')
      );
      const cityText = (cityComponent?.long_name || cityComponent?.short_name || '').toLowerCase();
      const city_code = cityText.includes('hyderabad') || cityText.includes('secunderabad') ? 'HYD' : 'HYD';

      // Extract locality from locality or sublocality
      const localityComponent =
        result.address_components.find((c: GoogleAddressComponent) => c.types.includes('sublocality_level_1')) ||
        result.address_components.find((c: GoogleAddressComponent) => c.types.includes('sublocality')) ||
        result.address_components.find((c: GoogleAddressComponent) => c.types.includes('locality'));
      const locality = localityComponent?.long_name || 'Unknown';

      return {
        lat,
        lng,
        city_code,
        locality,
        display_address: result.formatted_address,
      };
    } catch (error) {
      console.error('GoogleMapsProvider.geocode() failed', { address, error });
      throw error;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      // V19: Validate coordinates are within India bounds (SSRF prevention)
      if (lat < 8 || lat > 37 || lng < 68 || lng > 97) {
        console.warn('Coordinates outside India bounds', { lat, lng });
        // Still proceed but log warning
      }

      // V19: SSRF Prevention — use official Google API endpoint only
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('latlng', `${lat},${lng}`);
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Google Maps API returned ${response.status}`);
      }

      const data = (await response.json()) as GoogleGeocodeResponse;

      if (data.results.length === 0) {
        return `${lat}, ${lng}`;
      }

      return data.results[0].formatted_address;
    } catch (error) {
      console.error('GoogleMapsProvider.reverseGeocode() failed', { lat, lng, error });
      throw error;
    }
  }
}
