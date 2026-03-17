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
} from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { StatusChip } from '../../../components/ui/StatusChip';
import { PrimaryButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useOrderStore } from '../../../store/orderStore';
import { CancelOrderModal } from '../../../components/domain/CancelOrderModal';
import { safeBack } from '../../../utils/navigation';
import { api } from '../../../lib/api';
import { OrderTimeline } from '../../../components/order/OrderTimeline';
import { OrderItemList } from '../../../components/order/OrderItemList';
import { ContactCard } from '../../../components/order/ContactCard';

const OTP_ACTIVE_STATUSES = ['accepted', 'en_route', 'arrived', 'weighing_in_progress'];

export default function SellerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orders = useOrderStore((s: any) => s.orders);
  const fetchOrder = useOrderStore((s: any) => s.fetchOrder);
  const isLoading = useOrderStore((s: any) => s.isLoading);

  const [rates, setRates] = React.useState<any[]>([]);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [mediaUrls, setMediaUrls] = React.useState<string[]>([]);

  const order = orders.find((o: any) => o.orderId === id);
  const hasSellerAction = !!(order && OTP_ACTIVE_STATUSES.includes(order.status));

  React.useEffect(() => {
    api.get('/api/rates')
      .then(res => setRates(res.data.rates || []))
      .catch(() => {});

    if (id) {
      fetchOrder(id);
    }
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

  const mappedItems = useMemo(() => (
    Array.isArray(order?.lineItems) && order!.lineItems!.length > 0
      ? order!.lineItems!.map((item: any) => ({
          material_code: item.materialCode,
          weight: Number(item.weightKg) || 0,
          price_per_kg: Number(item.ratePerKg) || 0,
        }))
      : Object.entries(order?.estimatedWeights || {}).map(([code, weight]) => ({
          material_code: code,
          weight: Number(weight) || 0,
          price_per_kg: rates.find(r => r.material_code === code)?.rate_per_kg,
        }))
  ), [order?.lineItems, order?.estimatedWeights, rates]);

  const totalEstimated = useMemo(() => {
    if (typeof order?.displayAmount === 'number') return order.displayAmount;
    if (!mappedItems.length) return order?.confirmedAmount ?? order?.estimatedAmount ?? 0;
    const computed = mappedItems.reduce((sum: number, item: any) => {
      const rate = Number(item.price_per_kg || 0);
      const weight = Number(item.weight || 0);
      return sum + (rate * weight);
    }, 0);
    return computed > 0 ? computed : (order?.confirmedAmount ?? order?.estimatedAmount ?? 0);
  }, [mappedItems, order?.displayAmount, order?.confirmedAmount, order?.estimatedAmount]);

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

        <View style={styles.card}>
          <ContactCard
            name={order.aggregatorName || 'Finding Partner...'}
            phone={order.aggregatorPhone || null}
            role="Aggregator"
            userType="aggregator"
            onChat={order.aggregatorId ? () => router.push(`/(shared)/chat/${order.orderId}` as any) : undefined}
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
          <View style={styles.row}>
            <View style={styles.locationIcon}>
              <MapPin size={24} color={colors.red} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ fontFamily: 'DMSans-SemiBold' }}>Pickup Location</Text>
              <Text variant="body" color={colors.slate} numberOfLines={3}>
                {order.pickupAddress || order.pickupLocality}
              </Text>
            </View>
          </View>
        </View>

        <OrderItemList items={mappedItems} totalAmount={totalEstimated} />

        <OrderTimeline
          history={order.history || []}
          currentStatus={order.status}
        />

        {mediaUrls.length > 0 && (
          <View style={styles.photoSection}>
            <Text variant="subheading" style={{ marginBottom: spacing.sm }}>Scrap Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {mediaUrls.map((url, idx) => (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={styles.scrapPhoto}
                />
              ))}
            </ScrollView>
          </View>
        )}

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
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.bg,
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
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.redLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  photoSection: {
    marginTop: spacing.md,
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