import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { MaterialChip } from '../../components/ui/MaterialChip';
import { Avatar } from '../../components/ui/Avatar';
import { PrimaryButton, IconButton, SecondaryButton } from '../../components/ui/Button';
import { MagnifyingGlass, ChatCircle, X, Check, MapPin, Clock } from 'phosphor-react-native';
import { BaseCard, OrderStatus, MaterialCode } from '../../components/ui/Card';
import { useOrderStore } from '../../store/orderStore';

/**
 * app/(aggregator)/orders.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Order Feed Screen.
 * 
 * Features:
 * - 3-tab layout: Active | Completed | Cancelled
 * - Material filter chips (Active tab only)
 * - V25 compliant order cards (Locality only, masked seller name)
 * - Structured card layout matching Image 1 & 4
 * - Online/Offline status toggle in empty state (Image 2)
 * ──────────────────────────────────────────────────────────────────
 */

type TabType = 'active' | 'completed' | 'cancelled';

const MOCK_NEW_ORDERS = [
  {
    id: 'ORD-24095',
    distance: '0.8 km',
    price: 896,
    locality: 'Banjara Hills area',
    window: 'Today · 10 AM — 12 PM',
    materials: ['metal', 'paper'] as MaterialCode[],
    sellerType: 'Industry seller',
    rating: 4.9,
    isHighValue: true,
    isNew: true,
  },
  {
    id: 'ORD-24096',
    distance: '1.2 km',
    price: 450,
    locality: 'Jubilee Hills area',
    window: 'Today · 2 PM — 4 PM',
    materials: ['plastic', 'glass'] as MaterialCode[],
    sellerType: 'Residential seller',
    rating: 4.7,
    isHighValue: false,
    isNew: true,
  }
];

const MOCK_ONGOING_ORDERS = [
  {
    id: 'ORD-24091',
    distance: '1.4 km',
    price: 620,
    locality: 'Madhapur area',
    window: 'Today · 10 AM — 12 PM',
    materials: ['paper', 'plastic'] as MaterialCode[],
    sellerType: 'Shop seller',
    rating: 4.8,
    status: 'en_route' as OrderStatus,
  },
];

const MOCK_COMPLETED_ORDERS = [
  {
    id: 'ORD-24085',
    distance: '2.1 km',
    price: 1250,
    locality: 'Gachibowli area',
    window: 'Yesterday · 11 AM',
    materials: ['metal', 'ewaste'] as MaterialCode[],
    sellerType: 'Industry seller',
    rating: 5.0,
    status: 'completed' as OrderStatus,
  },
  {
    id: 'ORD-24082',
    distance: '0.5 km',
    price: 320,
    locality: 'Kondapur area',
    window: 'Yesterday · 4 PM',
    materials: ['paper'] as MaterialCode[],
    sellerType: 'Residential seller',
    rating: 4.6,
    status: 'completed' as OrderStatus,
  },
];

const MOCK_CANCELLED_ORDERS = [
  {
    id: 'ORD-24079',
    distance: '3.2 km',
    price: 580,
    locality: 'Kukatpally area',
    window: '2 days ago',
    materials: ['plastic', 'glass'] as MaterialCode[],
    sellerType: 'Shop seller',
    rating: 4.2,
    status: 'cancelled' as OrderStatus,
  },
];

