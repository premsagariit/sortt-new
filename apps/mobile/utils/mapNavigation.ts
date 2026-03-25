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

type NavigationCandidate = {
  label: string;
  url: string;
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

async function getAvailableCandidates(candidates: NavigationCandidate[]): Promise<NavigationCandidate[]> {
  const available: NavigationCandidate[] = [];

  for (const candidate of candidates) {
    try {
      const canOpen = await Linking.canOpenURL(candidate.url);
      if (canOpen) {
        available.push(candidate);
      }
    } catch {
    }
  }

  return available;
}

export async function openExternalDirections(input: OpenExternalDirectionsInput): Promise<void> {
  const available = await getAvailableCandidates([
    { label: 'Google Maps', url: buildGoogleDirectionsUrl(input) },
    { label: 'MapmyIndia', url: buildMapMyIndiaDirectionsUrl(input) },
    { label: 'Ola Maps', url: buildOlaDirectionsUrl(input) },
    { label: 'Other maps app', url: buildGeoDirectionsUrl(input) },
  ]);

  if (available.length === 0) {
    Alert.alert(
      input.errorTitle || 'Unable to open maps',
      input.errorBody || 'No compatible maps app was found on this device.'
    );
    return;
  }

  if (available.length === 1) {
    await Linking.openURL(available[0].url);
    return;
  }

  Alert.alert(
    'Open route with',
    'Choose a maps app for navigation.',
    [
      ...available.map((candidate) => ({
        text: candidate.label,
        onPress: () => {
          void Linking.openURL(candidate.url);
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]
  );
}
