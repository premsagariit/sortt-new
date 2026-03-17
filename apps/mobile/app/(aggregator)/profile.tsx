import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SealCheck, CaretRight, SignOut, Trash, ArrowsLeftRight, CheckCircle, CurrencyInr, ChartBar, MapPin, Clock, IdentificationCard, User, Bell, Globe, Question, ShieldCheck, Star } from 'phosphor-react-native';
import { SorttLogo } from '../../components/ui/SorttLogo';

import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { Avatar } from '../../components/ui/Avatar';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useAggregatorStore } from '../../store/aggregatorStore';
import { useNotificationStore } from '../../store/notificationStore';

const { width } = Dimensions.get('window');
const AVATAR_SOURCE = require('../../assets/avatar_placeholder.png');

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
  isDestructive?: boolean;
  hasVerifiedBadge?: boolean;
  hasUnread?: boolean;
  unreadCount?: number;
}

function MenuItem({ icon, title, subtitle, onPress, isLast, isDestructive, hasVerifiedBadge, hasUnread, unreadCount }: MenuItemProps) {
  return (
    <Pressable
      style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, isDestructive && { backgroundColor: 'rgba(192, 57, 43, 0.1)' }]}>
        {typeof icon === 'string' ? (
          <Text style={[styles.menuIconEmoji, isDestructive && { color: colors.red }] as any}>{icon}</Text>
        ) : (
          icon
        )}
        {hasUnread && <View style={styles.dotBadge} />}
      </View>
      <View style={styles.menuTextContent}>
        <View style={styles.menuTitleRow}>
          <Text variant="body" style={[styles.menuTitle, isDestructive && { color: colors.red }] as any}>{title}</Text>
          {hasVerifiedBadge && (
            <View style={styles.verifiedBadgeMini}>
              <SealCheck size={14} color={colors.teal} weight="fill" />
            </View>
          )}
        </View>
        {subtitle && <Text variant="caption" color={colors.muted} style={styles.menuSubtitle as any}>{subtitle}</Text>}
      </View>
      {hasUnread && !!unreadCount && (
        <View style={styles.countBadge}>
          <Text variant="caption" style={styles.countText as any}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
      <CaretRight size={18} color={isDestructive ? colors.red : colors.border} weight="bold" />
    </Pressable>
  );
}

