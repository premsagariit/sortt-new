import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MapPin, PencilSimple } from 'phosphor-react-native';

import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { Input } from '../../components/ui/Input';
import { PrimaryButton } from '../../components/ui/Button';
import { colors, radius, spacing } from '../../constants/tokens';
import { useAddressStore } from '../../store/addressStore';
import { getMapRenderAvailability } from '../../utils/mapAvailable';
import { getMapLibreModule } from '../../lib/maplibre';
import { type AuthenticatedMapStyle, getAuthenticatedMapStyle, OLA_TILE_STYLE_URL } from '../../lib/olaMaps';

type Coordinate = { latitude: number; longitude: number };

export default function AddressFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const addressId = typeof params.id === 'string' ? params.id : undefined;
  const isEditMode = Boolean(addressId);

  const addresses = useAddressStore((state) => state.addresses);
  const draft = useAddressStore((state) => state.draft);
  const fetchAddresses = useAddressStore((state) => state.fetchAddresses);
  const createAddress = useAddressStore((state) => state.createAddress);
  const updateAddress = useAddressStore((state) => state.updateAddress);
  const setDraft = useAddressStore((state) => state.setDraft);
  const hydrateDraftFromAddress = useAddressStore((state) => state.hydrateDraftFromAddress);
  const clearDraft = useAddressStore((state) => state.clearDraft);

  const [label, setLabel] = React.useState('Home');
  const [buildingName, setBuildingName] = React.useState('');
  const [street, setStreet] = React.useState('');
  const [colony, setColony] = React.useState('');
  const [city, setCity] = React.useState('');
  const [pincode, setPincode] = React.useState('');
  const [pickupLocality, setPickupLocality] = React.useState('');
  const [cityCode, setCityCode] = React.useState<string | null>(null);
  const [coordinates, setCoordinates] = React.useState<Coordinate | null>(null);
  const [setAsDefault, setSetAsDefault] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [authenticatedMapStyle, setAuthenticatedMapStyle] = React.useState<AuthenticatedMapStyle | null>(null);
  const mapAvailability = React.useMemo(() => getMapRenderAvailability(), []);
  const mapLibre = React.useMemo(() => (mapAvailability.canRenderMap ? getMapLibreModule() : null), [mapAvailability.canRenderMap]);
  const canRenderMap = Boolean(mapAvailability.canRenderMap && mapLibre && authenticatedMapStyle);

  React.useEffect(() => {
    let isMounted = true;

    if (!mapAvailability.canRenderMap || !mapLibre || !OLA_TILE_STYLE_URL) {
      setAuthenticatedMapStyle(null);
      return () => {
        isMounted = false;
      };
    }

    void getAuthenticatedMapStyle(OLA_TILE_STYLE_URL)
      .then((style) => {
        if (isMounted) setAuthenticatedMapStyle(style);
      })
      .catch((error) => {
        console.warn('[address-form] failed to resolve map style', error);
        if (isMounted) setAuthenticatedMapStyle(null);
      });

    return () => {
      isMounted = false;
    };
  }, [mapAvailability.canRenderMap, mapLibre, OLA_TILE_STYLE_URL]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchAddresses();
    }, [fetchAddresses])
  );

  React.useEffect(() => {
    if (!isEditMode || !addressId) return;
    if (draft) return;

    const existing = addresses.find((item) => item.id === addressId);
    if (existing) {
      hydrateDraftFromAddress(existing);
      setSetAsDefault(existing.is_default);
    }
  }, [addressId, addresses, draft, hydrateDraftFromAddress, isEditMode]);

  React.useEffect(() => {
    const existing = isEditMode && addressId ? addresses.find((item) => item.id === addressId) : null;

    const source = draft ||
      (existing
        ? {
            label: existing.label || 'Home',
            building_name: existing.building_name || '',
            street: existing.street || '',
            colony: existing.colony || '',
            city: existing.city || '',
            pincode: existing.pincode || '',
            city_code: existing.city_code || null,
            pickup_locality: existing.pickup_locality || '',
            latitude: existing.latitude != null ? Number(existing.latitude) : null,
            longitude: existing.longitude != null ? Number(existing.longitude) : null,
          }
        : null);

    if (!source) return;

    setLabel(source.label || 'Home');
    setBuildingName(source.building_name || '');
    setStreet(source.street || '');
    setColony(source.colony || '');
    setCity(source.city || '');
    setPincode(source.pincode || '');
    setPickupLocality(source.pickup_locality || '');
    setCityCode(source.city_code || null);
    setCoordinates(
      source.latitude != null && source.longitude != null
        ? { latitude: Number(source.latitude), longitude: Number(source.longitude) }
        : null
    );

    if (!isEditMode) {
      setSetAsDefault(false);
    } else if (existing) {
      setSetAsDefault(existing.is_default);
    }
  }, [addressId, addresses, draft, isEditMode]);

  const validate = () => {
    if (!city.trim()) return 'City is required';
    if (!/^\d{6}$/.test(pincode.trim())) return 'Pincode must be exactly 6 digits';
    if (!pickupLocality.trim()) return 'Locality is required';
    if (!cityCode) return 'Please adjust pin on map to resolve city code';
    return null;
  };

  const handleAdjustPin = () => {
    setDraft({
      label: label.trim() || 'Home',
      building_name: buildingName.trim(),
      street: street.trim(),
      colony: colony.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      city_code: cityCode,
      pickup_locality: pickupLocality.trim(),
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    });

    if (addressId) {
      router.push({ pathname: '/(seller)/address-map', params: { id: addressId } } as any);
      return;
    }

    router.push('/(seller)/address-map' as any);
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      label: label.trim() || 'Home',
      building_name: buildingName.trim() || null,
      street: street.trim() || null,
      colony: colony.trim() || null,
      city: city.trim(),
      pincode: pincode.trim(),
      city_code: cityCode,
      pickup_locality: pickupLocality.trim(),
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      ...(isEditMode ? { is_default: setAsDefault } : { set_as_default: setAsDefault }),
    };

    const result = isEditMode && addressId
      ? await updateAddress(addressId, payload)
      : await createAddress(payload);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to save address');
      return;
    }

    clearDraft();
    await fetchAddresses();
    router.replace('/(seller)/addresses' as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NavBar title={isEditMode ? 'Address Details' : 'Add Address Details'} onBack={() => router.back()} />

      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.mapPreviewCard}>
            <View style={styles.mapPreviewHeader}>
              <View style={styles.mapPreviewTitleRow}>
                <MapPin size={16} color={colors.navy} />
                <Text variant="label" color={colors.navy}>Pinned location</Text>
              </View>
              <Pressable style={styles.adjustLink} onPress={handleAdjustPin}>
                <PencilSimple size={14} color={colors.navy} />
                <Text variant="caption" color={colors.navy}>Adjust</Text>
              </Pressable>
            </View>

            <View style={styles.previewMapWrap}>
              {canRenderMap && mapLibre ? (
                <mapLibre.MapView style={styles.previewMap} mapStyle={authenticatedMapStyle ?? undefined}>
                  <mapLibre.Camera
                    centerCoordinate={coordinates ? [coordinates.longitude, coordinates.latitude] : [78.4867, 17.385]}
                    zoomLevel={coordinates ? 15 : 11}
                    animationDuration={0}
                  />
                  {coordinates ? (
                    <mapLibre.PointAnnotation
                      id="address-preview-pin"
                      coordinate={[coordinates.longitude, coordinates.latitude]}
                    >
                      <View style={styles.pointPin} />
                    </mapLibre.PointAnnotation>
                  ) : null}
                </mapLibre.MapView>
              ) : (
                <View style={styles.mapUnavailableWrap}>
                  <MapPin size={18} color={colors.muted} />
                  <Text variant="caption" color={colors.muted}>{mapAvailability.heading || 'Map preview unavailable'}</Text>
                  <Text variant="caption" color={colors.slate}>{mapAvailability.body || 'Use Adjust to set location using search/current location.'}</Text>
                </View>
              )}
            </View>

            {!coordinates ? (
              <Text variant="caption" color={colors.red}>Location not pinned yet. Tap Adjust to select on map.</Text>
            ) : draft?.pickup_locality ? (
              <Text variant="caption" color={colors.slate}>Locality: {draft.pickup_locality}</Text>
            ) : null}
          </View>

          <View style={styles.formCard}>
            <Input label="Label" value={label} onChangeText={setLabel} placeholder="Home / Office" />
            <Input label="Building / House" value={buildingName} onChangeText={setBuildingName} placeholder="Flat 4B" />
            <Input label="Street" value={street} onChangeText={setStreet} placeholder="Street, landmark near pickup" />
            <Input label="Colony / Area" value={colony} onChangeText={setColony} placeholder="Colony or area name" />
            <Input label="City" value={city} onChangeText={setCity} placeholder="City" />
            <Input
              label="Pincode"
              value={pincode}
              onChangeText={(value) => setPincode(value.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="6-digit pincode"
              mono
            />
            <Input label="Pickup Locality" value={pickupLocality} onChangeText={setPickupLocality} placeholder="Locality visible to buyers before acceptance" />
          </View>

          <View style={styles.defaultRow}>
            <View style={styles.defaultLabelRow}>
              <MapPin size={16} color={colors.navy} />
              <Text variant="body" color={colors.navy}>Set as default address</Text>
            </View>
            <Switch
              value={setAsDefault}
              onValueChange={setSetAsDefault}
              thumbColor={Platform.OS === 'android' ? colors.surface : undefined}
              trackColor={{ false: colors.border, true: colors.teal }}
            />
          </View>

          {error ? <Text variant="caption" color={colors.red}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={isSubmitting ? 'Saving...' : 'Save Address'}
            disabled={isSubmitting}
            onPress={() => void handleSave()}
          />
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
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  mapPreviewCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  mapPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapPreviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  adjustLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  previewMapWrap: {
    height: 150,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  previewMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapUnavailableWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  pointPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  defaultRow: {
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defaultLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
});