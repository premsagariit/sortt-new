/**
 * app/(shared)/order/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Order Detail screen — shared between seller and aggregator contexts.
 *
 * V25: Two-phase address reveal enforced.
 *   Pre-acceptance (status='created'):  pickupLocality shown only.
 *   Post-acceptance (all other statuses): pickupAddress shown.
 *   The string `pickupAddress` never reaches the JSX tree for
 *   pre-acceptance orders.
 *
 * Navigation:
 *   - Linked from (seller)/orders.tsx OrderCard onPress
 *   - Back button: router.back()
 *
 * Mock data only. No Supabase.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Package, ChatCircle, ArrowRight } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, colorExtended, spacing, radius } from '../../../constants/tokens';
import { Text } from '../../../components/ui/Typography';
import { Numeric } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Avatar } from '../../../components/ui/Avatar';
import { PrimaryButton } from '../../../components/ui/Button';
import { SecondaryButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useAuthStore } from '../../../store/authStore';
import { useOrderStore } from '../../../store/orderStore';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { CancelOrderModal } from '../../../components/domain/CancelOrderModal';
import type { OrderStatus } from '../../../components/ui/StatusChip';
import { MapPin, Phone, CheckCircle, CaretRight, Star, CurrencyInr, Nut, Jar, FileText, Laptop, Dress, Martini, ChatCircleDots } from 'phosphor-react-native';
import { safeBack } from '../../../utils/navigation';

// ── Mock data ──────────────────────────────────────────────────────
type StatusHistoryEntry = {
  status: string;
  time: string | null;
  done: boolean;
  active?: boolean;
};

type OrderMock = {
  orderId: string;
  status: OrderStatus;
  materials: string[];
  estimatedAmount: number;
  date: string;
  pickupLocality: string;
  pickupAddress: string;
  aggregatorId?: string | null;
  aggregator: {
    name: string;
    initials: string;
    rating: number;
    completedOrders: number;
    phoneLast4: string;
  } | null;
  statusHistory: StatusHistoryEntry[];
  seller?: {
    name: string;
    rating: number;
    phoneLast4: string;
  };
};

const MOCK_ORDER_DETAIL: Record<string, OrderMock> = {
  'ORD-2841': {
    orderId: 'ORD-2841',
    status: 'en_route',
    materials: ['paper', 'metal'],
    estimatedAmount: 380,
    date: 'Today, 11:02 AM',
    pickupLocality: 'Madhapur, 3rd Phase',
    pickupAddress: '12/4, Sai Towers, Madhapur',
    aggregator: {
      name: 'Suresh Metals & More',
      initials: 'SM',
      rating: 4.7,
      completedOrders: 234,
      phoneLast4: '4521',
    },
    statusHistory: [
      { status: 'created', time: 'Today, 10:30 AM', done: true },
      { status: 'accepted', time: 'Today, 10:34 AM', done: true },
      { status: 'en_route', time: 'Today, 11:02 AM', done: false, active: true },
      { status: 'arrived', time: null, done: false },
      { status: 'completed', time: null, done: false },
    ],
  },
  'ORD-2790': {
    orderId: 'ORD-2790',
    status: 'completed',
    materials: ['ewaste'],
    estimatedAmount: 990,
    date: '22 Feb 2026',
    pickupLocality: 'Gachibowli, DLF',
    pickupAddress: '7B, DLF Cyber City, Gachibowli',
    aggregator: {
      name: 'Raju Scrap Works',
      initials: 'RS',
      rating: 4.4,
      completedOrders: 187,
      phoneLast4: '8833',
    },
    statusHistory: [
      { status: 'created', time: '22 Feb, 9:00 AM', done: true },
      { status: 'accepted', time: '22 Feb, 9:05 AM', done: true },
      { status: 'en_route', time: '22 Feb, 9:30 AM', done: true },
      { status: 'arrived', time: '22 Feb, 9:48 AM', done: true },
      { status: 'completed', time: '22 Feb, 10:15 AM', done: true },
    ],
  },
  // ORD-1001: status='created' — used for V25 pre-acceptance testing only
  'ORD-1001': {
    orderId: 'ORD-1001',
    status: 'created',
    materials: ['paper'],
    estimatedAmount: 120,
    date: 'Today, 1:30 PM',
    pickupLocality: 'Kondapur, Sai Nagar',
    pickupAddress: '55, Sai Nagar Colony, Kondapur', // NEVER shown per V25 (status=created)
    aggregatorId: null,
    aggregator: null,
    statusHistory: [
      { status: 'created', time: 'Today, 1:30 PM', done: false, active: true },
      { status: 'accepted', time: null, done: false },
      { status: 'en_route', time: null, done: false },
      { status: 'arrived', time: null, done: false },
      { status: 'completed', time: null, done: false },
    ],
    seller: {
      name: 'Pratik Sharma',
      rating: 4.9,
      phoneLast4: '9901',
    },
  },
  'ORD-7777': {
    orderId: 'ORD-7777',
    status: 'arrived',
    materials: ['paper', 'plastic'],
    estimatedAmount: 280,
    date: 'Today, 3:30 PM',
    pickupLocality: 'Kondapur, Hitech City',
    pickupAddress: 'Plot 42, Silicon Valley, Kondapur',
    aggregator: {
      name: 'Suresh Metals & More',
      initials: 'SM',
      rating: 4.7,
      completedOrders: 234,
      phoneLast4: '4521',
    },
    statusHistory: [
      { status: 'created', time: 'Today, 3:00 PM', done: true },
      { status: 'accepted', time: 'Today, 3:05 PM', done: true },
      { status: 'en_route', time: 'Today, 3:20 PM', done: true },
      { status: 'arrived', time: 'Today, 3:30 PM', done: false, active: true },
      { status: 'completed', time: null, done: false },
    ],
    seller: {
      name: 'Ravi Kumar',
      rating: 4.8,
      phoneLast4: '1234',
    },
  },
};

// ── Status labels for timeline ─────────────────────────────────────
const TIMELINE_LABELS: Record<string, string> = {
  created: 'Order Created',
  accepted: 'Aggregator Accepted',
  en_route: 'On the Way · ETA 8 min',
  arrived: 'Arrived at Location',
  completed: 'OTP Confirmed & Completed',
};

// ── Material colour dots ───────────────────────────────────────────
const MATERIAL_COLORS: Record<string, string> = {
  metal: colors.material.metal.fg,
  plastic: colors.material.plastic.fg,
  paper: colors.material.paper.fg,
  ewaste: colors.material.ewaste.fg,
  fabric: colors.material.fabric.fg,
  glass: colors.material.glass.fg,
};

const MATERIAL_BG: Record<string, string> = {
  metal: colors.material.metal.bg,
  plastic: colors.material.plastic.bg,
  paper: colors.material.paper.bg,
  ewaste: colors.material.ewaste.bg,
  fabric: colors.material.fabric.bg,
  glass: colors.material.glass.bg,
};

// ── Component ──────────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userType = useAuthStore((s: any) => s.userType);
  const storeOrders = useOrderStore((s: any) => s.orders);
  const updateStatus = useOrderStore((s: any) => s.updateOrderStatus);

  const mockOrder = id ? MOCK_ORDER_DETAIL[id] : undefined;
  const storeOrder = storeOrders.find((o: any) => o.orderId === id);

  const order = storeOrder ? {
    ...mockOrder,
    orderId: storeOrder.orderId,
    status: storeOrder.status,
    aggregatorId: storeOrder.aggregatorId,
  } : mockOrder;

  // Two-tap cancel: first tap shows sheet, second tap confirms — per PLAN.md §2.6
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <NavBar
          title="Order"
          variant="light"
          onBack={() => safeBack('/')}
        />
        <View style={styles.scroll}>
          <EmptyState
            icon={<Package size={48} color={colors.muted} weight="thin" />}
            heading="Order not found"
            body="This order doesn't exist or may have been removed."
          />
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = order.status === 'completed';
  const isActiveRide = order.status === 'en_route' || order.status === 'arrived';
  const showAggCard = order.status !== 'created' && order.aggregator !== null;

  // V25: full address revealed only post-acceptance
  const displayAddress = order.status === 'created'
    ? order.pickupLocality          // pre-acceptance: locality only
    : order.pickupAddress;          // post-acceptance: full address

  // For Aggregator: can only cancel if accepted but not en-route yet
  // For Seller: can cancel if created or accepted
  const authUserId = useAuthStore((s: any) => s.user?.id || 'user-agg-001'); // fallback for mocking
  const canCancel = userType === 'seller'
    ? (order.status === 'created' || order.status === 'accepted')
    : (order.status === 'accepted' && order.aggregatorId === authUserId);

  function handleCancelPress() {
    setShowCancelSheet(true);
  }

  // ── Aggregator Actions ──
  const handleAccept = () => {
    if (order.orderId) {
      useAggregatorStore.getState().acceptOrder(order.orderId);
      router.push('/(aggregator)/execution/navigate' as any);
    }
  };
  const handleEnRoute = () => console.log('Marking en route');
  const handleArrived = () => console.log('Marking arrived');
  const handleWeighing = () => router.push(`/(aggregator)/execution/weighing/${order.orderId}` as any);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <NavBar
        title={`Order #${order.orderId}`}
        variant="light"
        onBack={() => safeBack('/')}
        // We do not append status text to the title. It goes purely to the rightAction.
        rightAction={<StatusChip status={order.status} />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Banner (en_route only) ─────────────────────────────────── */}
        {order.status === 'en_route' && order.aggregator && (
          <View style={{ backgroundColor: colorExtended.amberLight, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.amber }}>
            <Text variant="label" style={{ color: colors.amber, fontWeight: '700' } as any}>
              {order.aggregator.name.split(' ')[0]} is on the way!
            </Text>
            <Text variant="caption" style={{ color: colors.amber, marginTop: 2 } as any}>
              Est. arrival in 8 minutes
            </Text>
          </View>
        )}

        {/* ── Personnel card (Seller/Aggregator depending on viewer) ─────────── */}
        {userType === 'seller' ? (
          showAggCard && order.aggregator && (
            <View style={styles.card}>
              <View style={styles.aggRow}>
                <Avatar
                  name={order.aggregator.name}
                  userType="aggregator"
                  size="lg"
                />
                <View style={styles.aggInfo}>
                  <Text variant="subheading" color={colors.navy}>
                    {order.aggregator.name}
                  </Text>
                  <Text variant="caption" color={colors.muted}>
                    <Star size={12} color={colors.amber} weight="fill" />
                    <Numeric size={12} color={colors.muted}>
                      {order.aggregator.rating.toFixed(1)}
                    </Numeric>
                    {' · '}
                    <Numeric size={12} color={colors.muted}>
                      {order.aggregator.completedOrders}
                    </Numeric>
                  </Text>
                  <Pressable
                    style={styles.chatPillBtn}
                    onPress={() => router.push(`/(shared)/chat/${order.orderId}`)}
                  >
                    <ChatCircleDots size={14} color={colors.navy} weight="bold" />
                    <Text variant="caption" style={styles.chatPillText as any}>Chat</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )
        ) : (
          order.status !== 'created' && order.seller && (
            <View style={styles.card}>
              <View style={styles.aggRow}>
                <Avatar
                  name={order.seller.name}
                  userType="seller"
                  size="lg"
                />
                <View style={styles.aggInfo}>
                  <Text variant="subheading" color={colors.navy}>
                    {order.seller.name}
                  </Text>
                  <Text variant="caption" color={colors.muted}>
                    {'⭐ '}
                    <Numeric size={12} color={colors.muted}>
                      {order.seller.rating.toFixed(1)}
                    </Numeric>
                    {' seller rating'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 4 }}>
                    <Pressable
                      style={styles.chatPillBtn}
                      onPress={() => router.push(`/(shared)/chat/${order.orderId}`)}
                    >
                      <ChatCircleDots size={14} color={colors.navy} weight="bold" />
                      <Text variant="caption" style={styles.chatPillText as any}>Chat</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.chatPillBtn, { borderColor: colors.tealLight, backgroundColor: colorExtended.tealLight }]}
                      onPress={() => console.log('Call seller')}
                    >
                      <Phone size={14} color={colors.teal} weight="fill" />
                      <Text variant="caption" style={[styles.chatPillText, { color: colors.teal }] as any}>Call</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )
        )}

        {/* ── Status timeline ─────────────────────────────────── */}
        <View style={styles.card}>
          <Text
            variant="caption"
            color={colors.navy}
            style={styles.cardSectionLabel}
          >
            ORDER TIMELINE
          </Text>

          {(order.statusHistory || []).map((step: any, idx: number) => {
            const isLast = idx === (order.statusHistory || []).length - 1;
            const isDone = step.done;
            const isActive = !!step.active;

            return (
              <View key={step.status} style={styles.timelineRow}>
                {/* Left: circle + connector */}
                <View style={styles.timelineLeft}>
                  {isDone ? (
                    <View style={[styles.timelineCircle, styles.timelineCircleDone]}>
                      <Text style={styles.timelineCheck}>✓</Text>
                    </View>
                  ) : isActive ? (
                    <View style={[styles.timelineCircle, styles.timelineCircleActive]}>
                      <Text style={styles.timelineArrow}>→</Text>
                    </View>
                  ) : (
                    <View style={[styles.timelineCircle, styles.timelineCirclePending]} />
                  )}
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineConnector,
                        isDone && styles.timelineConnectorDone,
                      ]}
                    />
                  )}
                </View>
                {/* Right: label + time */}
                <View style={styles.timelineContent}>
                  <Text
                    variant="caption"
                    color={
                      isActive ? colors.amber :
                        isDone ? colors.navy :
                          colors.muted
                    }
                    style={isActive ? styles.timelineLabelActive : undefined}
                  >
                    {TIMELINE_LABELS[step.status] ?? step.status}
                  </Text>
                  {step.time && (
                    <Numeric size={11} color={colors.muted}>
                      {step.time}
                    </Numeric>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Order summary ───────────────────────────────────── */}
        <View style={styles.card}>
          <Text
            variant="caption"
            color={colors.navy}
            style={styles.cardSectionLabel}
          >
            ORDER SUMMARY
          </Text>
          <View style={styles.metaPillRow}>
            {(order.materials || []).map((mat: any, i: number) => {
              const weights = [12, 8, 4, 15]; // mock weights
              return (
                <View key={mat} style={[styles.metaPill, { backgroundColor: MATERIAL_BG[mat], borderColor: MATERIAL_COLORS[mat] }]}>
                  {mat === 'metal' && <Nut size={14} color={MATERIAL_COLORS[mat]} weight="fill" />}
                  {mat === 'plastic' && <Jar size={14} color={MATERIAL_COLORS[mat]} weight="fill" />}
                  {mat === 'paper' && <FileText size={14} color={MATERIAL_COLORS[mat]} weight="fill" />}
                  {mat === 'ewaste' && <Laptop size={14} color={MATERIAL_COLORS[mat]} weight="fill" />}
                  {mat === 'fabric' && <Dress size={14} color={MATERIAL_COLORS[mat]} weight="fill" />}
                  {mat === 'glass' && <Martini size={14} color={MATERIAL_COLORS[mat]} weight="fill" />}
                  <Text variant="caption" style={{ color: MATERIAL_COLORS[mat], fontWeight: '600', marginLeft: 4 } as any}>
                    {mat.charAt(0).toUpperCase() + mat.slice(1)} · {weights[i % weights.length]} kg
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryValueRow}>
            <Text variant="caption" color={colors.muted}>Estimated value</Text>
            <Numeric size={18} color={colors.navy}>
              {'~₹'}
              {order.estimatedAmount}
            </Numeric>
          </View>
        </View>

        {/* ── Address section ─────────────────────────────────── */}
        <View style={styles.card}>
          <Text
            variant="caption"
            color={colors.navy}
            style={styles.cardSectionLabel}
          >
            PICKUP LOCATION
          </Text>
          {/* V25: full address revealed only post-acceptance */}
          <Text variant="label" color={colors.slate}>
            {displayAddress}
          </Text>
          <Text variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
            {order.date}
          </Text>
        </View>

        {/* ── OTP Section (Seller only, when arrived) ───────────────────────── */}
        {userType === 'seller' && order.status === 'arrived' && (
          <Pressable
            style={[styles.card, styles.otpCard]}
            onPress={() => router.push(`/(seller)/order/otp/${id}` as any)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="caption" color={colors.navy} style={styles.cardSectionLabel}>
                SHARE OTP WITH AGGREGATOR
              </Text>
              <CaretRight size={16} color={colors.navy} />
            </View>
            <Text variant="caption" color={colors.muted} style={{ marginBottom: spacing.md }}>
              Tap to show verification code to the dealer.
            </Text>
            <View style={styles.otpCodeRow}>
              {(storeOrder?.otp || '1234').split('').map((digit: any, i: number) => (
                <View key={i} style={styles.otpDigitBox}>
                  <Text variant="heading" style={styles.otpDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        )}

        {/* ── Action bar ──────────────────────────────────────── */}
        {isCompleted ? (
          <SecondaryButton
            label="View Receipt"
            onPress={() => router.push(`/(shared)/receipt/${order.orderId}`)}
          />
        ) : (
          <>
            {/* Removed SecondaryButton Chat as it is inside the card now */}
          </>
        )}

        {isActiveRide && userType === 'seller' && (
          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton
              label="Track Live"
              onPress={() => console.log('track live pressed')}
            />
          </View>
        )}

        {/* Aggregator Context Actions */}
        {userType === 'aggregator' && (
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            {order.status === 'created' && (
              <PrimaryButton label="Accept Order" onPress={handleAccept} />
            )}
            {order.status === 'accepted' && (
              <PrimaryButton label="I'm On The Way!" onPress={handleEnRoute} />
            )}
            {order.status === 'en_route' && (
              <View style={{ gap: spacing.sm }}>
                <PrimaryButton label="I've Arrived" style={{ backgroundColor: colors.teal }} onPress={handleArrived} />
                <SecondaryButton label="Get Directions" onPress={() => console.log('Map directions')} />
              </View>
            )}
            {order.status === 'arrived' && (
              <PrimaryButton label="Start Weighing" onPress={handleWeighing} />
            )}
          </View>
        )}

        {/* Cancel link — visible only for created or accepted orders */}
        {canCancel && (
          <Text
            variant="caption"
            color={colors.red}
            style={styles.cancelLink}
            onPress={handleCancelPress}
          >
            Cancel Order
          </Text>
        )}

        {/* Information Banner missing from App layout */}
        {order.status === 'en_route' && order.aggregator && (
          <View style={{ backgroundColor: colorExtended.tealLight, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.teal, marginTop: spacing.md }}>
            <Text variant="caption" style={{ color: colors.teal, fontWeight: '500' } as any}>
              💡 When {order.aggregator.name.split(' ')[0]} arrives, they will visually inspect your scrap and weigh it in front of you. Once the final value is determined, you will confirm with OTP and receive instant payment.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Two-tap cancel confirmation sheet ───────────────────── */}
      {/* Two-tap cancel: first tap shows sheet, second tap confirms — per PLAN.md §2.6 */}
      {showCancelSheet && (
        <CancelOrderModal
          orderId={order.orderId}
          onClose={() => setShowCancelSheet(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },

  // Map placeholder
  mapPlaceholder: {
    height: 140,
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    position: 'relative',
  },
  mapEmoji: {
    fontSize: 28,
  },
  mapPinIcon: {
    marginBottom: spacing.xs,
  },
  mapDistBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },

  // Card base
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardSectionLabel: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },

  // Aggregator card
  aggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aggInfo: {
    flex: 1,
    gap: 2,
  },
  chatPillBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  chatPillText: {
    color: colors.navy,
    fontWeight: '600',
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 20,
  },
  timelineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleDone: {
    backgroundColor: colors.teal,
  },
  timelineCircleActive: {
    backgroundColor: colors.amber,
  },
  timelineCirclePending: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colorExtended.surface2,
  },
  timelineCheck: {
    color: colors.surface,
    fontSize: 9,
    fontWeight: '700',
  },
  timelineArrow: {
    color: colors.surface,
    fontSize: 9,
    fontWeight: '700',
  },
  timelineConnector: {
    width: 2,
    height: 28,
    backgroundColor: colors.border,
  },
  timelineConnectorDone: {
    backgroundColor: colors.teal,
    opacity: 0.3,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
    gap: 2,
  },
  timelineLabelActive: {
    fontFamily: 'DMSans-Bold',
  },

  // Order summary
  metaPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colorExtended.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  summaryValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  actionBar: {
    marginTop: spacing.sm,
  },
  cancelLink: {
    textAlign: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 40,           // touch target
    lineHeight: 40,
  },

  // Cancel sheet modal
  modalOuter: {
    ...StyleSheet.absoluteFillObject,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black, // black base — opacity below controls transparency
    opacity: 0.5,               // no hardcoded rgba — opacity on plain black View
  },
  cancelSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // OTP Card
  otpCard: {
    backgroundColor: colorExtended.surface2,
    borderColor: colors.navy,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  otpCodeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  otpDigitBox: {
    width: 50,
    height: 60,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigitText: {
    color: colors.navy,
    fontFamily: 'DMMono-Bold',
    fontSize: 28,
  },
});
