/**
 * app/(seller)/agg-profile.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator Profile Screen (S31)
 * ──────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, View, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Star } from 'phosphor-react-native';
import { colors, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { StatusBar } from 'expo-status-bar';
import { safeBack } from '../../utils/navigation';
import { api } from '../../lib/api';

type AggregatorRate = {
  materialCode: string;
  ratePerKg: number;
};

type AggregatorReview = {
  reviewerName: string;
  score: number;
  review: string;
  createdAt: string;
};

type AggregatorProfileResponse = {
  id: string;
  createdAt: string;
  name: string;
  aggregatorTypeLabel: string;
  isOnline: boolean;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  stats: {
    pickups: number;
    completionRate: number;
    avgPickupMinutes: number;
  };
  rates: AggregatorRate[];
  operatingAreas: string[];
  operatingHoursSummary: string;
  reviews: AggregatorReview[];
};

const MATERIAL_LABEL: Record<string, string> = {
  metal: '⚙️ Metal (Iron)',
  paper: '📄 Paper',
  plastic: '🧴 Plastic',
  ewaste: '💻 E-Waste',
  fabric: '👗 Fabric',
  glass: '🍶 Glass',
};

const formatReviewDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const calculateYearsActive = (createdAtIso: string): number => {
  try {
    const createdDate = new Date(createdAtIso);
    const now = new Date();
    const years = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(years);
  } catch {
    return 0;
  }
};

const resolveRouteParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim();
  }

  return String(value ?? '').trim();
};

export default function AggregatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const aggregatorId = resolveRouteParam(id);

  const [profile, setProfile] = React.useState<AggregatorProfileResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      if (!aggregatorId) {
        setError('Aggregator not found');
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get(`/api/aggregators/${encodeURIComponent(aggregatorId)}/public-profile`);
        if (!active) return;
        setProfile(res.data as AggregatorProfileResponse);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.response?.data?.error ?? err?.message ?? 'Failed to load profile');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [aggregatorId]);

  const displayName = profile?.name ?? '';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const heroSubtitle = profile?.aggregatorTypeLabel ?? '';
  const ratingValue = Number(profile?.rating ?? 0);
  const ratingStars = Math.max(0, Math.min(5, Math.round(ratingValue)));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <NavBar
        variant="dark"
        title="Aggregator Profile"
        onBack={() => safeBack('/(seller)/home')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.bg }}
        showsVerticalScrollIndicator={false}
      >
        {/* Anti-gap filler for top overscroll */}
        <View style={styles.overscrollFiller} />

        {/* Dark Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarInitial || ' '}</Text>
            </View>
            <View style={styles.heroInfo}>
              {profile ? (
                <>
                  <Text style={styles.aggName}>{displayName}</Text>
                  <Text style={styles.aggType}>{heroSubtitle}</Text>
                  <View style={styles.ratingRow}>
                    <View style={styles.stars}>
                      {[0, 1, 2, 3, 4].map((index) => (
                        <Star
                          key={`hero-star-${index}`}
                          size={16}
                          weight={index < ratingStars ? 'fill' : 'regular'}
                          color={index < ratingStars ? colors.amber : colors.muted}
                        />
                      ))}
                    </View>
                    <Numeric style={styles.ratingText}>
                      {ratingValue.toFixed(1)} · {profile.stats.pickups} pickups
                    </Numeric>
                  </View>
                </>
              ) : (
                <Text style={styles.aggType}>
                  {isLoading ? 'Loading profile from backend...' : 'Profile details unavailable'}
                </Text>
              )}
            </View>
            <View style={styles.kycBadge}>
              <Text style={styles.kycText}>{profile ? (profile.isVerified ? '✓ Verified' : 'Pending') : '...'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pageContent}>
          {isLoading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.navy} />
              <Text variant="caption" color={colors.muted}>Loading aggregator profile...</Text>
            </View>
          )}

          {!isLoading && error && (
            <View style={styles.errorWrap}>
              <Text variant="caption" color={colors.red}>{error}</Text>
            </View>
          )}

          {!isLoading && !error && profile && (
            <>
          {/* Stats Strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statCard}>
              <Numeric style={styles.statValue}>{profile.stats.pickups}</Numeric>
              <Text variant="caption" color={colors.muted}>Pickups</Text>
            </View>
            <View style={styles.statCard}>
              <Numeric style={[styles.statValue, { color: colors.teal }]}>
                {Math.round(profile.stats.completionRate)}%
              </Numeric>
              <Text variant="caption" color={colors.muted}>Completion</Text>
            </View>
            <View style={styles.statCard}>
              <Numeric style={[styles.statValue, { fontSize: 16 }]}> 
                {Math.round(profile.stats.avgPickupMinutes || 0)} min
              </Numeric>
              <Text variant="caption" color={colors.muted}>Avg. pickup</Text>
            </View>
          </View>

          {/* Material Rates */}
          <View style={styles.card}>
            <Text variant="body" style={styles.cardTitle}>Material Rates</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text variant="caption" color={colors.muted} style={styles.thLeft}>Material</Text>
              </View>
              {profile.rates.length === 0 ? (
                <View style={[styles.tableRow, styles.tableRowLast]}>
                  <Text variant="caption" color={colors.muted}>No rates configured yet.</Text>
                </View>
              ) : (
                profile.rates.map((rate, index) => {
                  const isLast = index === profile.rates.length - 1;
                  const label = MATERIAL_LABEL[rate.materialCode] ?? rate.materialCode;
                  return (
                    <View key={`${rate.materialCode}-${index}`} style={[styles.tableRow, isLast && styles.tableRowLast]}>
                      <Text variant="body">{label}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Operating Details */}
          <View style={styles.card}>
            <Text variant="body" style={styles.cardTitle}>Operating Details</Text>
            <View style={styles.listRow}>
              <Text variant="body" style={styles.iconEmoji}>📍</Text>
              <View style={styles.listContent}>
                <Text variant="body" style={styles.listTitle}>
                  {profile.operatingAreas.length > 0
                    ? profile.operatingAreas.join(', ')
                    : 'Not configured'}
                </Text>
                <Text variant="caption" color={colors.muted}>Operating area</Text>
              </View>
            </View>
            <View style={[styles.listRow, styles.tableRowLast]}>
              <Text variant="body" style={styles.iconEmoji}>🕐</Text>
              <View style={styles.listContent}>
                <Text variant="body" style={styles.listTitle}>{profile.operatingHoursSummary || 'Not set'}</Text>
                <Text variant="caption" color={colors.muted}>Operating hours</Text>
              </View>
            </View>
              <View style={[styles.listRow, styles.tableRowLast]}>
                <Text variant="body" style={styles.iconEmoji}>📅</Text>
                <View style={styles.listContent}>
                  <Text variant="body" style={styles.listTitle}>
                    {calculateYearsActive(profile.createdAt) || 'Recently joined'} year{calculateYearsActive(profile.createdAt) !== 1 ? 's' : ''}
                  </Text>
                  <Text variant="caption" color={colors.muted}>Using app</Text>
                </View>
              </View>
          </View>

          {/* Recent Reviews */}
          <View style={styles.reviewsSection}>
            <Text variant="body" style={styles.cardTitle}>Recent Reviews</Text>

            {profile.reviews.length === 0 ? (
              <View style={styles.reviewCard}>
                <Text variant="caption" style={styles.reviewText}>No reviews yet.</Text>
              </View>
            ) : (
              profile.reviews.map((review, index) => {
                const reviewerInitial = review.reviewerName.charAt(0).toUpperCase() || 'U';
                const filledStars = Math.max(0, Math.min(5, Math.round(review.score)));

                return (
                  <View key={`review-${index}`} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerInfo}>
                        <View style={styles.reviewerAvatar}><Text style={styles.reviewerInit}>{reviewerInitial}</Text></View>
                        <Text variant="body" style={styles.reviewerName}>{review.reviewerName}</Text>
                      </View>
                      <View style={styles.stars}>
                        {[0, 1, 2, 3, 4].map((starIndex) => (
                          <Star
                            key={`review-${index}-star-${starIndex}`}
                            size={14}
                            weight={starIndex < filledStars ? 'fill' : 'regular'}
                            color={starIndex < filledStars ? colors.amber : colors.muted}
                          />
                        ))}
                      </View>
                    </View>
                    <Text variant="caption" style={styles.reviewText}>
                      {review.review || 'No written feedback.'}
                    </Text>
                    <Numeric style={styles.reviewDate}>{formatReviewDate(review.createdAt)}</Numeric>
                  </View>
                );
              })
            )}
          </View>
            </>
          )}
        </View>
      </ScrollView>

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
    paddingTop: 10,
    paddingBottom: 24,
  },
  overscrollFiller: {
    position: 'absolute',
    top: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: colors.navy,
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
  },
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  errorWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});
