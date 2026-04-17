import { Alert, Linking, Platform } from 'react-native';

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

const buildAndroidGeoUrl = ({ destination }: OpenExternalDirectionsInput): string =>
  `geo:${destination.latitude},${destination.longitude}?q=${destination.latitude},${destination.longitude}`;

const buildAppleMapsUrl = ({ destination, origin }: OpenExternalDirectionsInput): string => {
  const params = new URLSearchParams();
  params.set('daddr', `${destination.latitude},${destination.longitude}`);
  params.set('dirflg', 'd');
  if (origin) {
    params.set('saddr', `${origin.latitude},${origin.longitude}`);
  }
  return `maps://?${params.toString()}`;
};

export async function openExternalDirections(input: OpenExternalDirectionsInput): Promise<void> {
  // Native app deep links first (no website redirect).
  const targets = Platform.select<string[]>({
    android: [
      buildAndroidGeoUrl(input),
    ],
    ios: [buildAppleMapsUrl(input)],
    default: [buildAndroidGeoUrl(input)],
  }) ?? [buildAndroidGeoUrl(input)];

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
