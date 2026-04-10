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

const buildMapMyIndiaDirectionsUrl = ({ destination, origin }: OpenExternalDirectionsInput): string => {
  const params = new URLSearchParams();
  params.set('daddr', `${destination.latitude},${destination.longitude}`);

  if (origin) {
    params.set('saddr', `${origin.latitude},${origin.longitude}`);
  }

  return `https://maps.mapmyindia.com/directions?${params.toString()}`;
};

const buildGeoDirectionsUrl = ({ destination }: OpenExternalDirectionsInput): string => {
  return `geo:${destination.latitude},${destination.longitude}?q=${destination.latitude},${destination.longitude}`;
};

export async function openExternalDirections(input: OpenExternalDirectionsInput): Promise<void> {
  // Open one directions URL and let the OS route it to user-selected apps.
  // On Android this triggers the native chooser when no default app is set.
  const targets = [
    buildOlaDirectionsUrl(input),
    buildGoogleDirectionsUrl(input),
    buildMapMyIndiaDirectionsUrl(input),
    buildGeoDirectionsUrl(input),
  ];

  for (const url of targets) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) continue;
      await Linking.openURL(url);
      return;
    } catch {
    }
  }

  {
    Alert.alert(
      input.errorTitle || 'Unable to open maps',
      input.errorBody || 'No compatible maps app was found on this device.'
    );
  }
}
