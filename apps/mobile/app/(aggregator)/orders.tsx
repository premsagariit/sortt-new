import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, spacing } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { OrderCard, OrderStatus, MaterialCode } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PrimaryButton } from '../../components/ui/Button';
import { Truck } from 'phosphor-react-native';

const MOCK_AGG_ACTIVE = [
  { orderId: 'ORD-2841', status: 'en_route' as OrderStatus,  locality: 'Madhapur, 3rd Phase',
    materials: ['paper','metal'] as MaterialCode[],   amount: 380 },
  { orderId: 'ORD-2839', status: 'arrived' as OrderStatus,   locality: 'Kondapur, Sai Nagar',
    materials: ['ewaste','plastic'] as MaterialCode[], amount: 620 },
];

const MOCK_AGG_COMPLETED = [
  { orderId: 'ORD-2831', locality: 'Gachibowli, DLF', status: 'completed' as OrderStatus,
    materials: ['metal'] as MaterialCode[], amount: 240, time: 'Today, 9:14 AM' },
  { orderId: 'ORD-2819', locality: 'HITEC City, Madhapur', status: 'completed' as OrderStatus,
    materials: ['paper','fabric'] as MaterialCode[], amount: 180, time: 'Today, 8:02 AM' },
];

export default function AggregatorOrdersScreen() {
  const router = useRouter();
  const isAllEmpty = MOCK_AGG_ACTIVE.length === 0 && MOCK_AGG_COMPLETED.length === 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <NavBar 
        variant="light"
        title="My Orders"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(aggregator)/home');
          }
        }}
      />

      {/* Summary Strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text variant="caption" style={styles.summaryLabel}>Active: </Text>
          <Numeric size={14} color={colors.surface} style={{ fontWeight: '700' } as any}>
            2
          </Numeric>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text variant="caption" style={styles.summaryLabel}>Today: </Text>
          <Numeric size={14} color={colors.surface} style={{ fontWeight: '700' } as any}>
            ₹1,240
          </Numeric>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text variant="caption" style={styles.summaryLabel}>This week: </Text>
          <Numeric size={14} color={colors.surface} style={{ fontWeight: '700' } as any}>
            14
          </Numeric>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isAllEmpty ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon={<Truck size={48} color={colors.border} weight="thin" />}
              heading="No active orders"
              body="New orders will appear in your Home feed."
            />
          </View>
        ) : (
          <>
            {/* Active Section */}
            {MOCK_AGG_ACTIVE.length > 0 && (
              <View style={styles.section}>
                <Text variant="subheading" color={colors.navy} style={styles.sectionTitle}>
                  Active
                </Text>
                <View style={styles.list}>
                  {MOCK_AGG_ACTIVE.map(order => (
                    <Pressable 
                      key={order.orderId} 
                      style={styles.cardWrapper}
                      onPress={() => router.push(`/(shared)/order/${order.orderId}`)}
                    >
                      <OrderCard
                        orderId={order.orderId}
                        status={order.status}
                        materials={order.materials}
                        amountRupees={order.amount}
                        locality={order.locality}
                      />
                      <View style={styles.actionWrapper}>
                        <PrimaryButton 
                          label={order.status === 'en_route' ? "I've Arrived" : "Start Weighing"}
                          onPress={() => console.log(`Action on ${order.orderId}`)}
                          style={[
                            styles.actionBtn, 
                            order.status === 'en_route' ? styles.btnTeal : styles.btnNavy
                          ] as any}
                        />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Completed Section */}
            {MOCK_AGG_COMPLETED.length > 0 && (
              <View style={styles.section}>
                <Text variant="subheading" color={colors.navy} style={styles.sectionTitle}>
                  Completed Today
                </Text>
                <View style={styles.list}>
                  {MOCK_AGG_COMPLETED.map(order => (
                    <Pressable
                      key={order.orderId}
                      onPress={() => router.push(`/(shared)/order/${order.orderId}`)}
                    >
                      <OrderCard
                        orderId={order.orderId}
                        status={order.status}
                        materials={order.materials}
                        amountRupees={order.amount}
                        locality={order.locality}
                        date={order.time}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
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
  summaryStrip: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56, // roughly 56dp per spec
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
  },
  summaryDivider: {
    width: 1,
    height: 16,
    // 15% opacity surface
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    marginTop: spacing.xxl,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cardWrapper: {
    gap: spacing.xs,
  },
  actionWrapper: {
    marginTop: 4,
  },
  actionBtn: {
    width: '100%',
  },
  btnTeal: {
    backgroundColor: colors.teal,
    // Note: PrimaryButton doesn't support overriding text color easily right now, 
    // but the default PrimaryButton text is white, which fits both navy and teal.
  },
  btnNavy: {
    backgroundColor: colors.navy,
  },
});
