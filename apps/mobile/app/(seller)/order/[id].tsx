import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Package,
  Clock,
  MapPin,
  Warning,
  NavigationArrow,
  ImageSquare,
} from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { StatusChip } from '../../../components/ui/StatusChip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useOrderStore } from '../../../store/orderStore';
import { CancelOrderModal } from '../../../components/domain/CancelOrderModal';
import { safeBack } from '../../../utils/navigation';
import { api } from '../../../lib/api';
import { OrderTimeline } from '../../../components/order/OrderTimeline';
import { ContactCard } from '../../../components/order/ContactCard';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { useOrderChannel } from '../../../hooks/useOrderChannel';

const OTP_ACTIVE_STATUSES = ['accepted', 'en_route', 'arrived', 'weighing_in_progress'];

type SellerOrderItemRow = {
  material_code: string;
  material_label: string;
  weight: number;
  price_per_kg: number | null;
  amount: number;
};

export default function SellerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orders = useOrderStore((s: any) => s.orders);
  const fetchOrder = useOrderStore((s: any) => s.fetchOrder);
  const isLoading = useOrderStore((s: any) => s.isLoading);
  const authUserId = useAuthStore((s: any) => s.userId);
  const authName = useAuthStore((s: any) => s.name);
  const authPhone = useAuthStore((s: any) => s.phoneNumber);
  const chatUnread = useChatStore((state) => {
    if (!authUserId || !id) return 0;
    return (state.messages[id] ?? []).filter(m => m.senderId !== authUserId && !m.read).length;
  });

  const [rates, setRates] = React.useState<any[]>([]);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [mediaUrls, setMediaUrls] = React.useState<string[]>([]);

  const order = orders.find((o: any) => o.orderId === id);
  useOrderChannel(
    order?.orderId ?? id ?? '',
    order?.orderChannelToken ?? null,
    order?.chatChannelToken ?? null
  );
  const hasSellerAction = !!(order && OTP_ACTIVE_STATUSES.includes(order.status));
  const ownContactName = (typeof authName === 'string' && authName.trim().length > 0)
    ? authName.trim()
    : (order?.sellerName || 'You');
  const ownContactPhone = (typeof order?.sellerPhone === 'string' && order.sellerPhone.trim().length > 0)
    ? order.sellerPhone.trim()
    : (typeof authPhone === 'string' && authPhone.trim().length > 0)
    ? authPhone.trim()
    : null;

  React.useEffect(() => {
    if (!id) return;

    // ⚠️ CRITICAL: Fetch order AND rates in parallel instead of sequentially
    // This ensures rates are available before mappedItems useMemo runs
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
    if (!id || !OTP_ACTIVE_STATUSES.includes(order?.status ?? '') || !!order?.otp) {
      return;
    }

    const interval = setInterval(() => {
      fetchOrder(id, true);
    }, 3000);

    return () => clearInterval(interval);
  }, [id, order?.status, order?.otp, fetchOrder]);

  React.useEffect(() => {
    if (!id) return;
    api.get(`/api/orders/${id}/media`)
      .then(async (res) => {
        const items: any[] = res.data.media ?? [];
        const scrapPhotos = items.filter((m: any) => m.media_type === 'scrap_photo');
        if (scrapPhotos.length === 0) {
          setMediaUrls([]);
          return;
        }
        const urls = await Promise.all(
          scrapPhotos.map((m: any) =>
            api.get(`/api/orders/${id}/media/${m.id}/url`)
              .then((r) => r.data.url as string)
              .catch(() => null)
          )
        );
        setMediaUrls(urls.filter(Boolean) as string[]);
      })
      .catch(() => {});
  }, [id]);

  React.useEffect(() => {
    if (!id) return;
    if (order?.status === 'completed') {
      const completedAmount =
        Number(order?.confirmedTotal ?? order?.displayAmount ?? order?.confirmedAmount ?? order?.estimatedTotal ?? order?.estimatedAmount ?? 0);

      router.replace({
        pathname: '/(shared)/order-complete',
        params: {
          orderId: order?.orderId ?? id,
          amount: String(completedAmount),
          fallback: `/(seller)/order/receipt/${id}`,
        },
      });
    }
  }, [id, order?.status, order?.orderId, order?.confirmedTotal, order?.displayAmount, order?.confirmedAmount, order?.estimatedTotal, order?.estimatedAmount]);

  const isCompleted = order?.status === 'completed';
  const hasAcceptedFlow = !!order && ['accepted', 'en_route', 'arrived', 'weighing_in_progress'].includes(order.status);

  const toTitleCase = React.useCallback((value: string) => {
    return String(value || '')
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const mappedItems = useMemo<SellerOrderItemRow[]>(() => {
    if (Array.isArray(order?.orderItems) && order.orderItems.length > 0) {
      return order.orderItems.map((item: any) => {
        const estimatedWeight = typeof item.estimatedWeightKg === 'number' ? item.estimatedWeightKg : 0;
        const confirmedWeight = typeof item.confirmedWeightKg === 'number' ? item.confirmedWeightKg : 0;
        const weight = isCompleted ? confirmedWeight : estimatedWeight;
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
      price_per_kg: rates.find(r => r.material_code === code)?.rate_per_kg ?? null,
      amount: 0,
    }));
  }, [order?.orderItems, order?.lineItems, order?.estimatedWeights, rates, isCompleted]);

  const totalEstimated = useMemo(() => {
    if (isCompleted && typeof order?.confirmedTotal === 'number' && order.confirmedTotal > 0) return order.confirmedTotal;
    if (!isCompleted && typeof order?.estimatedTotal === 'number' && order.estimatedTotal > 0) return order.estimatedTotal;
    if (typeof order?.displayAmount === 'number' && order.displayAmount > 0) return order.displayAmount;
    if (!mappedItems.length) return order?.confirmedAmount ?? order?.estimatedAmount ?? 0;
    const computed = mappedItems.reduce((sum: number, item: any) => {
      const rate = Number(item.price_per_kg ?? 0);
      const weight = Number(item.weight || 0);
      return sum + (rate * weight);
    }, 0);
    return computed > 0 ? computed : (order?.confirmedAmount ?? order?.estimatedAmount ?? 0);
  }, [mappedItems, order?.displayAmount, order?.confirmedAmount, order?.estimatedAmount, order?.estimatedTotal, order?.confirmedTotal, isCompleted]);

  if (isLoading && !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <NavBar title="Loading..." onBack={() => safeBack('/(seller)/orders')} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.navy} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <NavBar title="Order" onBack={() => safeBack('/(seller)/orders')} />
        <EmptyState
          icon={<Package size={48} color={colors.muted} weight="thin" />}
          heading="Order not found"
          body="This order doesn't exist or may have been removed."
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safeArea}>
      <NavBar
        title={`Order ${order.orderNumber}`}
        onBack={() => safeBack('/(seller)/orders')}
        rightAction={<StatusChip status={order.status} />}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {order.status === 'created' && (
          <View style={styles.warningCard}>
            <Warning size={20} color={colors.amber} weight="fill" />
            <View style={styles.warningTextContainer}>
              <Text variant="label" style={{ color: colors.amber, fontFamily: 'DMSans-SemiBold' }}>
                Price Variation Notice
              </Text>
              <Text variant="caption" color={colors.slate}>
                Final payout may vary based on market rates at the time of weighing.
              </Text>
            </View>
          </View>
        )}

        {hasAcceptedFlow && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <NavigationArrow size={16} color={colors.navy} />
              <Text variant="label" color={colors.slate}>LIVE TRACKING</Text>
            </View>
            <View style={styles.mapPlaceholderCard}>
              <Text variant="caption" color={colors.muted}>Aggregator tracking available in active flow.</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <ContactCard
            name={order.aggregatorName || 'Finding Partner...'}
            phone={order.aggregatorPhone || null}
            role="Aggregator"
            userType="aggregator"
            onChat={order.aggregatorId ? () => router.push(`/(shared)/chat/${order.orderId}` as any) : undefined}
            unreadCount={chatUnread}
          />
          <View style={styles.cardFooter}>
            <View style={styles.metaRow}>
              <Clock size={14} color={colors.muted} />
              <Text variant="caption" color={colors.muted}>
                Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ImageSquare size={16} color={colors.navy} />
            <Text variant="label" color={colors.slate}>SCRAP IMAGE</Text>
          </View>
          {mediaUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {mediaUrls.map((url, idx) => (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={styles.scrapPhoto}
                />
              ))}
            </ScrollView>
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
            <MapPin size={16} color={colors.navy} />
            <Text variant="label" color={colors.slate}>SELLER DETAILS</Text>
          </View>
          <View style={styles.ownContactRow}>
            <Text variant="caption" color={colors.muted}>Name</Text>
            <Text variant="body" color={colors.slate}>{ownContactName}</Text>
          </View>
          <View style={styles.ownContactRow}>
            <Text variant="caption" color={colors.muted}>Phone</Text>
            <Text variant="body" color={colors.slate}>{ownContactPhone || 'Not available'}</Text>
          </View>
          <View style={styles.detailRowAddress}>
            <Text variant="caption" color={colors.muted}>Pickup Address</Text>
            <Text variant="body" color={colors.slate} style={styles.pickupAddressValue}>
              {order.pickupAddress || order.pickupLocality || 'Address unavailable'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.itemHeaderRow}>
            <Text variant="subheading" style={{ color: colors.navy }}>Items</Text>
            <Text variant="caption" color={colors.muted}>{isCompleted ? 'Weight' : 'Est. Weight'}</Text>
          </View>
          {mappedItems.map((item: SellerOrderItemRow, index: number) => (
            <View key={`${item.material_code}-${index}`} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ color: colors.slate, fontFamily: 'DMSans-Medium' }}>
                  {toTitleCase(item.material_label)}
                </Text>
                <Text variant="caption" color={colors.muted}>
                  Rate: {typeof item.price_per_kg === 'number' ? `₹${item.price_per_kg}/kg` : '—'}
                </Text>
              </View>
              <Numeric size={15} color={colors.navy}>{item.weight} kg</Numeric>
            </View>
          ))}
          <View style={styles.totalRowInline}>
            <Text variant="label" style={{ fontFamily: 'DMSans-SemiBold', color: colors.slate }}>
              {isCompleted ? 'Total Value' : 'Total Est. Value'}
            </Text>
            <Numeric size={17} color={colors.amber}>₹{totalEstimated.toLocaleString('en-IN')}</Numeric>
          </View>
        </View>

        <OrderTimeline
          history={order.history || []}
          currentStatus={order.status}
        />

        {!['completed', 'cancelled', 'disputed'].includes(order.status) && (
          <Pressable
            style={styles.cancelAction}
            onPress={() => setShowCancelSheet(true)}
          >
            <Text variant="label" color={colors.red}>Cancel Order</Text>
          </Pressable>
        )}

        {hasSellerAction && <View style={{ height: 100 }} />}
      </ScrollView>

      {hasSellerAction && (
        <View style={styles.floatingFooter}>
          <View style={styles.otpBanner}>
            <Text variant="label" style={{ color: colors.surface }}>Give OTP to partner: </Text>
            <Numeric size={18} color={colors.surface}>{order.otp || 'Waiting...'}</Numeric>
          </View>
        </View>
      )}

      {showCancelSheet && (
        <CancelOrderModal
          orderId={order.orderId}
          onClose={() => setShowCancelSheet(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  mapPlaceholderCard: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  totalRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  detailRowAddress: {
    paddingTop: spacing.xs,
  },
  pickupAddressValue: {
    marginTop: 2,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.bg,
  },
  ownContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: colors.amberLight,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.amberLargeLight,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  warningTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  scrapPhoto: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: spacing.sm,
    backgroundColor: colors.skeleton,
  },
  cancelAction: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
  },
  otpBanner: {
    flex: 1,
    backgroundColor: colors.navy,
    padding: spacing.md,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});