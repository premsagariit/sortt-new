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

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, Pressable, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { House, MapPin, Calendar, Bell, ArrowRight, Wallet, ArrowUp, Tray } from 'phosphor-react-native';
import { APP_NAME } from '../../constants/app';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { getOrderDisplayAmount, useOrderStore } from '../../store/orderStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { Text, Numeric } from '../../components/ui/Typography';
import { BaseCard, OrderCard, MaterialCode, OrderStatus } from '../../components/ui/Card';
import { IconButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar } from '../../components/ui/Avatar';
import { SorttLogo } from '../../components/ui/SorttLogo';
import { NotificationBell } from '../../components/ui/NotificationBell';
import { router } from 'expo-router';

// ── Rate shape from GET /api/rates ───────────────────────────────────
interface RateEntry { material_code: string; name: string; rate_per_kg: number; trend: 'up' | 'down' | 'flat'; }

// ── Avatar image source ────────────────────────────────────────────────
const AVATAR_SOURCE = require('../../assets/avatar_placeholder.png');


const ACTIVE_STATUSES = ['created', 'accepted', 'en_route', 'arrived', 'weighing_in_progress'];

export default function SellerHomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Store ────────────────────────────────────────────────────────
  const displayName = useAuthStore((s) => s.name) || 'You';
  const displayLocality = useAuthStore((s) => s.locality) || '—';
  const displayCity = useAuthStore((s) => s.city) || 'Your city';
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const ordersLoading = useOrderStore((s) => s.isLoading);

  // ── Live stats derived from store ──────────────────────────────
  const totalEarned = useMemo(() => {
    const sum = orders
      .filter(o => o.status === 'completed')
      .reduce((acc, o) => acc + getOrderDisplayAmount(o), 0);
    return sum > 0 ? `₹${sum.toLocaleString('en-IN')}` : '₹0';
  }, [orders]);
  const ordersCount = String(orders.length).padStart(2, '0');
  const activeOrders = useMemo(() => orders.filter(o => ACTIVE_STATUSES.includes(o.status)), [orders]);
  const activeCount = String(activeOrders.length).padStart(2, '0');
  const recentOrders = useMemo(() => {
    return orders
      .filter(o => ACTIVE_STATUSES.includes(o.status) || o.status === 'completed')
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [orders]);

  // ── Live rates from GET /api/rates ─────────────────────────────
  const [rates, setRates] = useState<RateEntry[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const fetchRates = useCallback(async (silent = false) => {
    if (!silent) setRatesLoading(true);
    try {
      const res = await api.get('/api/rates');
      setRates(res.data.rates || []);
    } catch { /* non-fatal: rates section stays empty */ } finally {
      if (!silent) setRatesLoading(false);
    }
  }, []);

  // ── On mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetchMe();
    fetchOrders();
    fetchRates();

    // Auto-refresh: poll every 30s — silent so no loading flash
    const poll = setInterval(() => {
      fetchOrders(true);
      fetchRates(true);
    }, 30_000);

    return () => clearInterval(poll);
  }, [fetchMe, fetchOrders, fetchRates]);

  // Re-fetch silently when tab gains focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders(true);
      fetchRates(true);
    }, [fetchOrders, fetchRates])
  );

  const calculateEstimate = useCallback((order: any) => getOrderDisplayAmount(order), []);


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

  // Home screen should not go away when offline according to requirements.
  // Instead, the Navbar will turn red and show a refresh button.
  const loadDataAsync = useCallback(async (silent = false) => {
    await fetchOrders(silent);
    await fetchRates(silent);
  }, [fetchOrders, fetchRates]);


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
          <Text variant="heading" style={styles.greetingName}>{displayName}</Text>
          <View style={styles.locationPill}>
            <View style={[styles.locationDot, { backgroundColor: '#4ADE80' }]} />
            <Text variant="caption" style={styles.locationText}>{displayCity} · {displayLocality}</Text>
          </View>

          {/* New Hero Stats Row (matches Aggregator pattern) */}
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>{totalEarned}</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Earned</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>{ordersCount}</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Orders</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>{activeCount}</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Active</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.listContentPad}>

        {/* Primary CTA */}
        <Pressable style={styles.primaryCta} onPress={handleCreateListing}>
          <View style={styles.ctaIconBox}>
            <House size={22} color={colors.surface} weight="bold" />
          </View>
          <View style={styles.ctaTextCol}>
            <Text variant="subheading" style={styles.ctaTitle}>SELL SCRAP</Text>
            <Text variant="caption" style={styles.ctaSub}>List your scrap for pickup</Text>
          </View>
          <ArrowRight size={20} color={colors.surface} weight="bold" />
        </Pressable>

        {/* Secondary CTA Row */}
        <View style={styles.secCtaRow}>
          <Pressable style={styles.secCtaCard} onPress={handleMarketRates} hitSlop={12}>
            <View style={[styles.secCtaIcon, { backgroundColor: colorExtended.surface2 }]}>
              <Wallet size={20} color={colors.navy} weight="bold" />
            </View>
            <Text variant="caption" style={styles.secCtaTitle}>Market Rates</Text>
            <Text variant="caption" color={colors.muted}>Today's prices</Text>
          </Pressable>
          <Pressable style={styles.secCtaCard} onPress={handleMyOrders} hitSlop={12}>
            <View style={[styles.secCtaIcon, { backgroundColor: colorExtended.tealLight }]}>
              <Calendar size={20} color={colors.teal} weight="bold" />
            </View>
            <Text variant="caption" style={styles.secCtaTitle}>My Orders</Text>
            <Text variant="caption" color={colors.muted}>Track pickups</Text>
          </Pressable>
        </View>

        {/* Today's Rates Section */}
        <View style={styles.ratesSection}>
          <View style={styles.sectionHeader}>
            <Text variant="subheading" style={styles.ratesTitle} numberOfLines={1}>Today's Rates</Text>
            <Pressable onPress={() => router.push('/(seller)/prices')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text variant="caption" color={colors.red} style={styles.seeAllText}>See all</Text>
              <ArrowRight size={14} color={colors.red} weight="bold" />
            </Pressable>
          </View>

          <View style={styles.ratesList}>
            {ratesLoading ? (
              <ActivityIndicator size="small" color={colors.muted} style={{ marginVertical: 12 }} />
            ) : rates.length > 0 ? rates.slice(0, 3).map(r => (
              <View key={r.material_code} style={styles.rateCard}>
                <View style={styles.rateInfo}>
                  <Text variant="body" style={styles.rateMaterial}>{r.name}</Text>
                  <Numeric style={styles.ratePrice}>₹{r.rate_per_kg}/kg</Numeric>
                </View>
                {r.trend === 'up' ? <ArrowUp size={18} color={colors.teal} weight="bold" /> :
                 r.trend === 'down' ? <ArrowUp size={18} color={colors.red} weight="bold" style={{ transform: [{ rotate: '180deg' }] }} /> :
                 <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}><View style={{ width: 12, height: 2, backgroundColor: colors.muted }} /></View>}
              </View>
            )) : (
              <Text variant="caption" color={colors.muted} style={{ paddingVertical: 8 }}>Rates unavailable — check back soon.</Text>
            )}
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text variant="subheading">Recent Orders</Text>
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
      <View style={[
        styles.customNav,
        { paddingTop: insets.top, height: 56 + insets.top },
      ]}>
        {/* UNCOMPRESSED STATE */}
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]} pointerEvents="none">
          <View style={styles.uncompressedWrap}>
            <SorttLogo variant="compact-dark" />
          </View>
        </Animated.View>

        {/* COMPRESSED STATE */}
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: minimizedOpacity, transform: [{ translateY: minimizedTranslateY }] }]} pointerEvents="none">
          <View style={styles.compressedRow}>
            <View style={styles.navLeft}>
              <Text variant="subheading" style={styles.navMinimizedName}>{displayName}</Text>
              <View style={styles.navMinimizedLoc}>
                <MapPin size={10} color={colors.surface} />
                <Text variant="caption" style={styles.navMinimizedLocText}>{displayLocality}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* RIGHT ACTIONS */}
        <View style={[styles.alwaysRight, { top: insets.top }]} pointerEvents="box-none">
          <NotificationBell />
          <Pressable onPress={() => router.push('/(seller)/profile')} hitSlop={8}>
            <Avatar
              name={displayName}
              userType="seller"
              size="sm"
            />
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable FlatList ── */}
      <Animated.FlatList
        data={recentOrders}
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
            onPress={() => router.push(`/(seller)/order/${item.orderId}` as any)}
            style={styles.cardPad}
          >
            <OrderCard
              orderId={item.orderId}
              orderNumber={item.orderNumber}
              status={item.status}
              materials={item.materials}
              amountRupees={calculateEstimate(item)}
              date={new Date(item.createdAt).toDateString() === new Date().toDateString() ? 'Today' : new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
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