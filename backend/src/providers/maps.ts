import { createMapProvider as createSorttMapProvider, type IMapProvider as IProviderMap } from '@sortt/maps';

export interface IMapProvider {
  geocode(addressText: string): Promise<{
    lat: number;
    lng: number;
    cityCode: string;
    locality: string;
    formattedAddress: string;
  }>;
}

class MapProviderAdapter implements IMapProvider {
  private provider: IProviderMap;

  constructor() {
    this.provider = createSorttMapProvider();
  }

  async geocode(addressText: string): Promise<{
    lat: number;
    lng: number;
    cityCode: string;
    locality: string;
    formattedAddress: string;
  }> {
    const result = await this.provider.geocode(addressText);
    return {
      lat: result.lat,
      lng: result.lng,
      cityCode: result.city_code.toUpperCase(),
      locality: result.locality,
      formattedAddress: result.display_address,
    };
  }
}

export function createMapProvider(): IMapProvider {
  return new MapProviderAdapter();
}

export const mapProvider: IMapProvider = createMapProvider();
