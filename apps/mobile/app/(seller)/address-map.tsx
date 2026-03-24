import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Crosshair, MapPin, NavigationArrow } from 'phosphor-react-native';

import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { colors, radius, spacing } from '../../constants/tokens';
import { api } from '../../lib/api';
import { useAddressStore } from '../../store/addressStore';
import { MAP_RENDERING_AVAILABLE } from '../../utils/mapAvailable';
import { getMapLibreModule } from '../../lib/maplibre';
import { OLA_TILE_STYLE_URL } from '../../lib/olaMaps';

type Coordinate = { latitude: number; longitude: number };

export default function AddressMapScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const addressId = typeof params.id === 'string' ? params.id : undefined;
  const isEditMode = Boolean(addressId);

  const addresses = useAddressStore((state) => state.addresses);
  const draft = useAddressStore((state) => state.draft);
  const fetchAddresses = useAddressStore((state) => state.fetchAddresses);
  const setDraft = useAddressStore((state) => state.setDraft);
  const hydrateDraftFromAddress = useAddressStore((state) => state.hydrateDraftFromAddress);

  const [coordinates, setCoordinates] = React.useState<Coordinate | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = React.useState(false);
  const [isResolvingMap, setIsResolvingMap] = React.useState(false);
  const [isLocatingCurrentPosition, setIsLocatingCurrentPosition] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const mapLibre = React.useMemo(() => (MAP_RENDERING_AVAILABLE ? getMapLibreModule() : null), []);
  const canRenderMap = Boolean(MAP_RENDERING_AVAILABLE && mapLibre && OLA_TILE_STYLE_URL);

  useFocusEffect(
    React.useCallback(() => {
      void fetchAddresses();
    }, [fetchAddresses])
  );

  React.useEffect(() => {
    if (coordinates) return;

    const lat = draft?.latitude;
    const lng = draft?.longitude;

    if (lat != null && lng != null) {
      setCoordinates({ latitude: Number(lat), longitude: Number(lng) });
    }
  }, [coordinates, draft?.latitude, draft?.longitude]);

  React.useEffect(() => {
    if (!isEditMode || !addressId) return;
    if (draft) return;

    const existing = addresses.find((item) => item.id === addressId);
    if (existing) {
      hydrateDraftFromAddress(existing);
      if (existing.latitude != null && existing.longitude != null) {
        setCoordinates({ latitude: Number(existing.latitude), longitude: Number(existing.longitude) });
      }
    }
  }, [addressId, addresses, draft, hydrateDraftFromAddress, isEditMode]);

  const resolveAddressFromCoordinates = React.useCallback(
    async (latitude: number, longitude: number) => {
      setCoordinates({ latitude, longitude });
      setError(null);

      setIsResolvingMap(true);
      try {
        const reverseRes = await api.get('/api/maps/reverse', {
          params: { lat: latitude, lng: longitude },
        });

        const displayAddress = String(reverseRes.data?.display_address || '').trim();
        const resolvedLocality = String(reverseRes.data?.locality || '').trim();
        const resolvedCity = String(reverseRes.data?.city || '').trim();
        const resolvedPincode = String(reverseRes.data?.pincode || '').trim();
        const resolvedCityCode = reverseRes.data?.city_code != null ? String(reverseRes.data.city_code).trim() : '';

        const base = draft || {
          label: 'Home',
          building_name: '',
          street: '',
          colony: '',
          city: '',
          pincode: '',
          city_code: null,
          pickup_locality: '',
          latitude: null,
          longitude: null,
        };

        setDraft({
          ...base,
          street: displayAddress || base.street,
          city: resolvedCity || base.city,
          pincode: resolvedPincode || base.pincode,
          city_code: resolvedCityCode || base.city_code,
          pickup_locality: resolvedLocality || base.pickup_locality,
          latitude,
          longitude,
        });
      } catch {
        try {
          const fallbackResults = await Location.reverseGeocodeAsync({ latitude, longitude });
          const fallback = fallbackResults[0];

          if (fallback) {
            const fallbackStreet = [fallback.name, fallback.street].filter(Boolean).join(', ');
            const fallbackCity = String(fallback.city || fallback.subregion || '').trim();
            const fallbackPincode = String(fallback.postalCode || '').trim();
            const fallbackLocality = String(fallback.district || fallback.subregion || fallbackCity).trim();

            const base = draft || {
              label: 'Home',
              building_name: '',
              street: '',
              colony: '',
              city: '',
              pincode: '',
              city_code: null,
              pickup_locality: '',
              latitude: null,
              longitude: null,
            };

            setDraft({
              ...base,
              street: fallbackStreet || base.street,
              city: fallbackCity || base.city,
              pincode: fallbackPincode || base.pincode,
              city_code: fallbackCity.toLowerCase().includes('hyderabad') ? 'HYD' : base.city_code,
              pickup_locality: fallbackLocality || base.pickup_locality,
              latitude,
              longitude,
            });

            setError(null);
            return;
          }
        } catch {
        }

        const base = draft || {
          label: 'Home',
          building_name: '',
          street: '',
          colony: '',
          city: '',
          pincode: '',
          city_code: null,
          pickup_locality: '',
          latitude: null,
          longitude: null,
        };

        setDraft({ ...base, latitude, longitude });
        setError('Unable to resolve address from map pin. Continue and fill details manually.');
      } finally {
        setIsResolvingMap(false);
      }
    },
    [draft, setDraft]
  );

  const detectCurrentLocation = React.useCallback(async () => {
    setIsLocatingCurrentPosition(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationPermissionDenied(true);
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = current.coords.latitude;
      const longitude = current.coords.longitude;

      await resolveAddressFromCoordinates(latitude, longitude);
      setLocationPermissionDenied(false);
    } catch {
      setError('Unable to detect current location. Move the pin manually.');
    } finally {
      setIsLocatingCurrentPosition(false);
    }
  }, [resolveAddressFromCoordinates]);

  React.useEffect(() => {
    if (isEditMode) return;
    if (coordinates) return;
    void detectCurrentLocation();
  }, [coordinates, detectCurrentLocation, isEditMode]);

  const onMapPress = async (event: any) => {
    const coordinatesArray = event?.geometry?.coordinates;
    if (!Array.isArray(coordinatesArray) || coordinatesArray.length < 2) return;

    const [longitude, latitude] = coordinatesArray;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    await resolveAddressFromCoordinates(latitude, longitude);
  };

  const searchAddress = React.useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setError('Enter an address to search.');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await api.get('/api/maps/geocode', { params: { address: query } });
      const lat = Number(response.data?.lat);
      const lng = Number(response.data?.lng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        await resolveAddressFromCoordinates(lat, lng);
      } else {
        const fallbackResults = await Location.geocodeAsync(query);
        if (!Array.isArray(fallbackResults) || fallbackResults.length === 0) {
          throw new Error('Address not found');
        }
        await resolveAddressFromCoordinates(fallbackResults[0].latitude, fallbackResults[0].longitude);
      }
    } catch {
      setError('Unable to resolve this address. Try a more specific search.');
    } finally {
      setIsSearching(false);
    }
  }, [resolveAddressFromCoordinates, searchQuery]);

  const continueToDetails = () => {
    if (!coordinates) {
      setError('Please pin your pickup location on the map to continue.');
      return;
    }

    if (addressId) {
      router.replace({ pathname: '/(seller)/address-form', params: { id: addressId } } as any);
      return;
    }

    router.replace('/(seller)/address-form' as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NavBar title={isEditMode ? 'Edit Address Location' : 'Pick Address Location'} onBack={() => router.back()} />

      <View style={styles.content}>
        <View style={styles.topInfoCard}>
          <Text variant="label" color={colors.navy}>Pin your exact pickup point</Text>
          <Text variant="caption" color={colors.slate}>
            {coordinates ? 'Drag by tapping where your entrance is.' : 'We detect your current location first, then you can adjust.'}
          </Text>
        </View>

        <View style={styles.mapWrap}>
          {canRenderMap && mapLibre ? (
            <>
              <mapLibre.MapView
                style={styles.map}
                mapStyle={OLA_TILE_STYLE_URL}
                onPress={(event: any) => void onMapPress(event)}
              >
                <mapLibre.Camera
                  centerCoordinate={coordinates ? [coordinates.longitude, coordinates.latitude] : [78.4867, 17.385]}
                  zoomLevel={coordinates ? 15 : 11}
                />
                {coordinates ? (
                  <mapLibre.PointAnnotation
                    id="seller-address-pin"
                    coordinate={[coordinates.longitude, coordinates.latitude]}
                  >
                    <View style={styles.pointPin} />
                  </mapLibre.PointAnnotation>
                ) : null}
              </mapLibre.MapView>

              <View style={styles.pinHint}>
                <NavigationArrow size={14} color={colors.slate} />
                <Text variant="caption" color={colors.slate}>Tap map to move pin</Text>
              </View>
            </>
          ) : (
            <View style={styles.mapUnavailableCard}>
              <MapPin size={18} color={colors.muted} />
              <Text variant="caption" color={colors.muted}>Map preview unavailable in Expo Go</Text>
              <Input
                label="Search address"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="e.g. Banjara Hills, Hyderabad"
              />
              <SecondaryButton
                label={isSearching ? 'Searching...' : 'Search & Pin'}
                onPress={() => void searchAddress()}
                disabled={isSearching || isResolvingMap || isLocatingCurrentPosition}
                style={{ width: '100%' }}
              />
              {/* TODO: MapLibre requires a dev build. In Expo Go, this renders the search-based geocode fallback. See address-form.tsx for pattern. */}
            </View>
          )}
        </View>

        <View style={styles.bottomPanel}>
          {isResolvingMap || isLocatingCurrentPosition ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.navy} size="small" />
              <Text variant="caption" color={colors.slate}>
                {isLocatingCurrentPosition ? 'Getting current location...' : 'Resolving address details...'}
              </Text>
            </View>
          ) : null}

          {locationPermissionDenied ? (
            <Text variant="caption" color={colors.red}>
              Location access denied. You can still set pin manually.
            </Text>
          ) : null}

          {draft?.pickup_locality ? (
            <View style={styles.metaRow}>
              <MapPin size={14} color={colors.teal} weight="fill" />
              <Text variant="caption" color={colors.slate}>Locality: {draft.pickup_locality}</Text>
            </View>
          ) : null}

          {error ? <Text variant="caption" color={colors.red}>{error}</Text> : null}

          <View style={styles.actionRow}>
            <SecondaryButton
              label="Use Current"
              icon={<Crosshair size={14} color={colors.navy} />}
              onPress={() => void detectCurrentLocation()}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Continue"
              onPress={continueToDetails}
              style={{ flex: 1 }}
              disabled={isResolvingMap || isLocatingCurrentPosition}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  topInfoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 2,
  },
  mapWrap: {
    flex: 1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapUnavailableCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pointPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  pinHint: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bottomPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});