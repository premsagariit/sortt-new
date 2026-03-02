import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowsCounterClockwise, CurrencyInr, Camera, ChartLineUp } from 'phosphor-react-native';
import { StatusBar } from 'expo-status-bar';

import { Text } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { colors, colorExtended, spacing } from '../../constants/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Get the best price for your scrap',
    description: 'See live rates in your area. Compare aggregator prices and earn more from every pickup — no guesswork.',
    icon: CurrencyInr,
    circleStyle: { right: -40, bottom: -40, width: 200, height: 200 },
  },
  {
    id: '2',
    title: 'AI evaluates your scrap instantly',
    description: 'Snap a photo. Our AI identifies materials, estimates weight, and gives you an instant quote — before any aggregator arrives.',
    icon: Camera,
    circleStyle: { left: -40, top: -40, width: 180, height: 180 },
  },
  {
    id: '3',
    title: 'Pickup at your doorstep',
    description: 'Verified aggregators near you come to you. Track in real time, confirm with OTP, get paid on the spot.',
    icon: ArrowsCounterClockwise,
    circleStyle: { left: -60, bottom: -60, width: 200, height: 200 },
  },
  {
    id: '4',
    title: 'Every rupee tracked. Every pickup recorded.',
    description: 'Verified reports and digital records for every transaction. Digital transparency at every step.',
    icon: ChartLineUp,
    circleStyle: { right: -40, bottom: -40, width: 200, height: 200 },
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // ── Block hardware back ────────────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      // Return true to consume the event (block back navigation)
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false } // Required for Layout animations like width
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      router.replace('/(auth)/user-type');
    }
  };

  const renderItem = ({ item }: { item: typeof ONBOARDING_DATA[0] }) => {
    const Icon = item.icon;
    return (
      <View style={styles.slide}>
        {/* Top Visual Area */}
        <View style={styles.visualContainer}>
          <View style={styles.iconWrap}>
            <Icon size={44} color={colors.surface} weight="fill" />
          </View>
          <View style={[styles.splashCircle, item.circleStyle]} />
        </View>

        {/* Bottom Content Area */}
        <View style={styles.contentArea}>
          <Text variant="heading" style={styles.title}>{item.title}</Text>
          <Text variant="body" style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
      />

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        {/* Dots Container */}
        <View style={styles.dotContainer}>
          {ONBOARDING_DATA.map((_, i) => {
            const inputRange = [
              (i - 1) * SCREEN_WIDTH,
              i * SCREEN_WIDTH,
              (i + 1) * SCREEN_WIDTH,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });

            // Color logic for done state (Correction 2)
            // If dot index < current index (swipe passed it), use Teal
            // If dot index == current index, use Red
            // If dot index > current index (future), use Border color
            const isDone = i < currentIndex;
            const isActive = i === currentIndex;
            
            const dotColor = isActive 
              ? colors.red 
              : isDone 
                ? colors.teal 
                : colors.border;

            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: dotColor,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.actionArea}>
          <PrimaryButton
            label={currentIndex === ONBOARDING_DATA.length - 1 ? "Get Started" : "Next"}
            onPress={handleNext}
          />

          {/* Language Switcher on Slide 4 */}
          {currentIndex === ONBOARDING_DATA.length - 1 && (
            <View style={styles.languageContainer}>
              <Text variant="caption" color={colors.muted}>Language:</Text>
              <View style={[styles.langChip, styles.langChipActive]}>
                <Text variant="label" style={{ color: colors.surface }}>English</Text>
              </View>
              <View style={styles.langChip}>
                <Text variant="label" color={colors.slate}>తెలుగు</Text>
              </View>
            </View>
          )}

          {currentIndex < ONBOARDING_DATA.length - 1 && (
            <TouchableOpacity 
              onPress={() => router.replace('/(auth)/user-type')}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  visualContainer: {
    flex: 1.3,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  iconWrap: {
    width: 90,
    height: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  splashCircle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy,
    lineHeight: 28,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: colors.slate,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: colors.bg,
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actionArea: {
    gap: 12,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  langChipActive: {
    borderColor: colors.navy,
    backgroundColor: colors.navy,
  },
});

