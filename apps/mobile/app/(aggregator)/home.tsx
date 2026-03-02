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
import { StyleSheet, View, FlatList, Pressable, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { House, Bell } from 'phosphor-react-native';
import { APP_NAME } from '../../constants/app';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { EmptyState } from '../../components/ui/EmptyState';
import { MaterialCode } from '../../components/ui/Card';
import { IconButton } from '../../components/ui/Button';
import { SorttLogo } from '../../components/ui/SorttLogo';
import { SorttLogoVariant } from '../../components/ui/SorttLogo';

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
    id:               'FEED-01',
    locality:         'Madhapur, 3rd Phase',
    postedMinutesAgo: 8,
    estimatedKg:      22,
    distanceKm:       1.4,
    materials:        ['paper', 'metal'],
  },
  {
    id:               'FEED-02',
    locality:         'Kondapur, Sai Nagar',
    postedMinutesAgo: 22,
    estimatedKg:      8,
    distanceKm:       2.9,
    materials:        ['ewaste', 'plastic'],
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
  { code: 'metal',   label: 'Iron scrap', rateDisplay: '₹28/kg', changePercent: '↑ 2.1%', trend: 'up'   },
  { code: 'paper',   label: 'Newspaper',  rateDisplay: '₹10/kg', changePercent: '↑ 0.8%', trend: 'up'   },
  { code: 'plastic', label: 'PET Bottles',rateDisplay: '₹12/kg', changePercent: '↓ 0.5%', trend: 'down' },
];

const MATERIAL_LABEL: Record<MaterialCode, string> = {
  metal:   'Iron',
  plastic: 'Plastic',
  paper:   'Paper',
  ewaste:  'E-Waste',
  fabric:  'Fabric',
  glass:   'Glass',
};

// ── Feed Card Component ────────────────────────────────────────────