export default function AggregatorProfileScreen() {
  const router = useRouter();
  const authStore = useAuthStore();
  const { fetchMe, name, locality } = authStore;
  const {
    fetchAggregatorProfile,
    fetchAggregatorOrders,
    profile,
    weeklySchedule,
    operatingAreas,
    aggOrders,
  } = useAggregatorStore();
  const [heroHeight, setHeroHeight] = useState(300);
  const unreadNotificationsCount = useNotificationStore(s => s.unreadCount);

  React.useEffect(() => {
    fetchMe();
    void fetchAggregatorProfile();
    void fetchAggregatorOrders(true);
  }, [fetchMe, fetchAggregatorProfile, fetchAggregatorOrders]);

  const displayName = profile?.businessName || name || 'Aggregator';
  const displayLocality = profile?.operatingArea || locality || 'Unknown Area';

  const completedOrders = (aggOrders || []).filter((o: any) => o.status === 'completed').length;
  const cancelledOrders = (aggOrders || []).filter((o: any) => o.status === 'cancelled').length;
  const ratings = (aggOrders || []).map((o: any) => Number(o.rating)).filter((r: number) => Number.isFinite(r) && r > 0);
  const avgRating = ratings.length > 0 ? (ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length).toFixed(1) : '0.0';
  const completionRate = completedOrders + cancelledOrders > 0
    ? `${Math.round((completedOrders / (completedOrders + cancelledOrders)) * 100)}%`
    : '0%';

  const openDays = (weeklySchedule || []).filter((d) => d.isOpen).length;
  const hoursSubtitle = openDays > 0 ? `${openDays} days configured` : 'Schedule not set';
  const areasSubtitle = operatingAreas.length > 0 ? `${operatingAreas.length} areas active` : 'No areas configured';
  const kycSubtitle = profile?.kycStatus ? `Status: ${profile.kycStatus}` : 'KYC status unavailable';

  const scrollY = useRef(new Animated.Value(0)).current;

  // Header Animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, heroHeight - 120],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const compactOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 140, heroHeight - 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, heroHeight - 100],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  const handleSignOut = async () => {
    authStore.signOut();
    router.replace('/(auth)/user-type' as any);
  };

  const handleSwitchUserType = async () => {
    // Development only switch
    router.replace('/(seller)/home' as any);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Floating Header (Hero) */}
      <Animated.View
        onLayout={(e) => setHeroHeight(e.nativeEvent.layout.height)}
        style={[
          styles.heroHeaderContainer,
          { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }
        ]}
      >
        <SafeAreaView edges={['top']} style={styles.heroSafeWrapper}>
          <View style={styles.geometricShape1} pointerEvents="none" />
          <View style={styles.geometricShape2} pointerEvents="none" />

          <View style={styles.logoWrap}>
            <SorttLogo variant="compact-dark" />
          </View>

          <View style={styles.hero}>
            <View style={styles.avatarWrap}>
              <Avatar
                name={displayName}
                userType="aggregator"
                size="xl"
                source={AVATAR_SOURCE}
              />
            </View>

            <View style={styles.nameRow}>
              <Text
                variant="heading"
                style={styles.heroName}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {displayName}
              </Text>
              <CheckCircle size={24} color={colors.teal} weight="fill" />
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.localityPill}>
                <View style={styles.localityDot} />
                <Text variant="caption" style={styles.localityText}>{displayLocality}</Text>
              </View>
            </View>

            {/* Injected Stats Bar - Unified style */}
            <View style={styles.heroStatsContainer}>
              <View style={styles.statBox}>
                <Text variant="caption" style={styles.statLabelHero}>Pickups</Text>
                <Numeric size={20} color={colors.surface}>
                  {completedOrders}
                </Numeric>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text variant="caption" style={styles.statLabelHero}>Rating</Text>
                <View style={styles.ratingBox}>
                  <Star size={16} color="#FFD700" weight="fill" />
                  <Numeric size={20} color={colors.surface}>{avgRating}</Numeric>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text variant="caption" style={styles.statLabelHero}>Completion</Text>
                <Numeric size={20} color={colors.surface}>{completionRate}</Numeric>
              </View>
            </View>

          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Compact Header (Visible on Scroll) */}
      <Animated.View style={[styles.compactHeader, { opacity: compactOpacity }]} pointerEvents="none">
        <SafeAreaView edges={['top']}>
          <View style={styles.compactContent}>
            <Avatar name={displayName} userType="aggregator" size="sm" source={AVATAR_SOURCE} />
            <View style={styles.compactTextWrap}>
              <Text variant="body" style={styles.compactName as any}>{displayName}</Text>
              <View style={styles.compactVerified}>
                <SealCheck size={12} color={colors.teal} weight="fill" />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: heroHeight }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.menuGroup}>
          <MenuItem
            icon={<CurrencyInr size={22} color={colors.navy} />} title="My Buy Rates" subtitle="Update per-material buying prices"
            onPress={() => router.push('/(aggregator)/profile/buy-rates')}
          />
          <MenuItem
            icon={<ChartBar size={22} color={colors.navy} />} title="Order History & Summary" subtitle="View all completed pickups"
            onPress={() => router.push('/(aggregator)/profile/order-summary')}
          />
          <MenuItem
            icon={<MapPin size={22} color={colors.navy} />} title="Operating Areas" subtitle={areasSubtitle}
            onPress={() => router.push('/(aggregator)/profile/operating-areas')}
          />
          <MenuItem
            icon={<Clock size={22} color={colors.navy} />} title="Hours & Availability" subtitle={hoursSubtitle}
            onPress={() => router.push('/(aggregator)/profile/hours-availability')}
          />
          <MenuItem
            icon={<IdentificationCard size={22} color={colors.navy} />} title="KYC Documents" subtitle={kycSubtitle}
            onPress={() => router.push('/(aggregator)/profile/kyc-documents')}
            hasVerifiedBadge={profile?.kycStatus === 'verified'}
          />
          <MenuItem
            icon={<User size={22} color={colors.navy} />} title="Account Settings" subtitle="Personal & secure login"
            onPress={() => router.push('/(aggregator)/settings')}
          />

          <MenuItem
            icon={<Bell size={22} color={colors.navy} />} title="Notifications" subtitle="Alerts & updates"
            onPress={() => router.push('/(shared)/notifications')}
            hasUnread={unreadNotificationsCount > 0}
            unreadCount={unreadNotificationsCount}
          />
          <MenuItem
            icon={<Globe size={22} color={colors.navy} />} title="Language" subtitle="English"
            onPress={() => router.push('/(shared)/language')}
          />
          <MenuItem
            icon={<Question size={22} color={colors.navy} />} title="Help Center" subtitle="FAQs & support"
            onPress={() => router.push('/(shared)/help' as any)}
          />
          <MenuItem
            isLast icon={<ShieldCheck size={22} color={colors.navy} />} title="Terms & Privacy" subtitle="Legal information"
            onPress={() => router.push('/(shared)/terms-privacy' as any)}
          />
        </View>

        <View style={styles.logoutContainer}>
          <PrimaryButton
            label="Log Out"
            onPress={handleSignOut}
          />
        </View>

        <View style={styles.devContainer}>
          <SecondaryButton
            label="Dev Toggle: Switch to Seller View"
            color="navy"
            onPress={handleSwitchUserType}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="caption" color={colors.muted}>Sortt v1.0.0 (42)</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  heroHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  heroSafeWrapper: {
    backgroundColor: colors.navy,
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
  logoWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    alignItems: 'flex-start',
  },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,



    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  heroName: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,

  },
  localityPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  localityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusOnline,
  },
  localityText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  heroStatsContainer: {

    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabelHero: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starTextMini: {
    color: '#FFD700',
    fontSize: 14,
  },

  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 110,
    backgroundColor: colors.navy,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 60,
    gap: spacing.sm,
  },
  compactTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactName: {
    color: colors.surface,
    fontWeight: '700',
  },
  compactVerified: {
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,

    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 76,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colorExtended.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIconEmoji: {
    fontSize: 20,
  },
  menuTextContent: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuTitle: {
    fontWeight: '600',
    color: colors.navy,
  },
  menuSubtitle: {
    marginTop: 2,
  },
  verifiedBadgeMini: {
    marginTop: 1,
  },
  logoutContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  devContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  dotBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colorExtended.surface2,
  },
  countBadge: {
    backgroundColor: colors.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: spacing.sm,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
  },
});
