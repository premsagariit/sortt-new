/**
 * app/(seller)/home.tsx
 * ──────────────────────────────────────────────────────────────────
 * Seller Home Screen — rebuilt to match sortt_ui.html "Home Dashboard"
 *
 * Layout:
 *   NavBar (dark) → Greeting Strip (navy, fixed above scroll) → FlatList
 *
 * The greeting strip sits OUTSIDE the FlatList — it does NOT scroll.
 * All other content (ticker, stats, CTAs, orders) are in ListHeaderComponent.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useRef } from 'react';
import { StyleSheet, View, FlatList, Pressable, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Bell, Tray } from 'phosphor-react-native';
import { APP_NAME } from '../../constants/app';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { BaseCard, OrderCard, MaterialCode, OrderStatus } from '../../components/ui/Card';
import { IconButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar } from '../../components/ui/Avatar';
import { SorttLogo } from '../../components/ui/SorttLogo';

// ── Mock Data ──────────────────────────────────────────────────────
const AVATAR_SOURCE = require('../../assets/avatar_placeholder.png');

interface MockOrder {
  orderId: string;
  status: OrderStatus;
  materials: MaterialCode[];
  amountRupees: number;
  date: string;
}

const MOCK_ORDERS: MockOrder[] = [
  {
    orderId: 'ORD-2841',
    status: 'en_route',
    materials: ['paper', 'metal'],
    amountRupees: 380,
    date: 'Today',
  },
  {
    orderId: 'ORD-2790',
    status: 'completed',
    materials: ['plastic', 'ewaste'],
    amountRupees: 640,
    date: '22 Feb 2026',
  },
  {
    orderId: 'ORD-2751',
    status: 'completed',
    materials: ['paper'],
    amountRupees: 210,
    date: '18 Feb 2026',
  },
  {
    orderId: 'ORD-7777',
    status: 'arrived',
    materials: ['paper', 'plastic'],
    amountRupees: 280,
    date: 'Today',
  },
];


import { router } from 'expo-router';

// ───────────────────────────────────────────────────────────────────

export default function SellerHomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Calculate greeting text once
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  const handleCreateListing = () => router.push('/(seller)/listing/step1');
  const handleNotifications = () => router.push('/(shared)/notifications' as any);
  const handleMarketRates = () => router.push('/(seller)/prices');
  const handleMyOrders = () => router.push('/(seller)/orders');

  // ── List Header (Greeting + stats + CTAs + recent orders title) ──
  const renderHeader = () => (
    <View>
      {/* Greeting Strip (now scrolls with content) */}
      <View style={styles.greetingStrip}>
        <View style={styles.geometricShape1} pointerEvents="none" />
        <View style={styles.geometricShape2} pointerEvents="none" />
        <Animated.View style={{ opacity: greetingOpacity }}>
          <Text variant="caption" style={styles.greetingSub}>{greeting}</Text>
          <Text variant="heading" style={styles.greetingName}>Ravi Kumar</Text>
          <View style={styles.locationPill}>
            <View style={[styles.locationDot, { backgroundColor: '#4ADE80' }]} />
            <Text variant="caption" style={styles.locationText}>Hyderabad · Kondapur</Text>
          </View>

          {/* New Hero Stats Row (matches Aggregator pattern) */}
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>₹2,840</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Earned</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>07</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Orders</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>01</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Active</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.listContentPad}>

        {/* Primary CTA */}
        <Pressable style={styles.primaryCta} onPress={handleCreateListing}>
          <View style={styles.ctaIconBox}>
            <Text variant="body" style={styles.ctaEmoji}>♻️</Text>
          </View>
          <View style={styles.ctaTextCol}>
            <Text variant="subheading" style={styles.ctaTitle}>SELL SCRAP</Text>
            <Text variant="caption" style={styles.ctaSub}>List your scrap for pickup</Text>
          </View>
          <Text variant="body" style={styles.ctaArrow}>›</Text>
        </Pressable>

        {/* Secondary CTA Row */}
        <View style={styles.secCtaRow}>
          <Pressable style={styles.secCtaCard} onPress={handleMarketRates} hitSlop={12}>
            <View style={[styles.secCtaIcon, { backgroundColor: colorExtended.surface2 }]}>
              <Text variant="body">📊</Text>
            </View>
            <Text variant="caption" style={styles.secCtaTitle}>Market Rates</Text>
            <Text variant="caption" color={colors.muted}>Today's prices</Text>
          </Pressable>
          <Pressable style={styles.secCtaCard} onPress={handleMyOrders} hitSlop={12}>
            <View style={[styles.secCtaIcon, { backgroundColor: colorExtended.tealLight }]}>
              <Text variant="body">🚚</Text>
            </View>
            <Text variant="caption" style={styles.secCtaTitle}>My Orders</Text>
            <Text variant="caption" color={colors.muted}>Track pickups</Text>
          </Pressable>
        </View>

        {/* Today's Rates Section */}
        <View style={styles.ratesSection}>
          <View style={styles.sectionHeader}>
            <Text variant="subheading" style={styles.ratesTitle}>Today's Rates</Text>
            <Pressable onPress={() => router.push('/(seller)/prices')}>
              <Text variant="caption" color={colors.red} style={styles.seeAllText}>See all →</Text>
            </Pressable>
          </View>

          <View style={styles.ratesList}>
            <View style={styles.rateCard}>
              <View style={styles.rateInfo}>
                <Text variant="body" style={styles.rateMaterial}>Metal (Iron)</Text>
                <Numeric style={styles.ratePrice}>₹28/kg</Numeric>
              </View>
              <Text variant="body" style={[styles.trendIcon, { color: colors.teal }]}>▲</Text>
            </View>

            <View style={styles.rateCard}>
              <View style={styles.rateInfo}>
                <Text variant="body" style={styles.rateMaterial}>Paper</Text>
                <Numeric style={styles.ratePrice}>₹12/kg</Numeric>
              </View>
              <Text variant="body" style={[styles.trendIcon, { color: colors.muted }]}>—</Text>
            </View>

            <View style={styles.rateCard}>
              <View style={styles.rateInfo}>
                <Text variant="body" style={styles.rateMaterial}>Plastic (PET)</Text>
                <Numeric style={styles.ratePrice}>₹8/kg</Numeric>
              </View>
              <Text variant="body" style={[styles.trendIcon, { color: colors.red }]}>▼</Text>
            </View>
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text variant="subheading">Active Orders</Text>
          <Pressable onPress={() => router.push('/(seller)/orders')}>
            <Text variant="caption" color={colors.red}>See all</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.safe}>
      <StatusBar style="light" backgroundColor={colors.navy} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300, backgroundColor: colors.navy }} />
      {/* ── Custom Animated NavBar ── */}
      <View style={[styles.customNav, { paddingTop: insets.top, height: 56 + insets.top }]}>

        {/* UNCOMPRESSED STATE (Title + Badge) */}
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]} pointerEvents="none">
          <View style={styles.uncompressedWrap}>
            <SorttLogo variant="compact-dark" />
            <View style={[styles.badgePill, styles.badgeSeller, { marginTop: 2 }]}>
              <View style={[styles.badgeDot, { backgroundColor: colors.teal }]} />
              <Text variant="caption" style={[styles.badgeText, { color: colors.teal }]}>SELLER</Text>
            </View>
          </View>
        </Animated.View>

        {/* COMPRESSED STATE (Name + Loc) */}
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: minimizedOpacity, transform: [{ translateY: minimizedTranslateY }] }]} pointerEvents="none">
          <View style={styles.compressedRow}>
            <View style={styles.navLeft}>
              <Text variant="subheading" style={styles.navMinimizedName}>Ravi Kumar</Text>
              <View style={styles.navMinimizedLoc}>
                <View style={[styles.locationDot, { backgroundColor: colors.statusOnline }]} />
                <Text variant="caption" style={styles.navMinimizedLocText}>Kondapur</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ALWAYS VISIBLE RIGHT ACTIONS */}
        <View style={[styles.alwaysRight, { top: insets.top }]} pointerEvents="box-none">
          <Animated.View style={[styles.compressedIndicator, { opacity: minimizedOpacity }]}>
            <Text variant="caption" style={[styles.compressedIndicatorText, { color: colors.teal }]}>S</Text>
          </Animated.View>

          <IconButton
            icon={<Bell size={22} color={colors.surface} />}
            onPress={handleNotifications}
            accessibilityLabel="Notifications"
          />
          <Pressable onPress={() => router.push('/(seller)/profile')} hitSlop={8}>
            <Avatar
              name="Ravi Kumar"
              userType="seller"
              size="sm"
              source={AVATAR_SOURCE}
            />
          </Pressable>
        </View>

      </View>

      {/* ── Scrollable FlatList ── */}
      <Animated.FlatList
        data={MOCK_ORDERS.filter(o => o.status !== 'completed')}
        keyExtractor={(item) => item.orderId}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(shared)/order/${item.orderId}` as any)}
            style={styles.cardPad}
          >
            <OrderCard
              orderId={item.orderId}
              status={item.status}
              materials={item.materials}
              amountRupees={item.amountRupees}
              date={item.date}
            />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.cardPad}>
            <EmptyState
              icon={<Tray size={48} />}
              heading="No pickups yet"
              body="Create your first listing to get started."
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── Custom Animated NavBar ──
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
  navTitle: {
    color: colors.surface,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 18,
    paddingHorizontal: spacing.sm,
    borderRadius: 11,
  },
  badgeSeller: {
    backgroundColor: colorExtended.tealLight,
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
    backgroundColor: colorExtended.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  compressedIndicatorText: {
    fontSize: 12,
    fontWeight: '800',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.surface,
    fontWeight: '700',
  },

  // ── Greeting Strip ───────────────────────────────────────────────
  greetingStrip: {
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
  greetingSub: {
    color: colors.surface,
    opacity: 0.55,
    marginBottom: 2,
  },
  greetingName: {
    color: colors.surface,
    marginBottom: spacing.md,
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

  // ── Scroll area ──────────────────────────────────────────────────
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

  // ── Rate Ticker ──────────────────────────────────────────────────
  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  tickerLabel: {
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  tickerItems: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.md,
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tickerPrice: {
    color: colors.amber,
    fontSize: 12,
  },

  heroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
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

  // ── Primary CTA ──────────────────────────────────────────────────
  primaryCta: {
    backgroundColor: colors.red,
    borderRadius: radius.btn,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  ctaIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ctaEmoji: {
    fontSize: 18,
  },
  ctaTextCol: {
    flex: 1,
  },
  ctaTitle: {
    color: colors.surface,
    fontWeight: '700',
  },
  ctaSub: {
    color: colors.surface,
    opacity: 0.65,
    marginTop: 1,
  },
  ctaArrow: {
    color: colors.surface,
    opacity: 0.5,
    fontSize: 20,
  },

  // ── Secondary CTA Row ────────────────────────────────────────────
  secCtaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  secCtaCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  secCtaIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secCtaTitle: {
    color: colors.navy,
    fontWeight: '600',
  },

  // ── Rates Section ───────────────────────────────────────────────
  ratesSection: {
    marginBottom: spacing.lg,
  },
  ratesTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ratesList: {
    gap: 8,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rateInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  rateMaterial: {
    color: colors.navy,
    fontWeight: '500',
  },
  ratePrice: {
    color: colors.navy,
    fontWeight: '600',
  },
  trendIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },

  // ── Section Header ───────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  // ── List ─────────────────────────────────────────────────────────
  separator: {
    height: spacing.sm,
  },
});