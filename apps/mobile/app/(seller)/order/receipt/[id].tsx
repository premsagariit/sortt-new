import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle,
  CalendarBlank,
  Hash,
  ImageSquare,
  Star,
  Scales,
  MapPin,
  Phone,
  User,
  CaretLeft,
} from 'phosphor-react-native';

import { colors, spacing, radius } from '../../../../constants/tokens';
import { Text, Numeric } from '../../../../components/ui/Typography';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { useOrderStore } from '../../../../store/orderStore';
import { useAuthStore } from '../../../../store/authStore';
import { useChatStore } from '../../../../store/chatStore';
import { ContactCard } from '../../../../components/order/ContactCard';
import { OrderTimeline } from '../../../../components/order/OrderTimeline';
import { PrimaryButton } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { api } from '../../../../lib/api';
import { safeBack } from '../../../../utils/navigation';

type SellerOrderItemRow = {
  material_code: string;
  material_label: string;
  weight: number;
  price_per_kg: number | null;
  amount: number;
};

const MATERIAL_COLORS: Record<string, string> = {
  paper: colors.material.paper.fg,
  metal: colors.material.metal.fg,
  plastic: colors.material.plastic.fg,
  ewaste: colors.material.ewaste.fg,
  fabric: colors.material.fabric.fg,
  glass: colors.material.glass.fg,
  custom: colors.material.custom.fg,
};

