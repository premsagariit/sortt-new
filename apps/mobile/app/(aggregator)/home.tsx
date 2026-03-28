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

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, Pressable, Animated, AppState, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { House, MapPin, Calendar, Bell, ArrowRight, CaretUp, CaretDown, Minus } from 'phosphor-react-native';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/Button';
import { SorttLogo } from '../../components/ui/SorttLogo';
import { Avatar } from '../../components/ui/Avatar';
import { useAggregatorStore, NewOrderRequest } from '../../store/aggregatorStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationBell } from '../../components/ui/NotificationBell';
import type { MaterialCode } from '../../components/ui/MaterialChip';
import { api } from '../../lib/api';
import { useAggregatorFeedChannel } from '../../hooks/useAggregatorFeedChannel';

// ── Note: Feed is now sourced from aggregatorStore.newOrders ────────

interface MockCompactRate {
  code: MaterialCode;
  label: string;
  rateDisplay: string;
  changePercent: string;
  trend: 'up' | 'down' | 'flat';
}

const MOCK_COMPACT_RATES: MockCompactRate[] = [
  { code: 'metal', label: 'Iron scrap', rateDisplay: '₹28/kg', changePercent: '2.1%', trend: 'up' },
  { code: 'paper', label: 'Newspaper', rateDisplay: '₹10/kg', changePercent: '0.8%', trend: 'up' },
  { code: 'plastic', label: 'PET Bottles', rateDisplay: '₹12/kg', changePercent: '0.5%', trend: 'down' },
];

const MATERIAL_LABEL: Record<MaterialCode, string> = {
  metal: 'Iron',
  plastic: 'Plastic',
  paper: 'Paper',
  ewaste: 'E-Waste',
  fabric: 'Fabric',
  glass: 'Glass',
  custom: 'Other',
};

// ── Mock fallbacks (replaced by backend data on Day 4) ──────────────
const MOCK_AGG_NAME = 'Suresh Metals';
const MOCK_AGG_AREA = 'Madhapur · 3rd Phase';
const MOCK_AGG_AREA_SHORT = 'Madhapur';
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;
const MIN_ACCEPTABLE_RATES: Record<string, number> = {
  metal: 25,
  paper: 8,
};

