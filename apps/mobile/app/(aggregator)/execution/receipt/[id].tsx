import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
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
  CaretLeft,
  DownloadSimple,
  Receipt,
  User,
  Prohibit,
} from 'phosphor-react-native';
import * as Linking from 'expo-linking';

import { colors, spacing, radius } from '../../../../constants/tokens';
import { Text, Numeric } from '../../../../components/ui/Typography';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { useOrderStore } from '../../../../store/orderStore';
import { useAuthStore } from '../../../../store/authStore';
import { useChatStore } from '../../../../store/chatStore';
import { useAggregatorStore } from '../../../../store/aggregatorStore';
import { OrderTimeline } from '../../../../components/order/OrderTimeline';
import { PrimaryButton, SecondaryButton } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { api } from '../../../../lib/api';
import { safeBack } from '../../../../utils/navigation';
import { ImageCarouselViewer } from '../../../../components/ui/ImageCarouselViewer';
import * as WebBrowser from 'expo-web-browser';

const MATERIAL_COLORS: Record<string, string> = {
  paper: colors.material.paper.fg,
  metal: colors.material.metal.fg,
  plastic: colors.material.plastic.fg,
  ewaste: colors.material.ewaste.fg,
  fabric: colors.material.fabric.fg,
  glass: colors.material.glass.fg,
  custom: colors.material.custom.fg,
};

