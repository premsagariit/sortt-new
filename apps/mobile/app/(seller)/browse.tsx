/**
 * app/(seller)/browse.tsx
 * ──────────────────────────────────────────────────────────────────
 * Seller Browse Screen (S30) — Nearby Aggregators
 * ──────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MagnifyingGlass, Star, X } from 'phosphor-react-native';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { EmptyState } from '../../components/ui/EmptyState';
import { MaterialCode } from '../../components/ui/Card';
import { api } from '../../lib/api';

// ── Mock Data ──────────────────────────────────────────────────────

interface Aggregator {
  id: string;
  name: string;
  initial: string;
  distance: string;
  latitude: number | null;
  longitude: number | null;
  localities: string;
  rating: number;
  reviews: number;
  materials: MaterialCode[];
  bestRateMaterial: string | null;
  bestRate: string | null;
  isOnline: boolean;
}

const MATERIAL_FILTERS: Array<{ key: 'all' | MaterialCode; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'metal', label: 'Metal' },
  { key: 'paper', label: 'Paper' },
  { key: 'plastic', label: 'Plastic' },
  { key: 'ewaste', label: 'E-Waste' },
  { key: 'fabric', label: 'Fabric' },
  { key: 'glass', label: 'Glass' },
];

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

// ── Component ──────────────────────────────────────────────────────

export default function SellerBrowseScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<'all' | MaterialCode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aggregators, setAggregators] = useState<Aggregator[]>([]);
  const [isLoadingAggregators, setIsLoadingAggregators] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    api.get('/api/aggregators/browse')
      .then((res: any) => {
        if (!active) return;
        const rows = Array.isArray(res.data?.aggregators) ? res.data.aggregators : [];

        const materialCodes = new Set<MaterialCode>(['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass', 'custom']);
        const mapped: Aggregator[] = rows.map((item: any) => {
          const materials: MaterialCode[] = Array.isArray(item.materials)
            ? item.materials
                .map((mat: unknown) => String(mat).toLowerCase())
                .filter((mat: string): mat is MaterialCode => materialCodes.has(mat as MaterialCode))
            : [];

          return {
            id: String(item.id),
            name: String(item.name ?? 'Aggregator'),
            initial: String(item.initial ?? 'A').charAt(0).toUpperCase(),
            distance: String(item.distance ?? 'City-wide'),
            latitude: toNumberOrNull(item.latitude),
            longitude: toNumberOrNull(item.longitude),
            localities: String(item.localities ?? 'City-wide service'),
            rating: Number(item.rating ?? 0),
            reviews: Number(item.reviews ?? 0),
            materials,
            bestRateMaterial: item.bestRateMaterial ? String(item.bestRateMaterial) : null,
            bestRate: item.bestRate ? String(item.bestRate) : null,
            isOnline: Boolean(item.isOnline),
          };
        });

        setAggregators(mapped);
        setLoadError(null);
        setIsLoadingAggregators(false);
      })
      .catch((err: any) => {
        if (!active) return;
        console.error('Failed to fetch aggregators', err);
        setLoadError(err?.response?.data?.error ?? err?.message ?? 'Failed to load aggregators');
        setAggregators([]);
        setIsLoadingAggregators(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredAggregators = aggregators.filter((agg) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      agg.name.toLowerCase().includes(q) ||
      agg.localities.toLowerCase().includes(q) ||
      agg.materials.some((material) => material.toLowerCase().includes(q));

    const matchesFilter = activeFilter === 'all' || agg.materials.includes(activeFilter as MaterialCode);
    return matchesSearch && matchesFilter;
  });

  const renderHeader = () => (
    <View>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <MagnifyingGlass size={16} color={colors.muted} weight="regular" />
          <TextInput
            style={styles.textInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search aggregators, materials..."
            placeholderTextColor={colors.muted}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={12}
            >
              <X size={14} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {MATERIAL_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            const label = filter.key === 'all'
              ? `${filter.label} (${aggregators.length})`
              : filter.label;

            return (
            <Pressable
              key={filter.key}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text
                variant="caption"
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          )})}
        </ScrollView>
      </View>
    </View>
  );

  const renderAggregator = ({ item }: { item: Aggregator }) => (
    <Pressable
      style={styles.aggCard}
      onPress={() =>
        router.push({
          pathname: '/(seller)/agg-profile',
          params: { id: item.id },
        } as any)
      }
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.initial}</Text>
      </View>
      <View style={styles.aggInfo}>
        <View style={styles.aggHeader}>
          <Text variant="body" style={styles.aggName}>{item.name}</Text>
          <Numeric style={styles.distance}>{item.distance}</Numeric>
        </View>
        <Text variant="caption" color={colors.muted} style={styles.localities}>
          {item.localities}
        </Text>
        <View style={styles.ratingRow}>
          <View style={styles.stars}>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={12}
                weight={i < Math.floor(item.rating) ? 'fill' : 'regular'}
                color={i < Math.floor(item.rating) ? colors.amber : colors.muted}
              />
            ))}
          </View>
          <Numeric style={styles.reviewText}>{item.rating} ({item.reviews})</Numeric>
        </View>
        <View style={styles.materialsRow}>
          {item.materials.map(mat => (
            <View
              key={mat}
              style={[
                styles.materialChip,
                { backgroundColor: colors.material[mat].bg, borderColor: colors.material[mat].fg }
              ]}
            >
              <Text variant="caption" style={[styles.materialChipText, { color: colors.material[mat].fg }]}>
                {MATERIAL_LABEL[mat]}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.bestRateContainer}>
          <Text variant="caption" style={styles.bestRateLabel}>
            Best rate: {item.bestRateMaterial ? item.bestRateMaterial : 'N/A'}
          </Text>
          <Numeric style={styles.bestRateValue}>{item.bestRate ? item.bestRate : '--'}</Numeric>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <NavBar
        variant="light"
        title="Nearby Aggregators"
        rightAction={
          <Pressable
            style={styles.mapButton}
            onPress={() => router.push('/(seller)/browse-map' as any)}
          >
            <Text variant="caption" style={styles.mapButtonText}>🗺 Map</Text>
          </Pressable>
        }
      />

      <FlatList
        data={filteredAggregators}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={renderAggregator}
        ListFooterComponent={
          isLoadingAggregators ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.navy} />
              <Text variant="caption" color={colors.muted}>Loading nearby aggregators...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={<MagnifyingGlass size={48} />}
            heading={loadError ? 'Unable to load aggregators' : 'No aggregators found'}
            body={loadError ? 'Please try again in a moment.' : 'Try adjusting your filters.'}
          />
        }
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  mapButton: {
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mapButtonText: {
    color: colors.surface,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colorExtended.surface2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: colors.navy,
    fontFamily: 'DMSans-Regular',
    padding: 0,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersScroll: {
    gap: 8,
    paddingRight: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colorExtended.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipText: {
    color: colors.slate,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  aggCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: '700',
  },
  aggInfo: {
    flex: 1,
  },
  aggHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aggName: {
    fontWeight: '700',
    color: colors.navy,
  },
  distance: {
    fontSize: 12,
    color: colors.muted,
  },
  localities: {
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 11,
    color: colors.muted,
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
  bestRateContainer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bestRateLabel: {
    color: colors.amber,
    fontWeight: '600',
  },
  bestRateValue: {
    color: colors.amber,
    fontWeight: '700',
    fontSize: 16,
  },
  loadingContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
});
