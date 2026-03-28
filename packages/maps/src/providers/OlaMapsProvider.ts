import axios from 'axios';
import type { GeoResult, IMapProvider } from '../types';

const BASE_URL = 'https://api.olamaps.io';

type OlaAddressComponent = {
  long_name?: string;
  types?: string[];
};

type OlaPrediction = {
  description?: string;
  place_id?: string;
};

type OlaPredictionResult = {
  description: string;
  place_id: string;
};

export class OlaMapsProvider implements IMapProvider {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const resolvedApiKey = apiKey || process.env.OLA_MAPS_API_KEY || process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY;
    if (!resolvedApiKey) {
      throw new Error('OLA_MAPS_API_KEY or EXPO_PUBLIC_OLA_MAPS_API_KEY environment variable is required');
    }
    this.apiKey = resolvedApiKey;
  }

  private getAddressComponent(components: OlaAddressComponent[], type: string): string {
    const component = components.find((item) => Array.isArray(item.types) && item.types.includes(type));
    return component?.long_name ?? '';
  }

  /**
   * Resolves a human-readable city to a short city code.
   * Parses address_components first (most accurate), then falls back to the
   * formatted_address string, and finally defaults to 'HYD' for MVP safety.
   */
  private resolveCityCode(components: OlaAddressComponent[], formattedAddress: string): string {
    const CITY_CODE_MAP: Record<string, string> = {
      hyderabad: 'HYD',
      secunderabad: 'HYD',
      bangalore: 'BLR',
      bengaluru: 'BLR',
      mumbai: 'BOM',
      bombay: 'BOM',
      chennai: 'MAA',
      madras: 'MAA',
      delhi: 'DEL',
      'new delhi': 'DEL',
      pune: 'PNQ',
      kolkata: 'CCU',
      calcutta: 'CCU',
      ahmedabad: 'AMD',
      jaipur: 'JAI',
    };

    // Primary: parse from address_components (most accurate)
    const cityComponent =
      this.getAddressComponent(components, 'locality') ||
      this.getAddressComponent(components, 'administrative_area_level_2') ||
      this.getAddressComponent(components, 'administrative_area_level_1');

    const cityText = cityComponent.toLowerCase();
    for (const [key, code] of Object.entries(CITY_CODE_MAP)) {
      if (cityText.includes(key)) return code;
    }

    // Fallback: scan the formatted address string
    const addressLower = formattedAddress.toLowerCase();
    for (const [key, code] of Object.entries(CITY_CODE_MAP)) {
      if (addressLower.includes(key)) return code;
    }

    // Safe MVP default
    return 'HYD';
  }

  async geocode(address: string): Promise<GeoResult> {
    const response = await axios.get(`${BASE_URL}/places/v1/geocode`, {
      params: {
        address,
        api_key: this.apiKey,
      },
    });

    const result = response.data?.geocodingResults?.[0] ?? response.data?.results?.[0];
    if (!result) {
      throw new Error(`OlaMaps: no geocode result for "${address}"`);
    }

    const components: OlaAddressComponent[] = Array.isArray(result.address_components)
      ? result.address_components
      : [];

    const latitude = Number(result.geometry?.location?.lat ?? result.lat ?? result.latitude ?? 0);
    const longitude = Number(result.geometry?.location?.lng ?? result.lng ?? result.longitude ?? 0);

    return {
      lat: Number.isFinite(latitude) ? latitude : 0,
      lng: Number.isFinite(longitude) ? longitude : 0,
      city_code: this.resolveCityCode(components, String(result.formatted_address ?? address)),
      locality:
        this.getAddressComponent(components, 'sublocality_level_1') ||
        this.getAddressComponent(components, 'locality') ||
        this.getAddressComponent(components, 'sublocality') ||
        'Unknown',
      display_address: String(result.formatted_address ?? address),
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const response = await axios.get(`${BASE_URL}/places/v1/reverse-geocode`, {
      params: {
        latlng: `${lat},${lng}`,
        api_key: this.apiKey,
      },
    });

    const result = response.data?.results?.[0] ?? response.data?.geocodingResults?.[0];
    if (!result) {
      throw new Error(`OlaMaps: no reverse geocode result for ${lat},${lng}`);
    }

    return String(result.formatted_address ?? `${lat}, ${lng}`);
  }

  async autocomplete(input: string): Promise<OlaPredictionResult[]> {
    const response = await axios.get(`${BASE_URL}/places/v1/autocomplete`, {
      params: {
        input,
        api_key: this.apiKey,
      },
    });

    const predictions: OlaPrediction[] = Array.isArray(response.data?.predictions) ? response.data.predictions : [];
    return predictions
      .filter((item) => typeof item.description === 'string' && typeof item.place_id === 'string')
      .map((item) => ({
        description: item.description as string,
        place_id: item.place_id as string,
      }));
  }
}
