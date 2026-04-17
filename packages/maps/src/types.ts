/**
 * IMapProvider — Abstraction for geocoding services.
 * OlaMapsProvider is the active implementation.
 */

export interface GeoResult {
  lat: number;
  lng: number;
  city_code: string;        // e.g., "hyd", "blr"
  locality: string;         // e.g., "Banjara Hills"
  display_address: string;  // e.g., "Banjara Hills, Hyderabad"
}

export interface AutocompleteResult {
  description: string;
  place_id: string;
}

export interface IMapProvider {
  /**
   * Geocode an address to city code, locality, and display address.
    * Calls the configured mapping API provider.
   * Throws if address is invalid or API fails.
   */
  geocode(address: string): Promise<GeoResult>;

  /**
   * Reverse geocode coordinates to a display address.
    * Calls the configured mapping API provider.
   * Returns a human-readable address string.
   */
  reverseGeocode(lat: number, lng: number): Promise<string>;

  /**
   * Optional autocomplete suggestions for address/locality search.
   * Providers that do not support autocomplete may omit this method.
   */
  autocomplete?: (input: string) => Promise<AutocompleteResult[]>;
}