export default function AggregatorOrdersScreen() {
  const router = useRouter();
  const { orders } = useOrderStore();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const rejectedOrderIds = useOrderStore((s) => s.rejectedOrderIds);

  const getMaterialKey = (m: string | null) => m ? m.toLowerCase().replace('-', '') : null;
  const matKey = getMaterialKey(selectedMaterial);

  const activeNewOrders = MOCK_NEW_ORDERS.filter(o =>
    !rejectedOrderIds.includes(o.id) &&
    (!matKey || o.materials.includes(matKey as any))
  );

  // Filter orders based on status for each tab
  const activeOrders = orders.filter(o =>
    ['pending', 'accepted', 'en_route', 'arrived'].includes(o.status) &&
    (!matKey || o.materials?.includes(matKey as any))
  );
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const mapStoreOrderToCard = (o: any) => ({
    id: o.orderId,
    distance: 'Unknown distance',
    price: o.confirmedAmount || o.estimatedAmount,
    locality: o.pickupLocality,
    window: o.window || new Date(o.createdAt).toLocaleDateString(),
    materials: o.materials,
    sellerType: o.sellerType || 'Seller',
    rating: o.rating || 5.0,
    status: o.status,
  });

  // Material filters (Active tab only)
  const materialFilters = ['All', 'Metal', 'Plastic', 'Paper', 'E-Waste', 'Glass'];

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {(['active', 'completed', 'cancelled'] as TabType[]).map((tab) => (
        <Pressable
          key={tab}
          onPress={() => setActiveTab(tab)}
          style={[
            styles.tab,
            activeTab === tab && styles.tabActive
          ]}
        >
          <Text
            variant="label"
            style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive
            ]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'active' && ` (${activeOrders.length})`}
            {tab === 'completed' && ` (${completedOrders.length})`}
            {tab === 'cancelled' && ` (${cancelledOrders.length})`}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderFilters = () => {
    if (activeTab !== 'active') return null;
    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={95} // Chip width (80) + gap (15)
          decelerationRate="fast"
          contentContainerStyle={styles.filterScroll}
        >
          {materialFilters.map((m) => (
            <Pressable
              key={m}
              onPress={() => setSelectedMaterial(m === 'All' ? null : m)}
              style={[
                styles.filterChip,
                (selectedMaterial === m || (m === 'All' && !selectedMaterial)) && styles.filterChipActive
              ]}
            >
              <Text
                variant="caption"
                style={[
                  styles.filterText,
                  (selectedMaterial === m || (m === 'All' && !selectedMaterial)) && styles.filterTextActive
                ]}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderOrderCard = (order: any, isNew: boolean = false) => (
    <BaseCard key={order.id} style={styles.card}>
      <Pressable onPress={() => router.push({ pathname: '/order-detail', params: { id: order.id } })}>
        {/* Top indicator bar */}
        <View style={[styles.cardTopBar, isNew && { backgroundColor: colors.red }]} />

        <View style={styles.cardContent}>
          {/* Row 1: ID + Distance + Price */}
          <View style={styles.cardRow}>
            <View style={styles.rowLeft}>
              <Numeric size={14} color={colors.muted} style={styles.monoText}>
                #{order.id}
              </Numeric>
              <View style={styles.dotSeparator} />
              <Text variant="caption" color={colors.muted}>
                {order.distance}
              </Text>
            </View>
            <Numeric size={20} color={colors.amber} style={styles.priceText}>
              {isNew ? `~₹${order.price}` : `₹${order.price}`}
            </Numeric>
          </View>

          {/* Row 2: Locality + High Value Label */}
          <View style={styles.cardRow}>
            <Text variant="subheading" color={colors.navy} style={styles.localityText}>
              {order.locality}
            </Text>
            {order.isHighValue && (
              <View style={styles.highValueBadge}>
                <Text variant="caption" color={colors.teal} style={styles.highValueText}>
                  High value
                </Text>
              </View>
            )}
            {order.status && (
              <View style={[styles.statusBadge, { backgroundColor: order.status === 'en_route' ? colors.amberLight : colors.tealLight }]}>
                <Text variant="caption" style={{ color: order.status === 'en_route' ? colors.amber : colors.teal, fontWeight: '700' }}>
                  {order.status === 'en_route' ? 'En Route' : order.status === 'arrived' ? 'Arrived' : 'Accepted'}
                </Text>
              </View>
            )}
          </View>

          {/* Row 3: Window */}
          <View style={[styles.cardRow, { marginTop: 0 }]}>
            <View style={styles.rowLeft}>
              <Clock size={14} color={colors.muted} />
              <Text variant="caption" color={colors.muted} style={{ marginLeft: 4 }}>
                {order.window}
              </Text>
            </View>
          </View>

          {/* Materials */}
          <View style={styles.materialsRow}>
            {order.materials.map((m: MaterialCode) => (
              <MaterialChip key={m} material={m} variant="chip" />
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Seller Info */}
          <View style={styles.sellerRow}>
            <View style={styles.sellerLeft}>
              <Avatar name={order.sellerType} userType="seller" size="sm" />
              <View style={styles.sellerTextWrap}>
                <Text variant="label" color={colors.navy}>
                  {order.sellerType}
                </Text>
                <Text variant="caption" color={colors.muted}>
                  Rated {order.rating}
                </Text>
              </View>
            </View>
            {isNew && (
              <View style={styles.newBadge}>
                <Text variant="caption" color={colors.teal} style={styles.newBadgeText}>
                  NEW
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {isNew ? (
              <>
                <PrimaryButton
                  label="✓ Accept Order"
                  style={styles.acceptBtn}
                  textStyle={styles.acceptBtnText}
                  onPress={() => console.log('Accept', order.id)}
                />
                <SecondaryButton
                  label="Chat"
                  style={styles.chatBtn}
                  textStyle={styles.chatBtnText}
                  onPress={() => router.push(`/(shared)/chat/${order.id}`)}
                />
                <IconButton
                  icon={<X size={20} color={colors.navy} />}
                  accessibilityLabel="Reject order"
                  style={styles.rejectBtn}
                  onPress={() => {
                    useOrderStore.getState().rejectOrder(order.id);
                  }}
                />
              </>
            ) : (
              <>
                <PrimaryButton
                  label={order.status === 'arrived' ? "Start Weighing" : order.status === 'en_route' ? "Mark Arrived" : "Navigate"}
                  style={styles.actionBtn}
                  onPress={() => {
                    if (order.status === 'arrived') {
                      router.push(`/(aggregator)/execution/weighing/${order.id}` as any);
                    } else {
                      router.push(`/(aggregator)/execution/navigate` as any);
                    }
                  }}
                />
                <IconButton
                  icon={<X size={20} color={colors.red} />}
                  accessibilityLabel="Cancel accepted order"
                  style={[styles.rejectBtn, { borderColor: colors.red }]}
                  onPress={() => {
                    // Update global store to mark order as cancelled
                    useOrderStore.getState().updateOrderStatus(order.id, 'cancelled');
                  }}
                />
              </>
            )}
          </View>
        </View>
      </Pressable>
    </BaseCard>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {/* Online/Offline Toggle Card */}
      <BaseCard style={styles.toggleCard}>
        <View style={styles.toggleContent}>
          <View>
            <Text variant="label" color="#FFFFFF">
              Status: {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.7)">
              {isOnline ? 'Receiving new orders' : 'Go online to see orders'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: '#3E4E68', true: '#1A6B63' }} // Use hardcoded teal for switch if tokens are tricky
            thumbColor="#FFFFFF"
          />
        </View>
      </BaseCard>

      <View style={styles.emptyContent}>
        <MagnifyingGlass size={48} color={colors.border} weight="light" />
        <Text variant="subheading" color={colors.muted} style={{ marginTop: spacing.md }}>
          No orders right now
        </Text>
        <Text variant="caption" color={colors.muted} style={{ textAlign: 'center', marginTop: 4 }}>
          {isOnline ? 'Scanning your area for new scrap pickups...' : 'You are currently offline.'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <NavBar
        title="Order Feed"
        variant="light"
        rightAction={
          <View style={styles.navBadge}>
            <Text variant="caption" style={styles.navBadgeText}>
              6 new
            </Text>
          </View>
        }
      />

      {renderTabs()}
      {renderFilters()}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* New Orders Section */}
        {activeNewOrders.length > 0 && (
          <View style={styles.sectionGroup}>
            <View style={styles.sectionHeader}>
              <Text variant="subheading">New Requests</Text>
              <View style={styles.badgeNew}>
                <Text style={styles.badgeNewText}>{activeNewOrders.length}</Text>
              </View>
            </View>
            <View style={styles.cardList}>
              {activeNewOrders.map(order => renderOrderCard(order, true))}
            </View>
          </View>
        )}
        {activeTab === 'active' ? (
          <View style={styles.cardList}>
            {activeOrders.map(order => renderOrderCard(mapStoreOrderToCard(order), false))}
          </View>
        ) : activeTab === 'completed' ? (
          <View style={styles.cardList}>
            {completedOrders.length > 0 ? (
              completedOrders.map(order => renderOrderCard(mapStoreOrderToCard(order), false))
            ) : (
              renderEmptyState()
            )}
          </View>
        ) : (
          <View style={styles.cardList}>
            {cancelledOrders.length > 0 ? (
              cancelledOrders.map(order => renderOrderCard(mapStoreOrderToCard(order), false))
            ) : (
              renderEmptyState()
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  navBadge: {
    backgroundColor: colors.red,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-SemiBold',
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  tabActive: {
    backgroundColor: colors.navy,
  },
  tabText: {
    color: colors.muted,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-SemiBold',
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 12,
  },
  filterChip: {
    width: 82,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterText: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  sectionGroup: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  badgeNew: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeNewText: {
    color: colors.surface,
    fontSize: 10,
    fontFamily: 'DMMono-Bold',
  },
  cardList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  cardTopBar: {
    height: 2,
    backgroundColor: colors.border,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monoText: {
    fontFamily: 'DMMono-Regular',
    fontSize: 12,
  },
  priceText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 18,
  },
  dotSeparator: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  localityText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    flex: 1,
  },
  highValueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: colors.tealLight,
  },
  highValueText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 9,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  materialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  sellerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sellerTextWrap: {
    gap: 0,
  },
  newBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  acceptBtn: {
    flex: 3,
    height: 40,
    backgroundColor: colors.red,
  },
  acceptBtnText: {
    fontSize: 13,
  },
  chatBtn: {
    flex: 1.5,
    height: 40,
  },
  chatBtnText: {
    fontSize: 13,
  },
  rejectBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    backgroundColor: colors.navy,
  },
  fullWidthBtn: {
    width: '100%',
    height: 40,
    backgroundColor: colors.navy,
  },
  carouselContainer: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: spacing.md,
  },
  toggleCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.xxl,
  },
  toggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
});
