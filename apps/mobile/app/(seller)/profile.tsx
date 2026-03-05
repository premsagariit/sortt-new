import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { Avatar } from '../../components/ui/Avatar';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { SorttLogo } from '../../components/ui/SorttLogo';

// Mock data directly in component file per requirements
const AVATAR_SOURCE = require('../../assets/avatar_placeholder.png');

const INDIVIDUAL_DATA = {
  name: 'Ravi Kumar',
  earned: 12450,
  orders: 23,
  rating: 4.8,
  location: 'Kondapur, Hyderabad',
  phone: '+91 98765 ••••••',
  invoices: '4 GST invoices',
  language: 'Telugu · English',
  since: 'January 2026',
};

const BUSINESS_DATA = {
  name: 'Apollo Enterprises',
  earned: 89400,
  orders: 142,
  rating: 4.9,
  location: 'Jubilee Hills, Hyderabad',
  phone: '+91 99999 ••••••',
  invoices: '12 ready to download',
  language: 'English',
  since: 'Jan 2023',
  gstin: '22AAAAA0000A1Z5',
  tradeLicense: 'HYD/TL/2023/8492'
};

interface InfoRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  rowKey: string;
  onPress?: () => void;
  isLast?: boolean;
}

function InfoRow({ icon, title, subtitle, rowKey, onPress, isLast }: InfoRowProps) {
  return (
    <Pressable
      style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress || (() => console.log(`Profile row pressed: ${rowKey}`))}
    >
      <View style={styles.menuIconWrap}>
        <Text style={styles.menuIcon as any}>{icon}</Text>
      </View>
      <View style={styles.menuTextContent}>
        <Text variant="body" style={styles.menuTitle as any}>{title}</Text>
        {subtitle && <Text variant="caption" color={colors.muted} style={styles.menuSubtitle as any}>{subtitle}</Text>}
      </View>
      <Text variant="body" color={colors.border}>›</Text>
    </Pressable>
  );
}

export default function SellerProfileScreen() {
  const router = useRouter();
  const authStore = useAuthStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isBusinessMode, setIsBusinessMode] = useState(false);

  const [heroHeight, setHeroHeight] = useState(300);


  // Do NOT replace this with a hardcoded measured value.

  const scrollY = useRef(new Animated.Value(0)).current;
  const userType = authStore.session?.userType || 'seller';
  const profileData = isBusinessMode ? BUSINESS_DATA : INDIVIDUAL_DATA;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, heroHeight - 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const compactOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 100, heroHeight - 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, heroHeight - 60],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  async function handleSignOut() {
    setIsSigningOut(true);
    await new Promise(r => setTimeout(r, 500));
    authStore.signOut();
    router.replace('/(auth)/user-type' as any);
  }

  function handleToggleRole() {
    router.replace('/(aggregator)/home');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 
        Floating Header - Absolute positioned at top
      */}
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
            <View style={styles.avatarBorder}>
              <Avatar
                name={profileData.name}
                userType="seller"
                size="xl"
                source={AVATAR_SOURCE}
              />
            </View>
            <Text
              variant="heading"
              style={styles.heroName}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {profileData.name}
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.localityPill}>
                <Text variant="caption" style={styles.localityText}>
                  📍 {profileData.location}
                </Text>
              </View>
            </View>




            {/* Injected Stats Bar */}
            <View style={styles.heroStatsContainer}>
              <View style={styles.statBox}>
                <Text variant="caption" style={styles.statLabelHero}>Total earned</Text>
                <Numeric size={20} color={colors.surface}>
                  ₹{profileData.earned.toLocaleString('en-IN')}
                </Numeric>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text variant="caption" style={styles.statLabelHero}>Pickups</Text>
                <Numeric size={20} color={colors.surface}>
                  {profileData.orders}
                </Numeric>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* 
        Compact Header - Fades in on scroll
      */}
      <Animated.View style={[styles.compactHeader, { opacity: compactOpacity }]} pointerEvents="none">
        <SafeAreaView edges={['top']}>
          <View style={styles.compactContent}>
            <View style={styles.compactAvatar}>
              <Avatar
                name={profileData.name}
                userType="seller"
                size="sm"
                source={AVATAR_SOURCE}
              />
            </View>
            <View style={styles.compactTextWrap}>
              <Text variant="body" style={styles.compactName as any}>{profileData.name}</Text>
              <View style={styles.compactPill}>
                <View style={[styles.badgeDot, { backgroundColor: userType === 'seller' ? colors.teal : colors.amber }]} />
                <Text variant="caption" style={styles.compactPillText}>
                  {userType.toUpperCase()}
                </Text>
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


        <View style={styles.menuContainer}>
          <InfoRow
            rowKey="listings" icon="📋" title="My Listings" subtitle="Active and past requests"
            onPress={() => router.push({ pathname: '/(seller)/orders', params: { tab: 'All' } })}
          />
          <InfoRow
            rowKey="earnings" icon="💰" title="Earnings Summary" subtitle="Payouts and history"
            onPress={() => router.push('/(seller)/earnings')}
          />
          <InfoRow
            rowKey="settings" icon="⚙️" title="Account Settings" subtitle="Preferences & privacy" onPress={() => router.push('/(seller)/settings')}
          />
          {isBusinessMode && (
            <InfoRow
              rowKey="gstin" icon="🧾" title="GSTIN Details" subtitle={BUSINESS_DATA.gstin}
              onPress={() => console.log('GSTIN Details')}
            />
          )}
          <InfoRow
            rowKey="notifications" icon="🔔" title="Notifications" subtitle="Alerts & updates" onPress={() => router.push('/(shared)/notifications')}
          />
          <InfoRow
            rowKey="language" icon="🌐" title="Language" subtitle={profileData.language}
            onPress={() => router.push('/(shared)/language')}
          />
          <InfoRow
            rowKey="help" icon="❓" title="Help & Support" subtitle="FAQs & contact" onPress={() => router.push('/(shared)/help')}
          />
          <InfoRow
            rowKey="terms" icon="🛡️" title="Terms & Privacy" subtitle="Legal information" isLast
            onPress={() => router.push('/(shared)/terms-privacy')}
          />
        </View>

        <View style={styles.versionContainer}>
          <Text variant="caption" color={colors.muted}>Sortt Version 1.0.0 (Build 42)</Text>
        </View>

        <View style={styles.logoutContainer}>
          <PrimaryButton
            label="Log Out"
            onPress={handleSignOut}
          />
        </View>

        {__DEV__ && (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm, marginTop: spacing.xl }}>
            <SecondaryButton
              label={isBusinessMode ? "Dev Toggle: Switch to Individual" : "Dev Toggle: Switch to Business"}
              color="navy"
              onPress={() => setIsBusinessMode(!isBusinessMode)}
            />
            <SecondaryButton
              label="Dev Toggle: Aggregator View"
              color="navy"
              onPress={handleToggleRole}
            />
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  heroHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  hero: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,



    alignItems: 'center',
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 64,
    marginBottom: spacing.sm,
  },
  heroName: {
    color: colors.surface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    alignSelf: 'center',
    alignItems: 'center',
  },


  localityPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  localityText: {
    color: colors.surface,
    fontSize: 12,
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
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
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
    height: 56,
    gap: spacing.sm,
  },
  compactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  compactTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactName: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  compactPillText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,

  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 64,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colorExtended.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuTextContent: {
    flex: 1,
  },
  menuTitle: {
    fontWeight: '600',
    color: colors.navy,
  },
  menuSubtitle: {
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logoutContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
});