export default function AggregatorReceiptScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const routeOrderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const orders = useOrderStore((s: any) => s.orders);
  const fetchOrder = useOrderStore((s: any) => s.fetchOrder);
  const receiptUserId = useAuthStore((s: any) => s.userId);
  const chatUnread = useChatStore((state) => {
    if (!receiptUserId || !routeOrderId) return 0;
    return (state.messages[routeOrderId] ?? []).filter((m: any) => m.senderId !== receiptUserId && !m.read).length;
  });

  const { executionDraftByOrderId, clearExecutionDraft } = useAggregatorStore();

  const [rates, setRates] = React.useState<any[]>([]);
  const [ratingScore, setRatingScore] = React.useState<number>(0);
  const [ratingReview, setRatingReview] = React.useState('');
  const [ratingSubmitting, setRatingSubmitting] = React.useState(false);
  const [ratingError, setRatingError] = React.useState<string | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = React.useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = React.useState(false);
  const [invoiceError, setInvoiceError] = React.useState<string | null>(null);

  const [mediaUrls, setMediaUrls] = React.useState<string[]>([]);
  const [mediaLoading, setMediaLoading] = React.useState(false);

  const order = orders.find((o: any) => o.orderId === routeOrderId);
  const draft = routeOrderId ? executionDraftByOrderId[routeOrderId] : undefined;

  React.useEffect(() => {
    if (!routeOrderId) return;
    (async () => {
      await Promise.all([
        fetchOrder ? fetchOrder(routeOrderId).catch(() => null) : Promise.resolve(),
        api.get('/api/rates')
          .then(res => setRates(res.data.rates || []))
          .catch(() => setRates([])),
      ]);
    })();
  }, [routeOrderId, fetchOrder]);

  React.useEffect(() => {
    if (!routeOrderId) return;
    setMediaLoading(true);
    api.get(`/api/orders/${routeOrderId}/media`)
      .then(async (res) => {
        const items: any[] = res.data.media ?? [];
        const scrapPhotos = items.filter((m: any) => m.media_type === 'scrap_photo');
        const selectedItems = scrapPhotos.length > 0 ? scrapPhotos : items;

        if (selectedItems.length === 0) {
          setMediaUrls([]);
          return;
        }

        const urls = await Promise.all(
          selectedItems.map((item: any) =>
            api.get(`/api/orders/${routeOrderId}/media/${item.id}/url`)
              .then((urlRes) => urlRes?.data?.url as string)
              .catch(() => null)
          )
        );

        setMediaUrls(urls.filter((url): url is string => typeof url === 'string' && url.length > 0));
      })
      .catch(() => setMediaUrls([]))
      .finally(() => setMediaLoading(false));
  }, [routeOrderId]);

  React.useEffect(() => {
    if (order?.aggregatorHasRated) {
      setRatingSubmitted(true);
    }
  }, [order?.aggregatorHasRated]);

  const invoiceOrderId = order?.orderId ?? routeOrderId ?? null;

  const completedAtDate = useMemo(() => {
    const completedEvent = Array.isArray(order?.history)
      ? [...order.history].reverse().find((entry: any) => entry?.new_status === 'completed')
      : undefined;

    const iso = completedEvent?.created_at ?? order?.updatedAt ?? order?.createdAt;
    return iso ? new Date(iso) : null;
  }, [order?.history, order?.updatedAt, order?.createdAt]);

  // Invoice download disabled 30 minutes after order completion
  const isInvoiceExpired = useMemo(() => {
    if (!completedAtDate) return false;
    const expiryTime = new Date(completedAtDate.getTime() + 30 * 60 * 1000); // 30 minutes
    return new Date() > expiryTime;
  }, [completedAtDate]);

  const handleDownloadInvoice = React.useCallback(async () => {
    if (!invoiceOrderId) {
      console.warn('[Invoice] Missing order id for download');
      setInvoiceError('Could not load invoice — please try again');
      return;
    }
    if (isInvoiceExpired) {
      setInvoiceError('Invoice has expired — available for 30 minutes after completion');
      return;
    }

    setIsDownloadingInvoice(true);
    setInvoiceError(null);
    try {
      console.log('[Invoice] Requesting signed URL for order', invoiceOrderId);
      const response = await api.get(`/api/orders/${invoiceOrderId}/invoice`);
      const signedUrl = response?.data?.signedUrl ?? response?.data?.url;
      if (!signedUrl) {
        console.warn('[Invoice] Missing signed URL in response', response?.data);
        setInvoiceError('Could not load invoice — please try again');
        return;
      }
      const result = await WebBrowser.openBrowserAsync(signedUrl, {
        controlsColor: colors.navy,
        toolbarColor: colors.surface,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      console.log('[Invoice] Browser result', result.type);
    } catch (err: any) {
      console.warn('[Invoice] Download failed', err?.message || err);
      if (err?.response?.status === 410) {
        setInvoiceError('Invoice has expired — available for 30 minutes after completion');
      } else if (err?.response?.status === 404) {
        setInvoiceError('Invoice is being generated — try again in a moment');
      } else {
        setInvoiceError('Could not load invoice — please try again');
      }
    } finally {
      setIsDownloadingInvoice(false);
    }
  }, [invoiceOrderId, isInvoiceExpired]);

  const completedAt = useMemo(() => {
    if (!completedAtDate) return '—';
    return completedAtDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [completedAtDate]);



  const mappedItems = useMemo(() => {
    if (draft && draft.lineItems?.length > 0) {
      return draft.lineItems.map((item: any) => ({
        material_code: item.materialCode,
        material_label: item.label,
        weight: item.weightKg,
        price_per_kg: item.ratePerKg,
        amount: item.weightKg * item.ratePerKg,
      }));
    }
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
  }, [order?.orderItems, order?.lineItems, order?.estimatedWeights, draft, rates]);

  const totalAmount = useMemo(() => {
    if (draft?.totalAmount && draft.totalAmount > 0) return draft.totalAmount;
    if (typeof order?.confirmedTotal === 'number' && order.confirmedTotal > 0) return order.confirmedTotal;
    if (typeof order?.confirmedAmount === 'number' && order.confirmedAmount > 0) return order.confirmedAmount;
    if (typeof order?.displayAmount === 'number' && order.displayAmount > 0) return order.displayAmount;

    const computed = mappedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    return computed > 0 ? computed : Number(order?.estimatedAmount ?? 0);
  }, [draft, mappedItems, order?.confirmedTotal, order?.confirmedAmount, order?.displayAmount, order?.estimatedAmount]);

  const totalWeight = useMemo(
    () => draft?.totalWeight ?? mappedItems.reduce((sum: number, item: any) => sum + Number(item.weight || 0), 0),
    [draft, mappedItems]
  );

  // Show invoice section for all completed orders (backend generates for all)
  const showInvoiceButton = order?.status === 'completed';
  const sellerPhone = (typeof order?.sellerPhone === 'string' && order.sellerPhone.trim().length > 0)
    ? order.sellerPhone.trim()
    : null;

  const submitRating = React.useCallback(async () => {
    if (!order?.orderId || !order?.sellerId || ratingScore < 1 || ratingSubmitting) return;
    setRatingSubmitting(true);
    setRatingError(null);
    try {
      await api.post('/api/ratings', {
        order_id: order.orderId,
        ratee_id: order.sellerId,
        score: ratingScore,
        review: ratingReview.trim().slice(0, 500),
      });
      setRatingSubmitted(true);
      if (fetchOrder) await fetchOrder(order.orderId, true);
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setRatingSubmitted(true);
        if (fetchOrder) await fetchOrder(order.orderId, true);
      } else {
        setRatingError("Couldn't submit review. Please try again.");
      }
    } finally {
      setRatingSubmitting(false);
    }
  }, [order?.orderId, order?.sellerId, ratingScore, ratingReview, ratingSubmitting, fetchOrder]);

  const handleFinish = () => {
    if (routeOrderId) {
      clearExecutionDraft(routeOrderId);
    }
    router.dismissAll();
    router.replace('/(aggregator)/home');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => safeBack('/(aggregator)/orders?tab=Completed')} style={styles.heroBackButton}>
              <CaretLeft size={18} color={colors.surface} weight="regular" />
            </Pressable>
            <Pressable
              onPress={isInvoiceExpired ? undefined : handleDownloadInvoice}
              style={[styles.heroDownloadButton, isInvoiceExpired && styles.heroDownloadButtonExpired]}
              disabled={isDownloadingInvoice || isInvoiceExpired}
            >
              {isDownloadingInvoice ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : isInvoiceExpired ? (
                <Prohibit size={18} color={colors.surface} weight="regular" style={{ opacity: 0.5 }} />
              ) : (
                <DownloadSimple size={18} color={colors.surface} weight="regular" />
              )}
            </Pressable>
          </View>
          <View style={styles.heroStatusWrap}>
            <CheckCircle size={44} color={colors.surface} weight="fill" />
            <Text variant="heading" color={colors.surface} style={styles.heroTitle}>
              Pickup Complete!
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
              <Numeric size={12} color={colors.navy} style={styles.monoText}>{order?.orderNumber || '#000000'}</Numeric>
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
            ) : mediaUrls.length > 0 ? (
              <ImageCarouselViewer images={mediaUrls} height={220} autoScrollIntervalMs={4000} />
            ) : (
              <EmptyState
                icon={<ImageSquare size={44} color={colors.muted} weight="thin" />}
                heading="No scrap photo available"
                body="Pickup image is not attached for this order."
              />
            )}
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

            {mappedItems.map((item: any, index: number) => {
              const lineTotal = item.amount > 0
                ? item.amount
                : Number(item.weight || 0) * Number(item.price_per_kg || 0);

              const cleanMaterialCode = (item.material_code || '').toLowerCase();

              return (
                <View key={`${item.material_code}-${index}`} style={styles.tableRow}>
                  <View style={[styles.colMat, styles.rowMaterial]}>
                    <View
                      style={[
                        styles.materialDot,
                        { backgroundColor: MATERIAL_COLORS[cleanMaterialCode] ?? colors.muted },
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

            {mappedItems.length === 0 && (
              <View style={{ paddingVertical: spacing.md }}>
                <EmptyState
                  icon={<Receipt size={48} color={colors.muted} weight="thin" />}
                  heading="No items found"
                  body="No material breakdown available."
                />
              </View>
            )}

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
              <Text variant="body" color={colors.slate}>{order?.sellerName || 'Unavailable'}</Text>
            </View>

            <View style={styles.detailRowAddress}>
              <View style={styles.detailLabelInline}>
                <MapPin size={14} color={colors.muted} />
                <Text variant="caption" color={colors.muted}>Pickup Address</Text>
              </View>
              <Text variant="body" color={colors.slate} style={styles.addressValue}>
                {order?.pickupAddress || order?.pickupLocality || 'Address unavailable'}
              </Text>
            </View>
          </View>

          {order && (
            <OrderTimeline
              history={order.history || []}
              currentStatus={order.status}
            />
          )}

          {showInvoiceButton ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <DownloadSimple size={16} color={isInvoiceExpired ? colors.muted : colors.navy} />
                <Text variant="label" color={isInvoiceExpired ? colors.muted : colors.slate}>INVOICE</Text>
              </View>
              {isInvoiceExpired ? (
                <View style={styles.invoiceExpiredWrap}>
                  <Prohibit size={20} color={colors.muted} />
                  <Text variant="caption" color={colors.muted} style={styles.invoiceExpiredText}>
                  Invoice download expired — available for 30 minutes after order completion
                  </Text>
                </View>
              ) : (
                <SecondaryButton
                  label={isDownloadingInvoice ? 'Loading Invoice...' : 'Download Invoice'}
                  icon={isDownloadingInvoice ? <ActivityIndicator size="small" color={colors.navy} /> : <DownloadSimple size={16} color={colors.navy} />}
                  onPress={handleDownloadInvoice}
                  disabled={isDownloadingInvoice}
                />
              )}
              {invoiceError ? (
                <Text variant="caption" color={colors.muted} style={styles.invoiceErrorText}>
                  {invoiceError}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Star size={16} color={colors.amber} weight="fill" />
              <Text variant="label" color={colors.slate}>RATINGS & REVIEW</Text>
            </View>

            <Text variant="caption" color={colors.muted} style={styles.ratingHelperText}>
              How was your experience with {order?.sellerName || 'the seller'}?
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
          
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push({
                pathname: '/(shared)/dispute',
                params: {
                  orderId: routeOrderId,
                  fallbackRoute: '/(aggregator)/orders',
                },
              } as any)}
              style={styles.reportIssue}
            >
              <Text variant="caption" style={styles.reportIssueText}>
                Report an issue
              </Text>
            </Pressable>
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
  heroTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBackButton: {
    backgroundColor: 'transparent',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDownloadButton: {
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
  invoiceErrorText: {
    marginTop: spacing.sm,
  },
  heroDownloadButtonExpired: {
    opacity: 0.5,
  },
  invoiceExpiredWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  invoiceExpiredText: {
    flex: 1,
    lineHeight: 18,
  },
  submittedWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  submittedText: {
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  reportIssue: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  reportIssueText: {
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
