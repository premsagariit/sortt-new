/**
 * IMapProvider — Abstraction for geocoding services.
 * Two implementations: GoogleMapsProvider (default), OlaMapsProvider (stub for swap).
 */

export interface GeoResult {
  lat: number;
  lng: number;
  city_code: string;        // e.g., "hyd", "blr"
  locality: string;         // e.g., "Banjara Hills"
  display_address: string;  // e.g., "Banjara Hills, Hyderabad"
}

export interface IMapProvider {
  /**
   * Geocode an address to city code, locality, and display address.
   * Calls mapping API (Google by default).
   * Throws if address is invalid or API fails.
   */
  geocode(address: string): Promise<GeoResult>;

  /**
   * Reverse geocode coordinates to a display address.
   * Calls mapping API (Google by default).
   * Returns a human-readable address string.
   */
  reverseGeocode(lat: number, lng: number): Promise<string>;
}
