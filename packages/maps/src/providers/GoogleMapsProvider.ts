import { GeoResult, IMapProvider } from '../types';

type GoogleAddressComponent = {
  long_name?: string;
  short_name?: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address: string;
  address_components: GoogleAddressComponent[];
};

type GoogleGeocodeResponse = {
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
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  async geocode(address: string): Promise<GeoResult> {
    try {
      // V19: SSRF Prevention — use official Google API endpoint only
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address', address);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('region', 'in'); // Bias results to India

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Google Maps API returned ${response.status}`);
      }

      const data = (await response.json()) as GoogleGeocodeResponse;

      if (data.results.length === 0) {
        throw new Error(`No results found for address: ${address}`);
      }

      const result = data.results[0];

      // Extract city code from administrative_area_level_1 (state)
      const stateComponent = result.address_components.find(
        (c: any) => c.types.includes('administrative_area_level_1')
      );
      let city_code = 'unknown';
      if (stateComponent) {
        const stateName = stateComponent.short_name?.toLowerCase() || 'unknown';
        // Map state short names to city codes (simplified)
        const stateMap: Record<string, string> = {
          ts: 'hyd', // Telangana → Hyderabad
          ka: 'blr', // Karnataka → Bangalore
          mh: 'mum', // Maharashtra → Mumbai
          tn: 'chn', // Tamil Nadu → Chennai
          dl: 'del', // Delhi
          ap: 'viz', // Andhra Pradesh → Visakhapatnam
        };
        city_code = stateMap[stateName] || stateName;
      }

      // Extract locality from locality or sublocality
      const localityComponent =
        result.address_components.find((c: any) => c.types.includes('locality')) ||
        result.address_components.find((c: any) => c.types.includes('sublocality'));
      const locality = localityComponent?.long_name || 'Unknown';

      return {
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