function normalizeArea(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

// ── Main Screen ────────────────────────────────────────────────────

export default function AggregatorHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { isOnline, updateOnlineStatus, earnings, profile, primaryArea, fetchFeed, fetchAggregatorProfile, fetchAggregatorEarnings, fetchAggregatorRates, error } = useAggregatorStore();
  const lastFeedSyncAt = useAggregatorStore((s) => s.lastFeedSyncAt);
  const lastFeedError = useAggregatorStore((s) => s.lastFeedError);
  const aggregatorName = useAuthStore((s: any) => s.name);
  const fetchMe = useAuthStore((s: any) => s.fetchMe);
  const userType = useAuthStore((s: any) => s.userType);

  useAggregatorFeedChannel();

  // Read from store with mock fallbacks (Day 4: store populated from backend)
  const displayName = aggregatorName || profile?.name || MOCK_AGG_NAME;
  const normalizedStoreArea = normalizeArea(primaryArea);
  const normalizedProfileArea = normalizeArea(profile?.operatingArea);
  const displayArea = normalizedStoreArea || normalizedProfileArea || MOCK_AGG_AREA;
  const displayAreaShort = displayArea.split(',')[0]?.trim() || MOCK_AGG_AREA_SHORT;

  useFocusEffect(
    useCallback(() => {
      void fetchMe(); // Always — breaks the circular dependency where userType starts null
      if (userType === 'aggregator') {
        void fetchAggregatorProfile();
      }
    }, [userType, fetchMe, fetchAggregatorProfile])
  );

  const [screenState, setScreenState] = React.useState<'loading' | 'error' | 'empty' | 'populated'>('loading');
  // liveRates stored as { material_code: rate_per_kg } map for O(1) lookup in render
  const [liveRates, setLiveRates] = React.useState<Record<string, number> | null>(null);

  // ── Heartbeat & Polling ──────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendHeartbeat = useCallback(() => {
    // Role check prevents 403 when seller UI is active
    if (userType !== 'aggregator' || !isOnline) return;
    api.post('/api/aggregators/heartbeat', { is_online: true }).catch(() => {});
  }, [userType, isOnline]);

  const startHeartbeat = useCallback(() => {
    if (userType !== 'aggregator') return;
    // Removed redundant immediate sendHeartbeat() to prevent double logs on toggle
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(sendHeartbeat, 60_000); // 1 min heartbeat
  }, [userType, sendHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (userType === 'aggregator' && isOnline) {
      api.post('/api/aggregators/heartbeat', { is_online: false }).catch(() => {});
    }
  }, [userType]);

  /** Toggle aggregator online/offline status */
  const handleToggle = useCallback(async () => {
    try {
      await updateOnlineStatus(!isOnline);
    } catch (err: any) {
      // Error handled by store (reverts state and sets error)
    }
  }, [isOnline, updateOnlineStatus]);

  const loadDataAsync = useCallback(async (silent = true) => {
    // Only show loading state if we have no data yet (silent skeleton pattern)
    const shouldShowLoader = !silent && screenState !== 'populated';
    if (shouldShowLoader) setScreenState('loading');

    try {
      const [, , ratesRes] = await Promise.all([
        fetchFeed(silent),
        fetchAggregatorEarnings('all'),
        api.get('/api/rates').catch(() => null),
        fetchAggregatorRates(),
      ]);
      if (ratesRes) {
        const map: Record<string, number> = {};
        for (const r of (ratesRes.data.rates ?? [])) {
          map[r.material_code] = r.rate_per_kg;
        }
        setLiveRates(map);
      }
      setScreenState('populated');
    } catch {
      if (screenState !== 'populated') setScreenState('error');
    }
  }, [fetchFeed, fetchAggregatorRates, screenState]);

  useEffect(() => {
    // Only run heartbeat and polling if aggregator
    if (userType === 'aggregator') {
      startHeartbeat();
      loadDataAsync(false);

      // Auto-refresh: poll for new orders every 30s
      pollRef.current = setInterval(() => loadDataAsync(true), 30_000);
    }

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (userType === 'aggregator') {
          sendHeartbeat(); // Ping immediately on foreground
          startHeartbeat();
          loadDataAsync(true);
        }
      } else {
        stopHeartbeat();
      }
    });

    return () => {
      stopHeartbeat();
      if (pollRef.current) clearInterval(pollRef.current);
      sub.remove();
    };
  }, [userType, startHeartbeat, stopHeartbeat, loadDataAsync]);

  // Re-fetch whenever this tab gains focus (handles switching from other tabs)
  useFocusEffect(
    useCallback(() => {
      if (userType === 'aggregator') {
        loadDataAsync(true);
      }
    }, [userType, loadDataAsync])
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  const lastFeedSyncLabel = useMemo(() => {
    if (!lastFeedSyncAt) return null;
    return new Date(lastFeedSyncAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [lastFeedSyncAt]);

  const isInactive = useMemo(() => {
    if (!lastFeedSyncAt || !isOnline) return false;
    return (Date.now() - new Date(lastFeedSyncAt).getTime()) > INACTIVITY_THRESHOLD_MS;
  }, [lastFeedSyncAt, isOnline]);

  const FeedCard = ({ item }: { item: NewOrderRequest }) => {
    const { dismissNewOrder, materials } = useAggregatorStore();
    
    // G11.6: Acceptance Threshold logic
    const isLocked = useMemo(() => {
      // If any of the order materials are below the minimum acceptable rate in user's profile
      return item.materials.some(matCode => {
        const userMat = materials.find(m => m.id === matCode);
        const minRate = MIN_ACCEPTABLE_RATES[matCode];
        if (userMat && minRate && userMat.ratePerKg < minRate) return true;
        return false;
      });
    }, [item.materials, materials]);

    return (
      <View style={[styles.feedCard, isLocked && styles.feedCardLocked]}>
        {isLocked && (
          <View style={styles.lockedOverlay}>
            <View style={styles.lockedBadge}>
              <Text variant="caption" style={styles.lockedBadgeText}>Locked: Rate too low</Text>
            </View>
          </View>
        )}

        {/* Top row: locality + distance badge */}
        <View style={styles.feedTop}>
          <View style={styles.feedTopLeft}>
            <Text variant="body" style={styles.feedLocality}>{item.locality}</Text>
            <Text variant="caption" color={colors.muted}>
              {item.sellerType ? `${item.sellerType} · ` : ''}~{item.estimatedKg} kg
            </Text>
          </View>
          <View style={styles.distanceBadge}>
            <Text variant="caption" style={styles.distanceText}>
              {typeof item.distanceKm === 'number' ? `${item.distanceKm.toFixed(1)} km` : '0.0 km'}
            </Text>
          </View>
        </View>

        {/* Meta row: window + est. value */}
        <View style={styles.headerInfo}>
          <View style={styles.headerInfoItem}>
            <Calendar size={12} color={colors.muted} />
            <Text variant="caption" color={colors.muted}>
              {typeof item.window === 'string' && item.window ? item.window : 'Flexible pickup'}
            </Text>
          </View>
          {item.estimatedPrice > 0 && (
            <View style={[styles.headerInfoItem, { marginLeft: 'auto' }]}>
              <Text variant="caption" style={styles.estValueText}>
                ~₹{item.estimatedPrice.toLocaleString('en-IN')}
              </Text>
            </View>
          )}
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

        {/* Action buttons — exactly half-width each */}
        <View style={styles.feedActions}>
          {isLocked ? (
            <Pressable
              style={[styles.feedBtn, styles.feedBtnUpdate]}
              onPress={() => router.push('/(aggregator)/price-index')}
            >
              <Text variant="button" style={styles.feedBtnUpdateText}>Update rates to bid</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.feedBtn, styles.feedBtnAccept]}
              onPress={() => router.push({ pathname: '/(aggregator)/order/[id]', params: { id: item.id } } as any)}
            >
              <Text variant="button" style={styles.feedBtnAcceptText}>View Order</Text>
            </Pressable>
          )}
          <View style={styles.feedBtnDivider} />
          <Pressable style={[styles.feedBtn, styles.feedBtnReject]} onPress={() => dismissNewOrder(item.id)}>
            <Text variant="button" style={styles.feedBtnRejectText}>Dismiss</Text>
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
  // Use newOrders from store so Dismiss causes immediate re-render
  const activeFeed = useAggregatorStore((s) => s.newOrders);
  const allTimeEarnings = useAggregatorStore((s) => s.earningsByPeriod.all);

  const renderHeader = () => (
    <View>
      {/* ── Aggregator Hero — ported from seller home pattern ── */}
      <View style={styles.hero}>
        <View style={styles.geometricShape1} pointerEvents="none" />
        <View style={styles.geometricShape2} pointerEvents="none" />

        <Animated.View style={{ opacity: greetingOpacity }}>
          <View style={styles.heroTopRow}>
            <View>
              <Text variant="caption" style={styles.heroGreeting}>{greeting}</Text>
              <Text variant="heading" style={styles.heroName}>{displayName}</Text>
            </View>
            <Pressable
              style={[styles.onlinePill, isOnline ? styles.onlinePillActive : styles.onlinePillInactive]}
              onPress={handleToggle}
            >
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? colors.statusOnline : colors.muted }]} />
              <Text variant="caption" style={[styles.onlineText, { color: isOnline ? colors.statusOnline : colors.muted }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.locationPill}>
            <View style={[styles.locationDot, { backgroundColor: colors.statusOnline }]} />
            <Text variant="caption" style={styles.locationText}>{displayArea}</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>₹{Number(allTimeEarnings?.total_earned ?? 0).toLocaleString('en-IN')}</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Earnings</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>{Number(allTimeEarnings?.orders_completed ?? 0)}</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>Pickups</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Numeric size={20} color={colors.surface} style={styles.heroStatVal}>{activeFeed.length}</Numeric>
              <Text variant="caption" style={styles.heroStatLabel}>New</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.listContentPad}>
        {/* Section: New Orders Nearby */}
        <View style={styles.sectionHeader}>
          <Text variant="subheading" style={styles.sectionTitle}>New Orders Nearby</Text>
          <Pressable onPress={() => router.push('/(aggregator)/orders')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text variant="caption" color={colors.red} style={styles.seeAllText}>See all</Text>
            <ArrowRight size={14} color={colors.red} weight="bold" />
          </Pressable>
        </View>

        {isInactive && (
          <Pressable 
            style={styles.inactivityBanner}
            onPress={() => loadDataAsync()}
          >
            <Text variant="caption" style={styles.inactivityText}>
              Stale feed? Pull to refresh for latest orders
            </Text>
            <View style={styles.refreshIconSmall}>
              <ArrowRight size={12} color={colors.surface} />
            </View>
          </Pressable>
        )}

        {lastFeedSyncLabel && (
          <Text variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
            Updated {lastFeedSyncLabel}
          </Text>
        )}
        {lastFeedError && (
          <Text variant="caption" style={{ color: colors.red, marginTop: 4 }}>
            Feed refresh failed. Retrying automatically.
          </Text>
        )}
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.listContentPad}>
      {/* Section: Today's Rate Index (ROW LAYOUT per user request) */}
      <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
        <Text variant="subheading" style={styles.sectionTitle}>Today's Rate Index</Text>
        <Pressable onPress={() => router.push('/(aggregator)/price-index' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text variant="caption" color={colors.red} style={styles.seeAllText}>See All</Text>
          <ArrowRight size={14} color={colors.red} weight="bold" />
        </Pressable>
      </View>

      <View style={styles.ratesList}>
        {MOCK_COMPACT_RATES.map((rate) => {
          const changeColor = rate.trend === 'up' ? colors.teal : rate.trend === 'down' ? colors.red : colors.muted;
          return (
            <View key={rate.code} style={styles.rateCard}>
              <View style={[styles.rateBorder, { backgroundColor: (colors.material[rate.code as keyof typeof colors.material] ?? colors.material.metal).fg }]} />
              <View style={styles.rateInfo}>
                <Text variant="body" style={styles.rateMaterial}>{rate.label}</Text>
                <View style={styles.rateRight}>
                  {liveRates ? (
                    <Numeric style={styles.ratePrice}>₹{liveRates[rate.code]}/kg</Numeric>
                  ) : (
                    <Numeric style={styles.ratePrice}>{rate.rateDisplay}</Numeric>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    {rate.trend === 'up' && <CaretUp size={10} color={colors.teal} weight="bold" />}
                    {rate.trend === 'down' && <CaretDown size={10} color={colors.red} weight="bold" />}
                    {rate.trend === 'flat' && <Minus size={10} color={colors.muted} weight="bold" />}
                    <Text variant="caption" style={[styles.rateChange, { color: changeColor }]}>
                      {rate.changePercent}
                    </Text>
                  </View>
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
          <View style={[
            styles.customNav,
            { paddingTop: insets.top, height: 56 + insets.top },
          ]}>
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
                  <Text variant="subheading" style={styles.navMinimizedName}>{displayName}</Text>
                  <View style={styles.navMinimizedLoc}>
                    <View style={[styles.locationDot, { backgroundColor: isOnline ? colors.statusOnline : colors.muted }]} />
                    <Text variant="caption" style={styles.navMinimizedLocText}>{displayAreaShort}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* RIGHT ACTIONS */}
            <View style={[styles.alwaysRight, { top: insets.top }]} pointerEvents="box-none">
              <Animated.View style={[styles.compressedIndicator, { opacity: minimizedOpacity }]}>
                <Text variant="caption" style={[styles.compressedIndicatorText, { color: colors.amber }]}>A</Text>
              </Animated.View>

              <NotificationBell />
              <Pressable onPress={() => router.push('/(aggregator)/profile')} hitSlop={8}>
                <Avatar
                  name={displayName}
                  userType="aggregator"
                  size="sm"
                />
              </Pressable>
            </View>
          </View>

          {/* ── FlatList with screenState management ── */}
          {screenState === 'loading' ? (
            <View style={[styles.listContentPad, { alignItems: 'center', marginTop: 40 }]}>
              <ActivityIndicator size="large" color={colors.navy} />
              <Text variant="caption" style={{ marginTop: 12 }}>Loading nearby orders...</Text>
            </View>
          ) : screenState === 'error' ? (
            <View style={[styles.listContentPad, { alignItems: 'center', marginTop: 40 }]}>
              <View style={{ padding: 16, backgroundColor: colors.redLight, borderRadius: 8, borderColor: colors.red, borderWidth: 1, width: '100%' }}>
                <Text variant="body" style={{ color: colors.red, textAlign: 'center' }}>
                  Failed to load feed
                </Text>
                <Pressable onPress={() => loadDataAsync()} style={{ marginTop: 8, alignSelf: 'center', backgroundColor: colors.red, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                  <Text variant="caption" style={{ color: colors.surface, fontWeight: 'bold' }}>Retry</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Animated.FlatList
              data={activeFeed.length === 0 ? [] : activeFeed}
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
    backgroundColor: colors.amberLight,
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
    backgroundColor: colors.amberLight,
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
    backgroundColor: 'rgba(74,222,128,0.20)',
    borderColor: 'rgba(74,222,128,0.35)',
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
    fontSize: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
  },
  headerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedCardLocked: {
    opacity: 0.85,
    backgroundColor: colors.surface2,
  },
  lockedOverlay: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    zIndex: 10,
  },
  lockedBadge: {
    backgroundColor: colorExtended.redLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.red,
  },
  lockedBadgeText: {
    color: colors.red,
    fontSize: 10,
    fontWeight: '700',
  },
  feedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
    backgroundColor: colors.tealLight,
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
    backgroundColor: colors.tealLight,
  },
  feedBtnAcceptText: {
    color: colors.teal,
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
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
    fontSize: 13,
  },
  estValueText: {
    color: colors.amber,
    fontFamily: 'DMSans-SemiBold',
    fontSize: 12,
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
  inactivityBanner: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.card,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: 8,
  },
  inactivityText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 12,
  },
  refreshIconSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedBtnUpdate: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.amber,
  },
  feedBtnUpdateText: {
    color: colors.surface,
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
  },
});
