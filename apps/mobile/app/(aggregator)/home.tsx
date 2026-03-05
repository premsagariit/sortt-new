/**
 * app/(aggregator)/home.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Home Screen — matches sortt_ui.html "Aggregator Dashboard"
 *
 * Layout:
 *   NavBar (dark) → Aggregator Hero (navy, fixed above scroll) → FlatList
 *
 * Sections:
 *   1. Aggregator Hero: greeting, Online pill, stats row
 *   2. New Orders Nearby: 2 feed cards with Accept/Chat/Reject buttons
 *   3. Today's Rate Index: compact 3-row rate table
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useRef } from 'react';
import { StyleSheet, View, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { House, Bell } from 'phosphor-react-native';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { EmptyState } from '../../components/ui/EmptyState';
import { MaterialCode } from '../../components/ui/Card';
import { IconButton } from '../../components/ui/Button';
import { SorttLogo } from '../../components/ui/SorttLogo';
import { Avatar } from '../../components/ui/Avatar';
import { useAggregatorStore } from '../../store/aggregatorStore';
import { useOrderStore } from '../../store/orderStore';

// ── Mock Data ──────────────────────────────────────────────────────

interface MockFeedCard {
  id: string;
  locality: string;
  postedMinutesAgo: number;
  estimatedKg: number;
  distanceKm: number;
  materials: MaterialCode[];
}

const MOCK_FEED: MockFeedCard[] = [
  {
    id: 'FEED-01',
    locality: 'Madhapur, 3rd Phase',
    postedMinutesAgo: 8,
    estimatedKg: 22,
    distanceKm: 1.4,
    materials: ['paper', 'metal'],
  },
  {
    id: 'FEED-02',
    locality: 'Kondapur, Sai Nagar',
    postedMinutesAgo: 22,
    estimatedKg: 8,
    distanceKm: 2.9,
    materials: ['ewaste', 'plastic'],
  },
  {
    id: 'ORD-7777',
    locality: 'Kondapur, Hitech City',
    postedMinutesAgo: 2,
    estimatedKg: 15,
    distanceKm: 0.8,
    materials: ['paper', 'plastic'],
  },
];

interface MockCompactRate {
  code: MaterialCode;
  label: string;
  rateDisplay: string;
  changePercent: string;
  trend: 'up' | 'down' | 'flat';
}

const MOCK_COMPACT_RATES: MockCompactRate[] = [
  { code: 'metal', label: 'Iron scrap', rateDisplay: '₹28/kg', changePercent: '↑ 2.1%', trend: 'up' },
  { code: 'paper', label: 'Newspaper', rateDisplay: '₹10/kg', changePercent: '↑ 0.8%', trend: 'up' },
  { code: 'plastic', label: 'PET Bottles', rateDisplay: '₹12/kg', changePercent: '↓ 0.5%', trend: 'down' },
];

const MATERIAL_LABEL: Record<MaterialCode, string> = {
  metal: 'Iron',
  plastic: 'Plastic',
  paper: 'Paper',
  ewaste: 'E-Waste',
  fabric: 'Fabric',
  glass: 'Glass',
};

// ── Main Screen ────────────────────────────────────────────────────

export default function AggregatorHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { isOnline, setOnline, earnings } = useAggregatorStore();

  // ── Feed Card Component (Inside to access router) ──────────────────
  const FeedCard = ({ item }: { item: MockFeedCard }) => {
    const { rejectOrder } = useOrderStore();
    const handleAccept = () => console.log(`accept pressed: ${item.locality}`);
    const handleChat = () => router.push(`/(shared)/chat/${item.id}`);
    const handleReject = () => rejectOrder(item.id);

    return (
      <View style={styles.feedCard}>
        {/* Top row */}
        <View style={styles.feedTop}>
          <View style={styles.feedTopLeft}>
            <Text variant="body" style={styles.feedLocality}>{item.locality}</Text>
            <Text variant="caption" color={colors.muted}>
              Posted {item.postedMinutesAgo} min ago · ~{item.estimatedKg} kg
            </Text>
          </View>
          <View style={styles.distanceBadge}>
            <Text variant="caption" style={styles.distanceText}>
              {item.distanceKm.toFixed(1)} km
            </Text>
          </View>
        </View>

        {/* Material tags */}
        <View style={styles.feedMats}>
          {item.materials.map((mat) => (
            <View
              key={mat}
              style={[styles.feedMatPill, { backgroundColor: colors.material[mat].bg }]}
            >
              <Text variant="caption" style={[styles.feedMatText, { color: colors.material[mat].fg }]}>
                {MATERIAL_LABEL[mat]}
              </Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.feedActions}>
          <Pressable style={[styles.feedBtn, styles.feedBtnAccept]} onPress={() => router.push({ pathname: '/(aggregator)/order-detail', params: { id: item.id } })}>
            <Text variant="button" style={styles.feedBtnAcceptText}>✓ View</Text>
          </Pressable>
          <View style={styles.feedBtnDivider} />
          <Pressable style={[styles.feedBtn, styles.feedBtnChat]} onPress={handleChat}>
            <Text variant="button" style={styles.feedBtnChatText}>💬 Chat</Text>
          </Pressable>
          <View style={styles.feedBtnDivider} />
          <Pressable style={[styles.feedBtn, styles.feedBtnReject]} onPress={handleReject}>
            <Text variant="button" style={styles.feedBtnRejectText}>✕</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ── Animation Mappings (Ported from Seller Home) ──────────────────
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, -15],
    extrapolate: 'clamp',
  });

  const minimizedOpacity = scrollY.interpolate({
    inputRange: [20, 70],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const minimizedTranslateY = scrollY.interpolate({
    inputRange: [20, 70],
    outputRange: [15, 0],
    extrapolate: 'clamp',
  });

  const greetingOpacity = scrollY.interpolate({
    inputRange: [10, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleNotifications = () => router.push('/(shared)/notifications' as any);

  // ── Screen State ──────────────────────────────────────────────────
  const [screenState, setScreenState] = React.useState<'loading' | 'empty' | 'populated'>('populated');
  const rejectedOrderIds = useOrderStore((s) => s.rejectedOrderIds);
  const activeFeed = MOCK_FEED.filter(item => !rejectedOrderIds.includes(item.id));

  const renderHeader = () => (
    <View>
      {/* ── Aggregator Hero — ported from seller home pattern ── */}
      <View style={styles.hero}>
        <View style={styles.geometricShape1} pointerEvents="none" />
        <View style={styles.geometricShape2} pointerEvents="none" />

        <Animated.View style={{ opacity: greetingOpacity }}>
          <View style={styles.heroTopRow}>
            <View>
              <Text variant="caption" style={styles.heroGreeting}>Good afternoon,</Text>
              <Text variant="heading" style={styles.heroName}>Suresh Metals</Text>
            </View>
            <Pressable
              style={[styles.onlinePill, isOnline ? styles.onlinePillActive : styles.onlinePillInactive]}
              onPress={() => setOnline(!isOnline)}
            >
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? colors.statusOnline : colors.muted }]} />
              <Text variant="caption" style={[styles.onlineText, { color: isOnline ? colors.statusOnline : colors.muted }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.locationPill}>
            <View style={[styles.locationDot, { backgroundColor: colors.statusOnline }]} />
            <Text variant="caption" style={styles.locationText}>Madhapur · 3rd Phase</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>₹{earnings.todayAmount || '1,240'}</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Today</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>{earnings.todayPickups || '06'}</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Pickups</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>04</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Pending</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.listContentPad}>
        {/* Section: New Orders Nearby */}
        <View style={styles.sectionHeader}>
          <Text variant="subheading" style={styles.sectionTitle}>New Orders Nearby</Text>
          <Pressable onPress={() => router.push('/(aggregator)/orders')}>
            <Text variant="caption" color={colors.red} style={styles.seeAllText}>See all →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.listContentPad}>
      {/* Section: Today's Rate Index (ROW LAYOUT per user request) */}
      <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
        <Text variant="subheading" style={styles.sectionTitle}>Today's Rate Index</Text>
        <Pressable onPress={() => router.push('/(aggregator)/price-index' as any)}>
          <Text variant="caption" color={colors.red} style={styles.seeAllText}>See All ›</Text>
        </Pressable>
      </View>

      <View style={styles.ratesList}>
        {MOCK_COMPACT_RATES.map((rate) => {
          const changeColor = rate.trend === 'up' ? colors.teal : rate.trend === 'down' ? colors.red : colors.muted;
          return (
            <View key={rate.code} style={styles.rateCard}>
              <View style={[styles.rateBorder, { backgroundColor: colors.material[rate.code].fg }]} />
              <View style={styles.rateInfo}>
                <Text variant="body" style={styles.rateMaterial}>{rate.label}</Text>
                <View style={styles.rateRight}>
                  <Numeric style={styles.ratePrice}>{rate.rateDisplay}</Numeric>
                  <Text variant="caption" style={[styles.rateChange, { color: changeColor }]}>
                    {rate.changePercent}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.safe}>
      <StatusBar style="light" backgroundColor={colors.navy} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300, backgroundColor: colors.navy }} />

      {/* ── Custom Animated NavBar (Identical to Seller) ── */}
      <View style={[styles.customNav, { paddingTop: insets.top, height: 56 + insets.top }]}>

        {/* UNCOMPRESSED STATE */}
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]} pointerEvents="none">
          <View style={styles.uncompressedWrap}>
            <SorttLogo variant="compact-dark" />
            <View style={[styles.badgePill, styles.badgeAggregator, { marginTop: 2 }]}>
              <View style={[styles.badgeDot, { backgroundColor: colors.amber }]} />
              <Text variant="caption" style={[styles.badgeText, { color: colors.amber }]}>AGGREGATOR</Text>
            </View>
          </View>
        </Animated.View>

        {/* COMPRESSED STATE */}
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: minimizedOpacity, transform: [{ translateY: minimizedTranslateY }] }]} pointerEvents="none">
          <View style={styles.compressedRow}>
            <View style={styles.navLeft}>
              <Text variant="subheading" style={styles.navMinimizedName}>Suresh Metals</Text>
              <View style={styles.navMinimizedLoc}>
                <View style={[styles.locationDot, { backgroundColor: isOnline ? colors.statusOnline : colors.muted }]} />
                <Text variant="caption" style={styles.navMinimizedLocText}>Madhapur</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* RIGHT ACTIONS */}
        <View style={[styles.alwaysRight, { top: insets.top }]} pointerEvents="box-none">
          <Animated.View style={[styles.compressedIndicator, { opacity: minimizedOpacity }]}>
            <Text variant="caption" style={[styles.compressedIndicatorText, { color: colors.amber }]}>A</Text>
          </Animated.View>

          <IconButton
            icon={<Bell size={22} color={colors.surface} />}
            onPress={handleNotifications}
            accessibilityLabel="Notifications"
          />
          <Pressable onPress={() => router.push('/(aggregator)/profile')} hitSlop={8}>
            <Avatar
              name="Suresh Metals"
              userType="aggregator"
              size="sm"
            />
          </Pressable>
        </View>
      </View>

      {/* ── FlatList with screenState management ── */}
      {screenState === 'loading' ? (
        <View style={styles.listContentPad}>
          <Text variant="caption">Loading nearby orders...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={screenState === 'empty' ? [] : MOCK_FEED}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={styles.cardPad}>
              <FeedCard item={item} />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.cardPad}>
              <EmptyState
                icon={<House size={48} color={colors.border} weight="thin" />}
                heading="No orders nearby"
                body="Online status is active. New requests will appear here."
              />
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  customNav: {
    backgroundColor: colors.navy,
    zIndex: 10,
    overflow: 'hidden',
  },
  uncompressedWrap: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 18,
    paddingHorizontal: spacing.sm,
    borderRadius: 11,
  },
  badgeAggregator: {
    backgroundColor: colorExtended.amberLight,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  compressedRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  navLeft: {
    justifyContent: 'center',
  },
  navMinimizedName: {
    color: colors.surface,
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
  navMinimizedLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  navMinimizedLocText: {
    color: colors.surface,
    opacity: 0.7,
    fontSize: 11,
  },
  alwaysRight: {
    position: 'absolute',
    right: spacing.sm,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compressedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colorExtended.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  compressedIndicatorText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Hero Section (Navy, port from seller) ──
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  geometricShape1: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 15,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  geometricShape2: {
    position: 'absolute',
    left: -40,
    bottom: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  heroGreeting: {
    color: colors.surface,
    opacity: 0.55,
    marginBottom: 2,
  },
  heroName: {
    color: colors.surface,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1,
  },
  onlinePillActive: {
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderColor: 'rgba(74,222,128,0.2)',
  },
  onlinePillInactive: {
    backgroundColor: 'rgba(142,155,170,0.12)',
    borderColor: 'rgba(142,155,170,0.2)',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineText: {
    fontWeight: '600',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: spacing.lg,
  },
  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  locationText: {
    color: colors.surface,
    opacity: 0.75,
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  heroStatVal: {
    fontWeight: '700',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 9,
  },

  listContent: {
    backgroundColor: colors.bg,
    paddingBottom: spacing.xxl,
  },
  listContentPad: {
    padding: spacing.md,
  },
  cardPad: {
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  seeAllText: {
    fontWeight: '600',
  },

  // ── Feed Card ──
  feedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  feedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.sm,
  },
  feedTopLeft: {
    flex: 1,
  },
  feedLocality: {
    color: colors.navy,
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    marginBottom: 2,
  },
  distanceBadge: {
    backgroundColor: colorExtended.tealLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  distanceText: {
    color: colors.teal,
    fontWeight: '600',
    fontSize: 11,
  },
  feedMats: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  feedMatPill: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  feedMatText: {
    fontSize: 11,
    fontWeight: '600',
  },
  feedActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedBtnDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  feedBtnAccept: {
    backgroundColor: colorExtended.tealLight,
  },
  feedBtnAcceptText: {
    color: colors.teal,
    fontFamily: 'DMSans-Bold',
  },
  feedBtnChat: {
    backgroundColor: colors.surface,
  },
  feedBtnChatText: {
    color: colors.slate,
    fontWeight: '500',
  },
  feedBtnReject: {
    backgroundColor: colors.surface,
  },
  feedBtnRejectText: {
    color: colors.muted,
  },

  // ── Rates List (Row Layout) ──
  ratesList: {
    gap: spacing.sm,
  },
  rateCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    height: 64,
  },
  rateBorder: {
    width: 4,
    height: '100%',
  },
  rateInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  rateMaterial: {
    fontFamily: 'DMSans-Medium',
    color: colors.navy,
  },
  rateRight: {
    alignItems: 'flex-end',
  },
  ratePrice: {
    fontWeight: '700',
    color: colors.navy,
  },
  rateChange: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
