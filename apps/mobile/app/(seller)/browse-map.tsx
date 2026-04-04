import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Star } from 'phosphor-react-native';

import { NavBar } from '../../components/ui/NavBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Text, Numeric } from '../../components/ui/Typography';
import { colors, radius, spacing } from '../../constants/tokens';
import { api } from '../../lib/api';
import { MAP_RENDERING_AVAILABLE } from '../../utils/mapAvailable';
import { getMapLibreModule } from '../../lib/maplibre';
import { OLA_TILE_STYLE_URL } from '../../lib/olaMaps';

type MapAggregator = {
  id: string;
  name: string;
  initial: string;
  distance: string;
  localities: string;
  rating: number;
  reviews: number;
  isOnline: boolean;
  latitude: number | null;
  longitude: number | null;
};

const HYDERABAD_CENTER: [number, number] = [78.4867, 17.385];

const toNumberOrNull = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function SellerBrowseMapScreen() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [aggregators, setAggregators] = React.useState<MapAggregator[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const mapLibre = React.useMemo(() => (MAP_RENDERING_AVAILABLE ? getMapLibreModule() : null), []);
  const canRenderMap = Boolean(MAP_RENDERING_AVAILABLE && mapLibre && OLA_TILE_STYLE_URL);

  React.useEffect(() => {
    let active = true;

    api.get('/api/aggregators/browse')
      .then((res: any) => {
        if (!active) return;
        const rows = Array.isArray(res.data?.aggregators) ? res.data.aggregators : [];

        const mapped = rows.map((item: any): MapAggregator => ({
          id: String(item.id),
          name: String(item.name ?? 'Aggregator'),
          initial: String(item.initial ?? 'A').charAt(0).toUpperCase(),
          distance: String(item.distance ?? 'City-wide'),
          localities: String(item.localities ?? 'City-wide service'),
          rating: Number(item.rating ?? 0),
          reviews: Number(item.reviews ?? 0),
          isOnline: Boolean(item.isOnline),
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

  const mapCenter = React.useMemo<[number, number]>(() => {
    if (selected?.latitude != null && selected?.longitude != null) {
      return [selected.longitude, selected.latitude];
    }
    const first = mappableAggregators[0];
    if (first?.latitude != null && first?.longitude != null) {
      return [first.longitude, first.latitude];
    }
    return HYDERABAD_CENTER;
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
        {canRenderMap && mapLibre ? (
          <>
            <mapLibre.MapView style={styles.map} mapStyle={OLA_TILE_STYLE_URL}>
              <mapLibre.Camera centerCoordinate={mapCenter} zoomLevel={mappableAggregators.length > 0 ? 11.5 : 10} />

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
              Live map preview is unavailable in Expo Go.
            </Text>
            <Text variant="caption" color={colors.muted} style={styles.centerText}>
              Use an EAS dev/prod build to view map pins.
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
        <View style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <Text variant="body" style={styles.selectedName}>{selected.name}</Text>
            <Numeric style={styles.selectedDistance}>{selected.distance}</Numeric>
          </View>
          <Text variant="caption" color={colors.muted}>{selected.localities}</Text>
          <View style={styles.ratingRow}>
            <Star size={12} color={colors.amber} weight="fill" />
            <Numeric style={styles.reviewText}>{selected.rating} ({selected.reviews})</Numeric>
            <View style={[styles.statusDot, { backgroundColor: selected.isOnline ? colors.teal : colors.muted }]} />
            <Text variant="caption" color={selected.isOnline ? colors.teal : colors.muted}>
              {selected.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      ) : null}

      {showEmptyState ? (
        <EmptyState
          icon={<MapPin size={42} color={colors.muted} />}
          heading={error ? 'Unable to load map' : 'No coordinates available'}
          body={error ? 'Please try again in a moment.' : 'Aggregators will appear once coordinate data is available.'}
        />
      ) : (
        <FlatList
          data={mappableAggregators}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selected?.id === item.id;
            return (
              <View style={[styles.listCard, isSelected && styles.listCardSelected]}>
                <Text variant="caption" style={styles.listName}>{item.name}</Text>
                <Numeric style={styles.listDistance}>{item.distance}</Numeric>
              </View>
            );
          }}
        />
      )}
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
  selectedName: {
    color: colors.navy,
    fontWeight: '700',
  },
  selectedDistance: {
    color: colors.muted,
    fontSize: 12,
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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 120,
  },
  listCardSelected: {
    borderColor: colors.navy,
    backgroundColor: colors.surface2,
  },
  listName: {
    color: colors.navy,
    fontWeight: '600',
  },
  listDistance: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
  },
});
