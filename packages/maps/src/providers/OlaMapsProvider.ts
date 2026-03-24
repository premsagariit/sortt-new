import { GeoResult, IMapProvider } from '../types';

/**
 * Ola Maps stub implementation.
 * Placeholder for Indian mapping service swap.
 * All methods throw NotImplementedError in Day 14.
 */
export class OlaMapsProvider implements IMapProvider {
  async geocode(_address: string): Promise<GeoResult> {
    throw new NotImplementedError('OlaMapsProvider.geocode() not yet implemented');
  }

  async reverseGeocode(_lat: number, _lng: number): Promise<string> {
    throw new NotImplementedError('OlaMapsProvider.reverseGeocode() not yet implemented');
  }
}

/**
 * Custom error for unimplemented methods.
 */
class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}
