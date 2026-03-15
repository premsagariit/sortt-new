import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Animated, ActivityIndicator, Pressable } from 'react-native';
import { Bell, MapPin } from 'phosphor-react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../../constants/tokens';
import { APP_NAME } from '../../constants/app';
import { Text } from './Typography';
import { PrimaryButton, IconButton } from './Button';
import { SorttLogo } from './SorttLogo';
import { Avatar } from './Avatar';
import { useAuthStore } from '../../store/authStore';
import { useAggregatorStore } from '../../store/aggregatorStore';

interface NetworkErrorScreenProps {
  onRetry: () => void;
  isRetrying?: boolean;
  role?: 'seller' | 'aggregator';
}

const RETRY_DELAY_SEC = 10;

export function NetworkErrorScreen({
  onRetry,
  isRetrying = false,
  role,
}: NetworkErrorScreenProps) {
  const insets = useSafeAreaInsets();
  const [timeLeft, setTimeLeft] = useState(RETRY_DELAY_SEC);
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const userType = useAuthStore((s) => s.userType);
  const displayName = useAuthStore((s) => s.name) || APP_NAME;
  const sellerLocality = useAuthStore((s) => s.locality) || 'Your area';
  const sellerCity = useAuthStore((s) => s.city) || 'Your city';
  const aggregatorBusinessName = useAggregatorStore((s) => s.businessName) || displayName;
  const aggregatorArea = useAggregatorStore((s) => s.primaryArea) || 'Your area';
  const resolvedRole: 'seller' | 'aggregator' = role ?? (userType === 'aggregator' ? 'aggregator' : 'seller');
  const avatarUserType = resolvedRole;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

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

  const triggerRetry = useCallback(() => {
    setTimeLeft(RETRY_DELAY_SEC);
    onRetry();
  }, [onRetry]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    return () => {
      opacity.stopAnimation();
    };
  }, [opacity]);

  useEffect(() => {
    if (isRetrying) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isRetrying]);

  useEffect(() => {
    if (timeLeft !== 0 || isRetrying) {
      return;
    }

    triggerRetry();
  }, [timeLeft, isRetrying, triggerRetry]);

  const isAggregator = resolvedRole === 'aggregator';
  const heroName = isAggregator ? aggregatorBusinessName : displayName;
  const heroLocation = isAggregator ? aggregatorArea : `${sellerCity} · ${sellerLocality}`;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <StatusBar style="light" backgroundColor={colors.red} />

      <View style={styles.heroBackdrop} />

      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}> 
        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]} pointerEvents="none">
          <View style={styles.headerContent}>
            <View style={styles.brandWrap}>
              <SorttLogo variant="compact-dark" />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: minimizedOpacity, transform: [{ translateY: minimizedTranslateY }] }]} pointerEvents="none">
          <View style={styles.compressedRow}>
            <View style={styles.navLeft}>
              <Text variant="subheading" style={styles.headerTitle}>{heroName}</Text>
              <View style={styles.navMinimizedLoc}>
                <MapPin size={10} color={colors.surface} />
                <Text variant="caption" style={styles.navMinimizedLocText}>{isAggregator ? aggregatorArea.split(',')[0]?.trim() || aggregatorArea : sellerLocality}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={[styles.headerActions, { top: insets.top }]}> 
          <View style={styles.disabledAction}>
            <IconButton
              icon={<Bell size={22} color={colors.surface} />}
              onPress={triggerRetry}
              accessibilityLabel="Retry network check"
            />
          </View>
          <Pressable onPress={triggerRetry} hitSlop={8} style={styles.disabledAction}>
            <Avatar name={heroName} userType={avatarUserType} size="sm" />
          </Pressable>
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.geometricShape1} pointerEvents="none" />
          <View style={styles.geometricShape2} pointerEvents="none" />

          <Animated.View style={{ opacity: greetingOpacity }}>
            <View style={styles.heroTopRow}>
              <View>
                <Text variant="caption" style={styles.heroGreeting}>{greeting}</Text>
                <Text variant="heading" style={styles.heroName}>{heroName}</Text>
              </View>
              {isAggregator && (
                <View style={styles.statusPill}>
                  <View style={[styles.statusDot, { backgroundColor: colors.muted }]} />
                  <Text variant="caption" style={styles.statusText}>Offline</Text>
                </View>
              )}
            </View>

            <View style={styles.locationPill}>
              <View style={[styles.locationDot, { backgroundColor: colors.surface }]} />
              <Text variant="caption" style={styles.locationText}>{heroLocation}</Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.contentWrap}>
          <OfflineIllustration />

          <Text variant="heading" style={styles.title}>
            No internet connection
          </Text>

          <Text variant="body" style={styles.message}>
            You're offline. Check your Wi-Fi or mobile data and tap Retry.
          </Text>

          <View style={styles.retryState}>
            <ActivityIndicator size="small" color={colors.red} />
            <Text variant="caption" style={styles.retryText}>
              {isRetrying ? 'Retrying now...' : `Auto-retrying in ${timeLeft}s`}
            </Text>
          </View>

          <View style={styles.retryButtonWrap}>
            <PrimaryButton
              label="Retry now"
              onPress={triggerRetry}
              disabled={isRetrying}
            />
          </View>

          <Text variant="caption" style={styles.hintText}>
            Navigation unavailable while offline
          </Text>
        </View>
      </Animated.ScrollView>
    </Animated.View>
  );
}

function OfflineIllustration() {
  return (
    <View style={styles.illustrationWrap}>
      <Svg width={90} height={110} viewBox="0 0 90 110" fill="none">
        <Rect x="20" y="10" width="50" height="80" rx="10" fill={colors.bg} stroke={colors.border} strokeWidth="2" />
        <Rect x="27" y="18" width="36" height="55" rx="6" fill={colors.surface} />
        <Circle cx="45" cy="80" r="4" fill={colors.border} />

        <Path d="M33 49C38 44.5 52 44.5 57 49" stroke={colors.border} strokeWidth="3" strokeLinecap="round" />
        <Path d="M37 55C40.5 52.5 49.5 52.5 53 55" stroke={colors.border} strokeWidth="3" strokeLinecap="round" />
        <Circle cx="45" cy="60" r="2.5" fill={colors.border} />

        <Circle cx="63" cy="24" r="11" fill={colors.redLight} stroke={colors.red} strokeWidth="1.5" />
        <Path d="M58.5 19.5L67.5 28.5" stroke={colors.red} strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M67.5 19.5L58.5 28.5" stroke={colors.red} strokeWidth="2.5" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: colors.red,
  },
  header: {
    backgroundColor: colors.red,
    width: '100%',
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  compressedRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.surface,
    fontWeight: '700',
  },
  headerActions: {
    position: 'absolute',
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 56,
  },
  disabledAction: {
    opacity: 0.45,
  },
  navMinimizedLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  navMinimizedLocText: {
    color: colors.surface,
  },
  scrollContent: {
    width: '100%',
    paddingBottom: spacing.xl,
    backgroundColor: colors.bg,
  },
  hero: {
    backgroundColor: colors.red,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroGreeting: {
    color: colors.whiteAlpha70,
  },
  heroName: {
    color: colors.surface,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    opacity: 0.9,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: colors.muted,
    fontWeight: '600',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationText: {
    color: colors.surface,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  illustrationWrap: {
    marginBottom: spacing.xl,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
    color: colors.navy,
  },
  message: {
    textAlign: 'center',
    color: colors.slate,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  retryState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  retryText: {
    color: colors.slate,
    fontWeight: '600',
  },
  retryButtonWrap: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  hintText: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 'auto',
  },
});
