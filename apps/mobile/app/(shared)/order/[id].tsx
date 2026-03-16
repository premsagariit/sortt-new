/**
 * app/(shared)/order/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Order Detail screen — shared between seller and aggregator contexts.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  Package, 
  ChatCircleDots, 
  Clock, 
  MapPin, 
  Phone, 
  Warning, 
  CheckCircle, 
  ArrowRight,
  NavigationArrow
} from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Avatar } from '../../../components/ui/Avatar';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useAuthStore } from '../../../store/authStore';
import { useOrderStore } from '../../../store/orderStore';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { CancelOrderModal } from '../../../components/domain/CancelOrderModal';
import { safeBack } from '../../../utils/navigation';
import { api, getBaseUrl } from '../../../lib/api';
import { OrderTimeline } from '../../../components/order/OrderTimeline';
import { OrderItemList } from '../../../components/order/OrderItemList';
import { ContactCard } from '../../../components/order/ContactCard';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userType = useAuthStore((s: any) => s.userType);
  const authUserId = useAuthStore((s: any) => s.user?.id);
  const orders = useOrderStore((s: any) => s.orders);
  const fetchOrder = useOrderStore((s: any) => s.fetchOrder);
  const isLoading = useOrderStore((s: any) => s.isLoading);

  const [rates, setRates] = React.useState<any[]>([]);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [mediaUrls, setMediaUrls] = React.useState<string[]>([]);
  const [ratesLoading, setRatesLoading] = React.useState(true);

  const order = orders.find((o: any) => o.orderId === id);

  const isAggregator = userType === 'aggregator';
  const isSeller = userType === 'seller';
  const isPreAcceptance = order && !order.aggregatorId;
  
  const hasAggregatorAction = !!(order && isAggregator && (isPreAcceptance || (order.status !== 'arrived' && !['completed', 'cancelled', 'disputed'].includes(order.status))));
  const hasSellerAction = !!(order && isSeller && order.status === 'weighing_in_progress');
  const hasBottomAction = hasAggregatorAction || hasSellerAction;

  React.useEffect(() => {
    // Fetch rates for estimation calculation
    api.get('/api/rates')
      .then(res => setRates(res.data.rates || []))
      .catch(() => {})
      .finally(() => setRatesLoading(false));

    if (id) {
      fetchOrder(id);
    }
  }, [id, fetchOrder]);

  // Fetch scrap photo media for this order
  React.useEffect(() => {
    if (!id) return;
    // Only clear and fetch if we don't have media or ID changed (though deps handle ID change)
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

  if (isLoading && !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <NavBar title="Loading..." onBack={() => safeBack('/')} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.navy} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <NavBar title="Order" onBack={() => safeBack('/')} />
        <EmptyState
          icon={<Package size={48} color={colors.muted} weight="thin" />}
          heading="Order not found"
          body="This order doesn't exist or may have been removed."
        />
      </SafeAreaView>
    );
  }

  const displayAddress = (isAggregator && isPreAcceptance)
    ? order.pickupLocality
    : (order.pickupAddress || order.pickupLocality);

  const mappedItems = Object.entries(order.estimatedWeights || {}).map(([code, weight]) => ({
    material_code: code,
    weight: weight as number,
    price_per_kg: rates.find(r => r.material_code === code)?.rate_per_kg,
  }));

  const handleAccept = async () => {
    try {
      await useAggregatorStore.getState().acceptOrder(order.orderId);
      router.push({ pathname: '/(aggregator)/execution/navigate', params: { id: order.orderId } } as any);
    } catch (e) {
      console.error('Failed to accept order', e);
    }
  };

  const handleStartRide = () => {
    router.push({ pathname: '/(aggregator)/execution/navigate', params: { id: order.orderId } } as any);
  };

  return (
    <View style={styles.safeArea}>
      <NavBar 
        title={`Order ${order.orderNumber}`} 
        onBack={() => safeBack('/')}
        rightAction={<StatusChip status={order.status} />}
      />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Market Price Mismatch Warning */}
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
            name={isSeller ? (order.aggregatorName || 'Finding Partner...') : (order.sellerName || 'View Order Seller')}
            phone={!isPreAcceptance ? (isSeller ? order.aggregatorPhone : order.sellerPhone) : null}
            role={isSeller ? 'Aggregator' : 'Seller'}
            userType={isSeller ? 'aggregator' : 'seller'}
            onChat={!isPreAcceptance ? () => router.push(`/(shared)/chat/${order.orderId}` as any) : undefined}
          />
          <View style={styles.cardFooter}>
            <View style={styles.metaRow}>
              <Clock size={14} color={colors.muted} />
              <Text variant="caption" color={colors.muted}>
                Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={[styles.metaRow, { marginLeft: spacing.lg }]}>
              <Package size={14} color={colors.muted} />
              <Text variant="caption" color={colors.muted}>
                {order.window || 'Flexible Pickup'}
              </Text>
            </View>
          </View>
        </View>

        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.locationIcon}>
              <MapPin size={24} color={colors.red} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ fontFamily: 'DMSans-SemiBold' }}>Pickup Location</Text>
              <Text variant="body" color={colors.slate} numberOfLines={2}>
                {displayAddress}
              </Text>
              {isAggregator && isPreAcceptance && (
                <Text variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
                  Exact address visible after you accept the order.
                </Text>
              )}
            </View>
            {!isPreAcceptance && isAggregator && (
              <Pressable style={styles.dirBtn} onPress={() => {/* navigation */}}>
                <NavigationArrow size={20} color={colors.surface} weight="fill" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Items List */}
        <OrderItemList items={mappedItems} totalAmount={order.estimatedAmount} />

        {/* Timeline */}
        <OrderTimeline
          history={order.history || []}
          currentStatus={order.status}
        />

        {/* Scrap Photos */}
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

        {/* Cancel Button (Seller/Aggregator accepted state) */}
        {!['completed', 'cancelled', 'disputed'].includes(order.status) && (
          <Pressable 
            style={styles.cancelAction} 
            onPress={() => setShowCancelSheet(true)}
          >
            <Text variant="label" color={colors.red}>Cancel Order</Text>
          </Pressable>
        )}

        {hasBottomAction && <View style={{ height: 100 }} />}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      {hasBottomAction && (
        <View style={styles.floatingFooter}>
          {hasAggregatorAction && isPreAcceptance && (
            <PrimaryButton 
              label="Accept Order" 
              onPress={handleAccept} 
              style={{ flex: 1 }}
            />
          )}
          {hasAggregatorAction && !isPreAcceptance && (
            <PrimaryButton 
              label={order.status === 'accepted' ? 'Start Ride' : 'Continue Ride'} 
              onPress={handleStartRide} 
              style={{ flex: 1 }}
            />
          )}
          {hasSellerAction && (
            <View style={styles.otpBanner}>
              <Text variant="label" style={{ color: colors.surface }}>Give OTP to partner: </Text>
              <Numeric size={18} color={colors.surface}>{order.otp}</Numeric>
            </View>
          )}
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
  actionButtons: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
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
  dirBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
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
