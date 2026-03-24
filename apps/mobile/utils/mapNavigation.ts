import { Alert, Linking } from 'react-native';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type OpenExternalDirectionsInput = {
  destination: Coordinate;
  origin?: Coordinate;
  waypoints?: Coordinate[];
  errorTitle?: string;
  errorBody?: string;
};

const getMapProvider = (): 'ola' | 'google' => {
  const provider = String(process.env.EXPO_PUBLIC_MAP_PROVIDER || 'ola').toLowerCase();
  return provider === 'google' ? 'google' : 'ola';
};

const buildOlaDirectionsUrl = ({ destination, origin, waypoints = [] }: OpenExternalDirectionsInput): string => {
  const params = new URLSearchParams();
  params.set('destination', `${destination.latitude},${destination.longitude}`);
  params.set('travel_mode', 'driving');

  if (origin) {
    params.set('origin', `${origin.latitude},${origin.longitude}`);
  }

  if (waypoints.length > 0) {
    const value = waypoints.map((item) => `${item.latitude},${item.longitude}`).join('|');
    params.set('waypoints', value);
  }

  return `https://maps.olamaps.io/directions?${params.toString()}`;
};

const buildGoogleDirectionsUrl = ({ destination, origin, waypoints = [] }: OpenExternalDirectionsInput): string => {
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('destination', `${destination.latitude},${destination.longitude}`);
  params.set('travelmode', 'driving');

  if (origin) {
    params.set('origin', `${origin.latitude},${origin.longitude}`);
  }

  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map((item) => `${item.latitude},${item.longitude}`).join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export async function openExternalDirections(input: OpenExternalDirectionsInput): Promise<void> {
  const provider = getMapProvider();
  const primaryUrl = provider === 'ola' ? buildOlaDirectionsUrl(input) : buildGoogleDirectionsUrl(input);
  const fallbackGeoUrl = `geo:${input.destination.latitude},${input.destination.longitude}?q=${input.destination.latitude},${input.destination.longitude}`;

  if (await Linking.canOpenURL(primaryUrl)) {
    await Linking.openURL(primaryUrl);
    return;
  }

  if (await Linking.canOpenURL(fallbackGeoUrl)) {
    await Linking.openURL(fallbackGeoUrl);
    return;
  }

  Alert.alert(input.errorTitle || 'Unable to open maps', input.errorBody || 'No compatible maps app was found on this device.');
}
