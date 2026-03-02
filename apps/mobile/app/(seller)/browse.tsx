/**
 * app/(seller)/browse.tsx
 * ──────────────────────────────────────────────────────────────────
 * Seller Browse Screen (S30) — Nearby Aggregators
 * ──────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';
import { StyleSheet, View, FlatList, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MagnifyingGlass, Star, X } from 'phosphor-react-native';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { EmptyState } from '../../components/ui/EmptyState';
import { MaterialCode } from '../../components/ui/Card';

// ── Mock Data ──────────────────────────────────────────────────────

interface Aggregator {
  id: string;
  name: string;
  initial: string;
  distance: string;
  localities: string;
  rating: number;
  reviews: number;
  materials: MaterialCode[];
  bestRateMaterial: string;
  bestRate: string;
}

const MOCK_AGGREGATORS: Aggregator[] = [
  {
    id: '1',
    name: 'Kumar Scrap Co.',
    initial: 'K',
    distance: '1.2 km',
    localities: 'Banjara Hills · Jubilee Hills',
    rating: 4.8,
    reviews: 142,
    materials: ['metal', 'paper', 'plastic'],
    bestRateMaterial: 'Metal',
    bestRate: '₹29/kg',
  },
  {
    id: '2',
    name: 'Ravi Scrap Shop',
    initial: 'R',
    distance: '2.7 km',
    localities: 'Himayatnagar · Basheerbagh',
    rating: 4.5,
    reviews: 89,
    materials: ['ewaste', 'metal'],
    bestRateMaterial: 'E-Waste',
    bestRate: '₹65/kg',
  },
  {
    id: '3',
    name: 'Green Collect',
    initial: 'G',
    distance: '3.4 km',
    localities: 'Ameerpet · SR Nagar',
    rating: 4.6,
    reviews: 210,
    materials: ['paper', 'fabric'],
    bestRateMaterial: 'Paper',
    bestRate: '₹13/kg',
  },
];

const FILTERS = ['All (14)', 'Metal', 'Paper', 'Plastic', 'E-Waste'];

const MATERIAL_LABEL: Record<MaterialCode, string> = {
  metal:   '⚙ Metal',
  plastic: '🧴 Plastic',
  paper:   '📄 Paper',
  ewaste:  '💻 E-Waste',
  fabric:  '👗 Fabric',
  glass:   '🍶 Glass',
};

// ── Component ──────────────────────────────────────────────────────

export default function SellerBrowseScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All (14)');
  const [searchQuery, setSearchQuery] = useState('');

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
      {/* Filters (Mock - not active in filtering logic yet per plan) */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {FILTERS.map((filter) => (
            <Pressable
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                variant="caption"
                style={[
                  styles.filterChipText,
                  activeFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderAggregator = ({ item }: { item: Aggregator }) => (
    <Pressable
      style={styles.aggCard}
      onPress={() => router.push('/(seller)/agg-profile')}
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
          <Text variant="caption" style={styles.bestRateLabel}>Best rate: {item.bestRateMaterial}</Text>
          <Numeric style={styles.bestRateValue}>{item.bestRate}</Numeric>
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
          <Pressable style={styles.mapButton}>
             <Text variant="caption" style={styles.mapButtonText}>🗺 Map</Text>
          </Pressable>
        }
      />

      <FlatList
        data={MOCK_AGGREGATORS.filter(agg => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return agg.name.toLowerCase().includes(q) || agg.materials.some(m => m.toLowerCase().includes(q));
        })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={renderAggregator}
        ListEmptyComponent={
          <EmptyState
            icon={<MagnifyingGlass size={48} />}
            heading="No aggregators found"
            body="Try adjusting your filters."
          />
        }
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingBottom: spacing.xxl,
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
  }
});
