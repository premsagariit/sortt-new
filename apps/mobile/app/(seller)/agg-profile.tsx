/**
 * app/(seller)/agg-profile.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Profile Screen (S31)
 * ──────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Star } from 'phosphor-react-native';
import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { StatusBar } from 'expo-status-bar';

export default function AggregatorProfileScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <NavBar
        variant="dark"
        title="Aggregator Profile"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(seller)/browse');
          }
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Dark Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroHeader}>
             <View style={styles.avatar}>
               <Text style={styles.avatarText}>K</Text>
             </View>
             <View style={styles.heroInfo}>
               <Text style={styles.aggName}>Kumar Scrap Co.</Text>
               <Text style={styles.aggType}>Mobile Aggregator · Since 2021</Text>
               <View style={styles.ratingRow}>
                 <View style={styles.stars}>
                   <Star size={16} weight="fill" color={colors.amber} />
                   <Star size={16} weight="fill" color={colors.amber} />
                   <Star size={16} weight="fill" color={colors.amber} />
                   <Star size={16} weight="fill" color={colors.amber} />
                   <Star size={16} weight="fill" color={colors.amber} />
                 </View>
                 <Numeric style={styles.ratingText}>4.8 · 142 pickups</Numeric>
               </View>
             </View>
             <View style={styles.kycBadge}>
               <Text style={styles.kycText}>✓ Verified</Text>
             </View>
          </View>
        </View>

        <View style={styles.pageContent}>
          {/* Stats Strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statCard}>
              <Numeric style={styles.statValue}>142</Numeric>
              <Text variant="caption" color={colors.muted}>Pickups</Text>
            </View>
            <View style={styles.statCard}>
              <Numeric style={[styles.statValue, { color: colors.teal }]}>98%</Numeric>
              <Text variant="caption" color={colors.muted}>Completion</Text>
            </View>
            <View style={styles.statCard}>
              <Numeric style={[styles.statValue, { fontSize: 16 }]}>22 min</Numeric>
              <Text variant="caption" color={colors.muted}>Avg. pickup</Text>
            </View>
          </View>

          {/* Material Rates */}
          <View style={styles.card}>
            <Text variant="body" style={styles.cardTitle}>Material Rates</Text>
            <View style={styles.table}>
               <View style={styles.tableHeader}>
                 <Text variant="caption" color={colors.muted} style={styles.thLeft}>Material</Text>
                 <Text variant="caption" color={colors.muted} style={styles.thRight}>Rate/kg</Text>
               </View>
               <View style={styles.tableRow}>
                 <Text variant="body">⚙️ Metal (Iron)</Text>
                 <Numeric style={styles.rateValue}>₹29</Numeric>
               </View>
               <View style={styles.tableRow}>
                 <Text variant="body">📄 Paper</Text>
                 <Numeric style={styles.rateValue}>₹12</Numeric>
               </View>
               <View style={styles.tableRow}>
                 <Text variant="body">🧴 Plastic</Text>
                 <Numeric style={styles.rateValue}>₹8</Numeric>
               </View>
                <View style={[styles.tableRow, styles.tableRowLast]}>
                 <Text variant="body">👗 Fabric</Text>
                 <Numeric style={styles.rateValue}>₹6</Numeric>
               </View>
            </View>
          </View>

          {/* Operating Details */}
          <View style={styles.card}>
             <Text variant="body" style={styles.cardTitle}>Operating Details</Text>
             <View style={styles.listRow}>
               <Text variant="body" style={styles.iconEmoji}>📍</Text>
               <View style={styles.listContent}>
                 <Text variant="body" style={styles.listTitle}>Banjara Hills, Jubilee Hills, Panjagutta</Text>
                 <Text variant="caption" color={colors.muted}>Operating area</Text>
               </View>
             </View>
             <View style={[styles.listRow, styles.tableRowLast]}>
               <Text variant="body" style={styles.iconEmoji}>🕐</Text>
               <View style={styles.listContent}>
                 <Text variant="body" style={styles.listTitle}>Mon–Sat · 8 AM – 7 PM</Text>
                 <Text variant="caption" color={colors.muted}>Operating hours</Text>
               </View>
             </View>
          </View>

          {/* Recent Reviews */}
          <View style={styles.reviewsSection}>
            <Text variant="body" style={styles.cardTitle}>Recent Reviews</Text>
            
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                 <View style={styles.reviewerInfo}>
                   <View style={styles.reviewerAvatar}><Text style={styles.reviewerInit}>R</Text></View>
                   <Text variant="body" style={styles.reviewerName}>Rahul S.</Text>
                 </View>
                 <View style={styles.stars}>
                   <Star size={14} weight="fill" color={colors.amber} />
                   <Star size={14} weight="fill" color={colors.amber} />
                   <Star size={14} weight="fill" color={colors.amber} />
                   <Star size={14} weight="fill" color={colors.amber} />
                   <Star size={14} weight="fill" color={colors.amber} />
                 </View>
              </View>
              <Text variant="caption" style={styles.reviewText}>Quick pickup, fair weighing. Very professional.</Text>
              <Numeric style={styles.reviewDate}>Feb 24, 2026</Numeric>
            </View>
            
             <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                 <View style={styles.reviewerInfo}>
                   <View style={styles.reviewerAvatar}><Text style={styles.reviewerInit}>P</Text></View>
                   <Text variant="body" style={styles.reviewerName}>Priya K.</Text>
                 </View>
                 <View style={styles.stars}>
                   <Star size={14} weight="fill" color={colors.amber} />
                   <Star size={14} weight="fill" color={colors.amber} />
                   <Star size={14} weight="fill" color={colors.amber} />
                   <Star size={14} weight="fill" color={colors.amber} />
                   <Star size={14} weight="regular" color={colors.muted} />
                 </View>
              </View>
              <Text variant="caption" style={styles.reviewText}>Good experience. Arrived 10 mins early.</Text>
              <Numeric style={styles.reviewDate}>Feb 18, 2026</Numeric>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <PrimaryButton 
          label="List Scrap for Pickup" 
          onPress={() => router.push('/(seller)/listing/step1')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  heroSection: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: '700',
  },
  heroInfo: {
    flex: 1,
  },
  aggName: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: '700',
  },
  aggType: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginTop: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
  },
  kycBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.15)', // Green tinted
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  kycText: {
    color: colors.statusOnline,
    fontSize: 11,
    fontWeight: '700',
  },
  pageContent: {
    padding: spacing.md,
  },
  statsStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: radius.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    color: colors.navy,
    fontWeight: '700',
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 12,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  thLeft: { flex: 1 },
  thRight: { width: 80, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rateValue: {
    color: colors.amber,
    fontWeight: '700',
  },
  listRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconEmoji: {
    fontSize: 16,
    marginTop: 2,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 2,
  },
  reviewsSection: {
    marginTop: 8,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.card,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerInit: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  reviewerName: {
    fontWeight: '600',
    color: colors.navy,
  },
  reviewText: {
    color: colors.slate,
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 6,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 32,
  }
});