export default function SellerOrderReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const orders = useOrderStore((s: any) => s.orders);
  const fetchOrder = useOrderStore((s: any) => s.fetchOrder);
  const isLoading = useOrderStore((s: any) => s.isLoading);
  const receiptUserId = useAuthStore((s: any) => s.userId);
  const chatUnread = useChatStore((state) => {
    if (!receiptUserId || !id) return 0;
    return (state.messages[id] ?? []).filter(m => m.senderId !== receiptUserId && !m.read).length;
  });

  const [rates, setRates] = React.useState<any[]>([]);
  const [ratingScore, setRatingScore] = React.useState<number>(0);
  const [ratingReview, setRatingReview] = React.useState('');
  const [ratingSubmitting, setRatingSubmitting] = React.useState(false);
  const [ratingError, setRatingError] = React.useState<string | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = React.useState(false);

  const [mediaUrl, setMediaUrl] = React.useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = React.useState(false);

  const order = orders.find((o: any) => o.orderId === id);

  React.useEffect(() => {
    if (!id) return;
    (async () => {
      await Promise.all([
        fetchOrder(id),
        api.get('/api/rates')
          .then(res => setRates(res.data.rates || []))
          .catch(() => setRates([])),
      ]);
    })();
  }, [id, fetchOrder]);

  React.useEffect(() => {
    if (!id) return;
    setMediaLoading(true);
    api.get(`/api/orders/${id}/media`)
      .then(async (res) => {
        const items: any[] = res.data.media ?? [];
        const preferred = items.find((m: any) => m.media_type === 'scrap_photo');
        const fallback = items[0];
        const selected = preferred ?? fallback;

        if (!selected?.id) {
          setMediaUrl(null);
          return;
        }

        const urlRes = await api.get(`/api/orders/${id}/media/${selected.id}/url`).catch(() => null);
        setMediaUrl(urlRes?.data?.url ?? null);
      })
      .catch(() => setMediaUrl(null))
      .finally(() => setMediaLoading(false));
  }, [id]);

  React.useEffect(() => {
    if (order?.sellerHasRated) {
      setRatingSubmitted(true);
    }
  }, [order?.sellerHasRated]);

  const isCompleted = order?.status === 'completed';

  const completedAt = useMemo(() => {
    const completedEvent = Array.isArray(order?.history)
      ? [...order.history].reverse().find((entry: any) => entry?.new_status === 'completed')
      : undefined;

    const iso = completedEvent?.created_at ?? order?.updatedAt ?? order?.createdAt;
    if (!iso) return '—';

    const date = new Date(iso);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [order?.history, order?.updatedAt, order?.createdAt]);

  const mappedItems = useMemo<SellerOrderItemRow[]>(() => {
    if (Array.isArray(order?.orderItems) && order.orderItems.length > 0) {
      return order.orderItems.map((item: any) => {
        const confirmedWeight = typeof item.confirmedWeightKg === 'number' ? item.confirmedWeightKg : 0;
        const estimatedWeight = typeof item.estimatedWeightKg === 'number' ? item.estimatedWeightKg : 0;
        const weight = confirmedWeight > 0 ? confirmedWeight : estimatedWeight;
        const hasRate = typeof item.ratePerKg === 'number' && Number.isFinite(item.ratePerKg) && item.ratePerKg > 0;
        const rate = hasRate ? item.ratePerKg : null;
        const amount = hasRate && weight > 0 ? weight * (item.ratePerKg as number) : 0;

        return {
          material_code: item.materialCode,
          material_label: item.materialLabel || item.materialCode,
          weight,
          price_per_kg: rate,
          amount,
        };
      });
    }

    if (Array.isArray(order?.lineItems) && order.lineItems.length > 0) {
      return order.lineItems.map((item: any) => ({
        material_code: item.materialCode,
        material_label: item.materialCode,
        weight: Number(item.weightKg) || 0,
        price_per_kg: Number(item.ratePerKg) || null,
        amount: Number(item.amount) || 0,
      }));
    }

    return Object.entries(order?.estimatedWeights || {}).map(([code, weight]) => ({
      material_code: code,
      material_label: code,
      weight: Number(weight) || 0,
      price_per_kg: rates.find((r) => r.material_code === code)?.rate_per_kg ?? null,
      amount: 0,
    }));
  }, [order?.orderItems, order?.lineItems, order?.estimatedWeights, rates]);

  const totalAmount = useMemo(() => {
    if (typeof order?.confirmedTotal === 'number' && order.confirmedTotal > 0) return order.confirmedTotal;
    if (typeof order?.confirmedAmount === 'number' && order.confirmedAmount > 0) return order.confirmedAmount;
    if (typeof order?.displayAmount === 'number' && order.displayAmount > 0) return order.displayAmount;

    const computed = mappedItems.reduce((sum: number, item) => {
      const rate = Number(item.price_per_kg ?? 0);
      const weight = Number(item.weight ?? 0);
      return sum + (rate * weight);
    }, 0);

    return computed > 0 ? computed : Number(order?.estimatedAmount ?? 0);
  }, [mappedItems, order?.confirmedTotal, order?.confirmedAmount, order?.displayAmount, order?.estimatedAmount]);

  const totalWeight = useMemo(
    () => mappedItems.reduce((sum: number, item) => sum + Number(item.weight || 0), 0),
    [mappedItems]
  );

  const sellerPhone = (typeof order?.sellerPhone === 'string' && order.sellerPhone.trim().length > 0)
    ? order.sellerPhone.trim()
    : null;

  const submitRating = React.useCallback(async () => {
    if (!order?.orderId || !order?.aggregatorId || ratingScore < 1 || ratingSubmitting) return;
    setRatingSubmitting(true);
    setRatingError(null);
    try {
      await api.post('/api/ratings', {
        order_id: order.orderId,
        ratee_id: order.aggregatorId,
        score: ratingScore,
        review: ratingReview.trim().slice(0, 500),
      });
      setRatingSubmitted(true);
      await fetchOrder(order.orderId, true);
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setRatingSubmitted(true);
        await fetchOrder(order.orderId, true);
      } else {
        setRatingError("Couldn't submit review. Please try again.");
      }
    } finally {
      setRatingSubmitting(false);
    }
  }, [order?.orderId, order?.aggregatorId, ratingScore, ratingReview, ratingSubmitting, fetchOrder]);

  if (isLoading && !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator color={colors.navy} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <EmptyState
            icon={<ImageSquare size={48} color={colors.muted} weight="thin" />}
            heading="Order not found"
            body="This completed order could not be loaded."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.heroSection}>
          <Pressable onPress={() => safeBack('/(seller)/orders?tab=Completed')} style={styles.heroBackButton}>
            <CaretLeft size={18} color={colors.surface} weight="regular" />
          </Pressable>
          <View style={styles.heroStatusWrap}>
            <CheckCircle size={44} color={colors.surface} weight="fill" />
            <Text variant="heading" color={colors.surface} style={styles.heroTitle}>
              {isCompleted ? 'Order Complete' : 'Order Summary'}
            </Text>
            <Numeric size={32} color={colors.surface} style={styles.heroAmount}>
              ₹{Math.round(totalAmount).toLocaleString('en-IN')}
            </Numeric>
          </View>
        </View>

        <View style={styles.bodyContainer}>
          <View style={styles.infoBanner}>
            <View style={styles.infoItem}>
              <Hash size={14} color={colors.muted} />
              <Numeric size={12} color={colors.navy} style={styles.monoText}>{order.orderNumber}</Numeric>
            </View>
            <View style={styles.bannerDivider} />
            <View style={styles.infoItem}>
              <CalendarBlank size={14} color={colors.muted} />
              <Text variant="caption" color={colors.slate}>{completedAt}</Text>
            </View>
            <View style={styles.bannerDivider} />
            <View style={styles.completedPill}>
              <Text variant="caption" color={colors.teal} style={styles.completedPillText}>Completed</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <ImageSquare size={16} color={colors.navy} />
              <Text variant="label" color={colors.slate}>SCRAP IMAGE</Text>
            </View>
            {mediaLoading ? (
              <View style={styles.mediaLoaderWrap}>
                <ActivityIndicator color={colors.navy} />
              </View>
            ) : mediaUrl ? (
              <Image source={{ uri: mediaUrl }} style={styles.scrapImage} />
            ) : (
              <EmptyState
                icon={<ImageSquare size={44} color={colors.muted} weight="thin" />}
                heading="No scrap photo available"
                body="Pickup image is not attached for this order."
              />
            )}
          </View>

          <View style={styles.card}>
            <ContactCard
              name={order.aggregatorName || 'Aggregator'}
              phone={order.aggregatorPhone || null}
              role="Aggregator"
              userType="aggregator"
              onChat={order.aggregatorId ? () => router.push(`/(shared)/chat/${order.orderId}` as any) : undefined}
              unreadCount={chatUnread}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Scales size={16} color={colors.navy} />
              <Text variant="label" color={colors.slate}>ORDER SUMMARY</Text>
            </View>

            <View style={styles.tableHeader}>
              <Text variant="caption" color={colors.muted} style={[styles.colMat, styles.col]}>Material</Text>
              <Text variant="caption" color={colors.muted} style={[styles.colWeight, styles.colRight]}>Weight</Text>
              <Text variant="caption" color={colors.muted} style={[styles.colRate, styles.colRight]}>Rate</Text>
              <Text variant="caption" color={colors.muted} style={[styles.colTotal, styles.colRight]}>Amount</Text>
            </View>

            {mappedItems.map((item, index) => {
              const lineTotal = item.amount > 0
                ? item.amount
                : Number(item.weight || 0) * Number(item.price_per_kg || 0);

              return (
                <View key={`${item.material_code}-${index}`} style={styles.tableRow}>
                  <View style={[styles.colMat, styles.rowMaterial]}>
                    <View
                      style={[
                        styles.materialDot,
                        { backgroundColor: MATERIAL_COLORS[item.material_code] ?? colors.muted },
                      ]}
                    />
                    <Text variant="caption" color={colors.slate}>{item.material_label}</Text>
                  </View>
                  <Numeric size={12} color={colors.navy} style={[styles.colWeight, styles.colRight]}>
                    {Number(item.weight).toFixed(1)} kg
                  </Numeric>
                  <Numeric size={12} color={colors.muted} style={[styles.colRate, styles.colRight]}>
                    ₹{Math.round(Number(item.price_per_kg || 0))}
                  </Numeric>
                  <Numeric size={12} color={colors.amber} style={[styles.colTotal, styles.colRight]}>
                    ₹{Math.round(lineTotal)}
                  </Numeric>
                </View>
              );
            })}

            <View style={styles.summaryTotalRow}>
              <Text variant="label" color={colors.navy}>Total</Text>
              <Numeric size={13} color={colors.navy}>{totalWeight.toFixed(1)} kg</Numeric>
              <Numeric size={16} color={colors.amber} style={styles.summaryTotalAmount}>
                ₹{Math.round(totalAmount).toLocaleString('en-IN')}
              </Numeric>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <User size={16} color={colors.navy} />
              <Text variant="label" color={colors.slate}>SELLER DETAILS</Text>
            </View>

            <View style={styles.detailRow}>
              <Text variant="caption" color={colors.muted}>Seller</Text>
              <Text variant="body" color={colors.slate}>{order.sellerName || 'You'}</Text>
            </View>

            <View style={styles.detailRowAddress}>
              <View style={styles.detailLabelInline}>
                <MapPin size={14} color={colors.muted} />
                <Text variant="caption" color={colors.muted}>Pickup Address</Text>
              </View>
              <Text variant="body" color={colors.slate} style={styles.addressValue}>
                {order.pickupAddress || order.pickupLocality || 'Address unavailable'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabelInline}>
                <Phone size={14} color={colors.muted} />
                <Text variant="caption" color={colors.muted}>Phone</Text>
              </View>
              <Text variant="body" color={colors.slate}>{sellerPhone || 'Not available'}</Text>
            </View>
          </View>

          <OrderTimeline
            history={order.history || []}
            currentStatus={order.status}
          />

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Star size={16} color={colors.amber} weight="fill" />
              <Text variant="label" color={colors.slate}>RATINGS & REVIEW</Text>
            </View>

            <Text variant="caption" color={colors.muted} style={styles.ratingHelperText}>
              How was your pickup with {order.aggregatorName || 'the aggregator'}?
            </Text>

            {ratingSubmitted ? (
              <View style={styles.submittedWrap}>
                <Star size={28} color={colors.teal} weight="fill" />
                <Text variant="body" color={colors.teal} style={styles.submittedText}>Review submitted</Text>
              </View>
            ) : (
              <>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable key={star} onPress={() => setRatingScore(star)} style={styles.starPress}>
                      <Star
                        size={30}
                        color={star <= ratingScore ? colors.amber : colors.border}
                        weight={star <= ratingScore ? 'fill' : 'regular'}
                      />
                    </Pressable>
                  ))}
                </View>

                <Input
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  value={ratingReview}
                  onChangeText={setRatingReview}
                  placeholder="Optional review (max 500 characters)"
                  placeholderTextColor={colors.muted}
                  style={styles.reviewInput}
                />

                {ratingError ? (
                  <Text variant="caption" color={colors.red} style={styles.ratingErrorText}>
                    {ratingError}
                  </Text>
                ) : null}

                <PrimaryButton
                  label={ratingSubmitting ? 'Submitting...' : 'Submit Review'}
                  onPress={submitRating}
                  style={styles.submitReviewButton}
                  disabled={ratingSubmitting || ratingScore < 1}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  heroSection: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroBackButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatusWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroAmount: {
    fontFamily: 'DMMono-Bold',
  },
  bodyContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  infoBanner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  monoText: {
    fontFamily: 'DMMono-Medium',
  },
  bannerDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  completedPill: {
    backgroundColor: colors.tealLight,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  completedPillText: {
    fontFamily: 'DMSans-Bold',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  mediaLoaderWrap: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrapImage: {
    width: '100%',
    height: 220,
    borderRadius: radius.input,
    backgroundColor: colors.skeleton,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  col: {
    fontFamily: 'DMSans-Medium',
  },
  colMat: {
    flex: 1.5,
  },
  colWeight: {
    flex: 1.1,
  },
  colRate: {
    flex: 0.8,
  },
  colTotal: {
    flex: 1,
  },
  colRight: {
    textAlign: 'right',
  },
  rowMaterial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  materialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  summaryTotalAmount: {
    marginLeft: 'auto',
    fontFamily: 'DMMono-Bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailRowAddress: {
    paddingVertical: spacing.xs,
  },
  detailLabelInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  addressValue: {
    lineHeight: 20,
  },
  ratingHelperText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  starPress: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewInput: {
    minHeight: 96,
    maxHeight: 160,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  ratingErrorText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  submitReviewButton: {
    marginTop: spacing.lg,
  },
  submittedWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  submittedText: {
    marginTop: spacing.sm,
  },
});