function FeedCard({ item }: { item: MockFeedCard }) {
  const handleAccept = () => console.log(`accept pressed: ${item.locality}`);
  const handleChat   = () => router.push(`/(shared)/chat/${item.id}`);
  const handleReject = () => console.log(`reject pressed: ${item.locality}`);

  return (
    <View style={styles.feedCard}>
      {/* Top row */}
      <View style={styles.feedTop}>
        <View style={styles.feedTopLeft}>
          <Text variant="caption" style={styles.feedLocality}>{item.locality}</Text>
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
        <Pressable style={[styles.feedBtn, styles.feedBtnAccept]} onPress={handleAccept}>
          <Text variant="caption" style={styles.feedBtnAcceptText}>✓ Accept</Text>
        </Pressable>
        <View style={styles.feedBtnDivider} />
        <Pressable style={[styles.feedBtn, styles.feedBtnChat]} onPress={handleChat}>
          <Text variant="caption" style={styles.feedBtnChatText}>💬 Chat</Text>
        </Pressable>
        <View style={styles.feedBtnDivider} />
        <Pressable style={[styles.feedBtn, styles.feedBtnReject]} onPress={handleReject}>
          <Text variant="caption" style={styles.feedBtnRejectText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────

export default function AggregatorHomeScreen() {
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

  const handleNotifications = () => console.log('notifications pressed');

  const renderHeader = () => (
    <View>
      {/* ── Aggregator Hero — now scrolls with content ── */}
      <View style={styles.hero}>
        {/* Top row: greeting + Online pill */}
        <Animated.View style={[styles.heroTop, { opacity: greetingOpacity }]}>
          <View>
            <Text variant="caption" style={styles.heroGreeting}>Good morning,</Text>
            <Text variant="subheading" style={styles.heroName}>Suresh Metals &amp; More</Text>
          </View>
          <View style={styles.onlinePill}>
            {/* #4ADE80 — permitted one-time use: online/location status indicator */}
            <View style={[styles.onlineDot, { backgroundColor: colors.statusOnline }]} />
            <Text variant="caption" style={styles.onlineText}>Online</Text>
          </View>
        </Animated.View>
        {/* Stats row */}
        <View style={styles.heroStats}>
          <View style={styles.heroStatCard}>
            <Numeric style={styles.heroStatVal}>₹1,240</Numeric>
            <Text variant="caption" style={styles.heroStatLabel}>Today</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Numeric style={styles.heroStatVal}>06</Numeric>
            <Text variant="caption" style={styles.heroStatLabel}>Pickups</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Numeric style={styles.heroStatVal}>04</Numeric>
            <Text variant="caption" style={styles.heroStatLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Section: New Orders Nearby */}
      <View style={styles.sectionHeader}>
        <Text variant="subheading">New Orders Nearby</Text>
        <Text variant="caption" color={colors.red}>View all</Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View>
      {/* Section: Today's Rate Index */}
      <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
        <Text variant="subheading">Today's Rate Index</Text>
        <Text variant="caption" color={colors.red}>Full index ›</Text>
      </View>

      {/* Compact rate rows */}
      <View style={styles.compactRates}>
        {MOCK_COMPACT_RATES.map((rate, index) => {
          const changeColor = rate.trend === 'up' ? colors.teal : rate.trend === 'down' ? colors.red : colors.muted;
          const isLast = index === MOCK_COMPACT_RATES.length - 1;
          return (
            <View
              key={rate.code}
              style={[
                styles.compactRateRow,
                { borderLeftColor: colors.material[rate.code].fg },
                !isLast && styles.compactRateRowBorder,
              ]}
            >
              <Text variant="caption" style={styles.compactRateName}>{rate.label}</Text>
              <Numeric style={styles.compactRateValue}>{rate.rateDisplay}</Numeric>
              <Text variant="caption" style={[styles.compactRateChange, { color: changeColor }]}>
                {rate.changePercent}
              </Text>
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
      {/* ── Custom Animated NavBar ── */}
      <View style={[styles.customNav, { paddingTop: insets.top, height: 56 + insets.top }]}>
        
        {/* UNCOMPRESSED STATE (Title + Badge) */}
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]} pointerEvents="none">
          <View style={styles.uncompressedWrap}>
             <SorttLogo variant="compact-dark" />
             <View style={[styles.badgePill, styles.badgeAggregator, { marginTop: 2 }]}>
               <View style={[styles.badgeDot, { backgroundColor: colors.amber }]} />
               <Text variant="caption" style={[styles.badgeText, { color: colors.amber }]}>AGGREGATOR</Text>
             </View>
          </View>
        </Animated.View>

        {/* COMPRESSED STATE (Name + Loc) */}
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: minimizedOpacity, transform: [{ translateY: minimizedTranslateY }] }]} pointerEvents="none">
           <View style={styles.compressedRow}>
              <View style={styles.navLeft}>
                <Text variant="subheading" style={styles.navMinimizedName}>Suresh Metals &amp; More</Text>
                <View style={styles.navMinimizedLoc}>
                  <View style={[styles.locationDot, { backgroundColor: colors.statusOnline }]} />
                  <Text variant="caption" style={styles.navMinimizedLocText}>Madhapur</Text>
                </View>
              </View>
           </View>
        </Animated.View>

        {/* ALWAYS VISIBLE RIGHT ACTIONS */}
        <View style={[styles.alwaysRight, { top: insets.top }]} pointerEvents="box-none">
          <Animated.View style={[styles.compressedIndicator, { opacity: minimizedOpacity }]}>
            <Text variant="caption" style={[styles.compressedIndicatorText, { color: colors.amber }]}>A</Text>
          </Animated.View>
          
          <IconButton
            icon={<Bell size={22} color={colors.surface} />}
            onPress={handleNotifications}
            accessibilityLabel="Notifications"
          />
          <View style={styles.avatar}>
            <Text variant="caption" style={styles.avatarText}>SM</Text>
          </View>
        </View>

      </View>

      {/* ── FlatList: Feed + Rate Index ── */}
      <Animated.FlatList
        data={MOCK_FEED}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.cardPad}>
            <FeedCard item={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListFooterComponent={
          <View style={styles.cardPad}>
            {renderFooter()}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.cardPad}>
            <EmptyState
              icon={<House size={48} />}
              heading="No orders nearby"
              body="New pickup requests will appear here."
            />
          </View>
        }
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex:            1,
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
  locationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
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
  avatar: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    color:      colors.surface,
    fontWeight: '700',
  },

  // ── Hero section ─────────────────────────────────────────────────
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingTop:        spacing.xxl,
    paddingBottom:     spacing.xxl,
  },
  heroTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   spacing.md,
  },
  heroGreeting: {
    color:   colors.surface,
    opacity: 0.5,
  },
  heroName: {
    color:    colors.surface,
    marginTop: 2,
  },
  onlinePill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderWidth:     1,
    borderColor:     'rgba(74,222,128,0.2)',
    paddingVertical:   5,
    paddingHorizontal: 11,
    borderRadius:    20,
  },
  onlineDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  onlineText: {
    color:      colors.statusOnline, // Matches online indicator colour (permitted)
    fontWeight: '600',
  },
  heroStats: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  heroStatCard: {
    flex:            1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.08)',
    borderRadius:    10,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  heroStatVal: {
    color:    colors.surface,
    fontSize: 20,
    fontWeight: '700',
  },
  heroStatLabel: {
    color:     'rgba(255,255,255,0.45)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 9,
  },

  // ── Scroll area ──────────────────────────────────────────────────
  listContent: {
    backgroundColor: colors.bg,
    paddingBottom:   spacing.xxl,
  },
  cardPad: {
    paddingHorizontal: spacing.md,
  },

  // ── Section header ───────────────────────────────────────────────
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.sm,
    paddingHorizontal: spacing.md,
  },

  // ── Feed Card ────────────────────────────────────────────────────
  feedCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.card,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  feedTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    padding:        spacing.sm,
    paddingBottom:  spacing.xs,
  },
  feedTopLeft: {
    flex: 1,
  },
  feedLocality: {
    color:      colors.navy,
    fontWeight: '700',
    fontSize:   13,
  },
  distanceBadge: {
    backgroundColor: colorExtended.tealLight,
    paddingVertical:   3,
    paddingHorizontal: 8,
    borderRadius:    6,
  },
  distanceText: {
    color:      colors.teal,
    fontWeight: '600',
    fontSize:   11,
  },
  feedMats: {
    flexDirection:  'row',
    gap:            6,
    flexWrap:       'wrap',
    paddingHorizontal: spacing.sm,
    paddingBottom:  spacing.xs,
  },
  feedMatPill: {
    paddingVertical:   3,
    paddingHorizontal: 9,
    borderRadius:    6,
  },
  feedMatText: {
    fontSize:   11,
    fontWeight: '600',
  },
  feedActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedBtn: {
    flex:           1,
    paddingVertical: 11,
    alignItems:     'center',
    justifyContent: 'center',
  },
  feedBtnDivider: {
    width:           1,
    backgroundColor: colors.border,
  },
  feedBtnAccept: {
    backgroundColor: colorExtended.tealLight,
  },
  feedBtnAcceptText: {
    color:      colors.teal,
    fontWeight: '700',
  },
  feedBtnChat: {
    backgroundColor: colors.surface,
  },
  feedBtnChatText: {
    color: colors.slate,
  },
  feedBtnReject: {
    backgroundColor: colors.surface,
  },
  feedBtnRejectText: {
    color: colors.muted,
  },

  // ── Compact Rate Table ───────────────────────────────────────────
  compactRates: {
    backgroundColor: colors.surface,
    borderRadius:    radius.card,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  compactRateRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical:  spacing.sm,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 3,
  },
  compactRateRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compactRateName: {
    flex:       1,
    color:      colors.navy,
    fontWeight: '600',
  },
  compactRateValue: {
    color:      colors.navy,
    fontSize:   14,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  compactRateChange: {
    fontSize:   10,
    fontWeight: '600',
  },
});
