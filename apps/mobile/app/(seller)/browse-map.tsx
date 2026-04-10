import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Star } from 'phosphor-react-native';

import { NavBar } from '../../components/ui/NavBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Text, Numeric } from '../../components/ui/Typography';
import { MaterialCode } from '../../components/ui/Card';
import { colors, radius, spacing } from '../../constants/tokens';
import { api } from '../../lib/api';
import { getMapRenderAvailability } from '../../utils/mapAvailable';
import { getMapLibreModule } from '../../lib/maplibre';
import { type AuthenticatedMapStyle, getAuthenticatedMapStyle, OLA_TILE_STYLE_URL } from '../../lib/olaMaps';

type MapAggregator = {
  id: string;
  name: string;
  businessName: string;
  initial: string;
  distance: string;
  localities: string;
  rating: number;
  reviews: number;
  isOnline: boolean;
  materials: MaterialCode[];
  latitude: number | null;
  longitude: number | null;
};

const MATERIAL_LABEL: Record<MaterialCode, string> = {
  metal: '⚙ Metal',
  plastic: '🧴 Plastic',
  paper: '📄 Paper',
  ewaste: '💻 E-Waste',
  fabric: '👗 Fabric',
  glass: '🍶 Glass',
  custom: '📦 Other',
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toOptionalString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export default function SellerBrowseMapScreen() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [aggregators, setAggregators] = React.useState<MapAggregator[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
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
        console.warn('[browse-map] failed to resolve map style', error);
        if (isMounted) setAuthenticatedMapStyle(null);
      });

    return () => {
      isMounted = false;
    };
  }, [mapAvailability.canRenderMap, mapLibre, OLA_TILE_STYLE_URL]);

  React.useEffect(() => {
    let active = true;

    api.get('/api/aggregators/browse')
      .then((res: any) => {
        if (!active) return;
        const rows = Array.isArray(res.data?.aggregators) ? res.data.aggregators : [];
        const materialCodes = new Set<MaterialCode>(['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass', 'custom']);

        const mapped = rows.map((item: any): MapAggregator => ({
          id: String(item.id),
          name: toOptionalString(item.name),
          businessName: toOptionalString(item.businessName) || toOptionalString(item.name),
          initial: toOptionalString(item.initial).charAt(0).toUpperCase() || toOptionalString(item.name).charAt(0).toUpperCase(),
          distance: toOptionalString(item.distance),
          localities: toOptionalString(item.localities),
          rating: Number(item.rating ?? 0),
          reviews: Number(item.reviews ?? 0),
          isOnline: Boolean(item.isOnline),
          materials: Array.isArray(item.materials)
            ? item.materials
                .map((mat: unknown) => String(mat).toLowerCase())
                .filter((mat: string): mat is MaterialCode => materialCodes.has(mat as MaterialCode))
            : [],
          latitude: item.latitude == null ? null : toNumberOrNull(item.latitude),
          longitude: item.longitude == null ? null : toNumberOrNull(item.longitude),
        }));

        setAggregators(mapped);
        setSelectedId(mapped[0]?.id ?? null);
        setError(null);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.response?.data?.error ?? err?.message ?? 'Failed to load map data');
        setAggregators([]);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const mappableAggregators = React.useMemo(
    () => aggregators.filter((agg) => agg.latitude != null && agg.longitude != null),
    [aggregators]
  );

  const selected = React.useMemo(
    () => mappableAggregators.find((agg) => agg.id === selectedId) ?? mappableAggregators[0] ?? null,
    [mappableAggregators, selectedId]
  );

  const mapCenter = React.useMemo<[number, number] | null>(() => {
    if (selected?.latitude != null && selected?.longitude != null) {
      return [selected.longitude, selected.latitude];
    }
    const first = mappableAggregators[0];
    if (first?.latitude != null && first?.longitude != null) {
      return [first.longitude, first.latitude];
    }
    return null;
  }, [mappableAggregators, selected]);

  const showEmptyState = !isLoading && mappableAggregators.length === 0;

  return (
    <View style={styles.container}>
      <NavBar
        variant="light"
        title="Aggregator Map"
        onBack={() => router.back()}
        rightAction={
          <View style={styles.countPill}>
            <Text variant="caption" style={styles.countPillText}>
              {mappableAggregators.length} pins
            </Text>
          </View>
        }
      />

      <View style={styles.mapWrap}>
        {canRenderMap && mapLibre && mapCenter ? (
          <>
            <mapLibre.MapView style={styles.map} mapStyle={authenticatedMapStyle ?? undefined}>
              <mapLibre.Camera centerCoordinate={mapCenter} zoomLevel={11.5} />

              {mappableAggregators.map((agg) => (
                <mapLibre.PointAnnotation
                  key={agg.id}
                  id={`agg-${agg.id}`}
                  coordinate={[Number(agg.longitude), Number(agg.latitude)]}
                  onSelected={() => setSelectedId(agg.id)}
                >
                  <View
                    style={[
                      styles.marker,
                      agg.isOnline ? styles.markerOnline : styles.markerOffline,
                      selected?.id === agg.id && styles.markerActive,
                    ]}
                  >
                    <Text variant="caption" style={styles.markerText}>{agg.initial}</Text>
                  </View>
                </mapLibre.PointAnnotation>
              ))}
            </mapLibre.MapView>

            <View style={styles.mapHint}>
              <MapPin size={14} color={colors.slate} />
              <Text variant="caption" color={colors.slate}>Tap a pin to preview aggregator</Text>
            </View>
          </>
        ) : (
          <View style={styles.mapFallback}>
            <MapPin size={18} color={colors.muted} />
            <Text variant="caption" color={colors.muted} style={styles.centerText}>
              {mapAvailability.canRenderMap
                ? 'No live coordinates available for map preview yet.'
                : mapAvailability.heading || 'Live map preview is unavailable.'}
            </Text>
            <Text variant="caption" color={colors.muted} style={styles.centerText}>
              {mapAvailability.canRenderMap
                ? 'Aggregators will appear once coordinate data is available from backend.'
                : mapAvailability.body || 'Use an EAS dev/prod build to view map pins.'}
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.navy} />
            <Text variant="caption" color={colors.muted}>Loading coordinates...</Text>
          </View>
        ) : null}
      </View>

      {selected ? (
        <Pressable
          style={styles.selectedCard}
          onPress={() =>
            router.push({
              pathname: '/(seller)/agg-profile',
              params: { id: selected.id },
            } as any)
          }
        >
          <View style={styles.selectedHeader}>
            <View style={styles.selectedTitleBlock}>
              <Text variant="body" style={styles.selectedName}>{selected.name}</Text>
              <Text variant="caption" color={colors.muted} style={styles.selectedBusinessName}>
                {selected.businessName}
              </Text>
            </View>
            <Numeric style={styles.selectedDistance}>{selected.distance}</Numeric>
          </View>

          <View style={styles.ratingRow}>
            <Star size={12} color={colors.amber} weight="fill" />
            <Numeric style={styles.reviewText}>{selected.rating} ({selected.reviews})</Numeric>
            <View style={[styles.statusDot, { backgroundColor: selected.isOnline ? colors.teal : colors.muted }]} />
            <Text variant="caption" color={selected.isOnline ? colors.teal : colors.muted}>
              {selected.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>

          <Text variant="caption" color={colors.muted} style={styles.selectedLocalities}>
            {selected.localities || 'City-wide service'}
          </Text>

          <View style={styles.materialsRow}>
            {selected.materials.length > 0 ? (
              selected.materials.map((material) => (
                <View
                  key={material}
                  style={[
                    styles.materialChip,
                    {
                      backgroundColor: colors.material[material].bg,
                      borderColor: colors.material[material].fg,
                    },
                  ]}
                >
                  <Text variant="caption" style={[styles.materialChipText, { color: colors.material[material].fg }]}>
                    {MATERIAL_LABEL[material]}
                  </Text>
                </View>
              ))
            ) : (
              <Text variant="caption" color={colors.muted}>No materials listed</Text>
            )}
          </View>
        </Pressable>
      ) : null}

      {showEmptyState ? (
        <EmptyState
          icon={<MapPin size={42} color={colors.muted} />}
          heading={error ? 'Unable to load map' : 'No coordinates available'}
          body={error ? 'Please try again in a moment.' : 'Aggregators will appear once coordinate data is available.'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  countPill: {
    backgroundColor: colors.navy,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  countPillText: {
    color: colors.surface,
    fontWeight: '600',
  },
  mapWrap: {
    flex: 1,
    flexGrow: 1.35,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapHint: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerOnline: {
    backgroundColor: colors.teal,
    borderColor: colors.surface,
  },
  markerOffline: {
    backgroundColor: colors.muted,
    borderColor: colors.surface,
  },
  markerActive: {
    transform: [{ scale: 1.08 }],
    borderColor: colors.navy,
  },
  markerText: {
    color: colors.surface,
    fontWeight: '700',
  },
  selectedCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    gap: spacing.xs,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTitleBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  selectedName: {
    color: colors.navy,
    fontWeight: '700',
  },
  selectedBusinessName: {
    marginTop: 2,
  },
  selectedDistance: {
    color: colors.muted,
    fontSize: 12,
  },
  selectedLocalities: {
    marginTop: 2,
  },
  ratingRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reviewText: {
    color: colors.muted,
    fontSize: 11,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: spacing.xs,
  },
  materialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  materialChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  materialChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
