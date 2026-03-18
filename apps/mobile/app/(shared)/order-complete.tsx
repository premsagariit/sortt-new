import LottieView from 'lottie-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { useOrderStore } from '../../store/orderStore';
import {
  Animated,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/tokens';
import { APP_NAME } from '../../constants/app';

const AUTO_DISMISS_MS = 5000;

export default function OrderCompleteScreen() {
  const { orderId, amount, fallback } = useLocalSearchParams<{
    orderId: string;
    amount: string;
    fallback?: string; // where to go after dismiss — caller decides
  }>();

  // Animated values
  const cardScale   = useRef(new Animated.Value(0.72)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const lottieRef   = useRef<LottieView>(null);

  // Fetch fresh confirmed data from store
  const orders = useOrderStore((s) => s.orders);
  const fetchOrder = useOrderStore((s) => s.fetchOrder);
  const storeOrder = orders.find((o) => o.orderId === orderId);

  useEffect(() => {
    if (orderId) { void fetchOrder(orderId, true); }
  }, [orderId, fetchOrder]);

  // Resolve the final confirmed amount — prefer store data over the passed param
  const confirmedAmount = useMemo(() => {
    if (storeOrder) {
      if (typeof storeOrder.confirmedTotal === 'number' && storeOrder.confirmedTotal > 0) return storeOrder.confirmedTotal;
      if (typeof storeOrder.confirmedAmount === 'number' && storeOrder.confirmedAmount > 0) return storeOrder.confirmedAmount;
      if (typeof storeOrder.displayAmount === 'number' && storeOrder.displayAmount > 0) return storeOrder.displayAmount;
      if (Array.isArray(storeOrder.orderItems) && storeOrder.orderItems.length > 0) {
        const fromItems = storeOrder.orderItems.reduce((sum, item) => {
          return sum + Number(item.confirmedWeightKg ?? item.estimatedWeightKg ?? 0) * Number(item.ratePerKg ?? 0);
        }, 0);
        if (fromItems > 0) return fromItems;
      }
    }
    return parseFloat(amount || '0') || 0;
  }, [storeOrder, amount]);

  // Format amount: "₹ 1,240.00"
  const formattedAmount = confirmedAmount > 0
    ? `₹ ${confirmedAmount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '₹ —';

  // Truncate order ID for display: "ORD-…3F2A"
  const displayOrderId = orderId
    ? orderId.length > 8
      ? `${orderId.slice(0, 4)}…${orderId.slice(-4).toUpperCase()}`
      : orderId.toUpperCase()
    : '—';

  useEffect(() => {
    // Play Lottie immediately
    lottieRef.current?.play();

    // Card pop-in: delay 150ms so Lottie starts first
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 160,
          mass: 0.8,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Labels fade in after card lands
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(labelOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    const destination = fallback ?? '/(seller)/orders';
    router.replace(destination as any);
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.teal}
        translucent={false}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* ── Lottie fills upper ~55% of the screen ── */}
        <View style={styles.lottieWrapper}>
          <LottieView
            ref={lottieRef}
            source={require('../../assets/animations/order-success.json')}
            autoPlay={false}
            loop={false}
            style={styles.lottie}
            resizeMode="contain"
          />
        </View>

        {/* ── Info card ── */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* Success badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Order Complete</Text>
          </View>

          <Animated.View style={{ opacity: labelOpacity }}>
            {/* Amount — largest text on the card */}
            <Text style={styles.amount}>{formattedAmount}</Text>

            <View style={styles.divider} />

            {/* Order ID */}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Order ID</Text>
              <Text style={styles.rowValue}>{displayOrderId}</Text>
            </View>

            {/* App name thank-you line */}
            <Text style={styles.thankYou}>
              Thank you for using {APP_NAME}!{'\n'}
              Payment receipt will be sent to your WhatsApp.
            </Text>
          </Animated.View>
        </Animated.View>

        {/* ── Tap-to-dismiss hint ── */}
        <Animated.Text
          style={[styles.dismissHint, { opacity: labelOpacity }]}
          onPress={dismiss}
          suppressHighlighting
        >
          Tap anywhere to continue
        </Animated.Text>

      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles — ZERO hardcoded hex, all from tokens
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.teal,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Lottie
  lottieWrapper: {
    width: 240,
    height: 240,
    marginBottom: spacing.lg,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.card + 4, // 16 — slightly more generous for celebration feel
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    // No shadow — MEMORY §2 "zero shadows"
  },

  // Badge
  badge: {
    backgroundColor: colors.teal,
    borderRadius: radius.chip,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontFamily: 'DM_Sans',
    fontSize: 13,
    fontWeight: '600',
    color: colors.surface,
    letterSpacing: 0.4,
  },

  // Amount
  amount: {
    fontFamily: 'DM_Mono',
    fontSize: 36,
    fontWeight: '500',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // Divider
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },

  // Order ID row
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.md,
  },
  rowLabel: {
    fontFamily: 'DM_Sans',
    fontSize: 14,
    color: colors.muted,
  },
  rowValue: {
    fontFamily: 'DM_Mono',
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate,
    letterSpacing: 0.5,
  },

  // Thank you text
  thankYou: {
    fontFamily: 'DM_Sans',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Dismiss hint
  dismissHint: {
    fontFamily: 'DM_Sans',
    fontSize: 13,
    color: `${colors.surface}99`, // surface at ~60% opacity — readable on teal
    marginTop: spacing.xl,
    letterSpacing: 0.3,
  },
});