/**
 * app/(seller)/listing/step4.tsx
 * ──────────────────────────────────────────────────────────────────
 * Step 4: Review & Submit
 * Final breakdown of earnings, weights, and pickup details.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CheckCircle, Nut, Jar, FileText, Laptop, Package, MapPin, Calendar, Info, Dress, Martini, WarningCircle } from 'phosphor-react-native';
import { api } from '../../../lib/api';
import { NavBar } from '../../../components/ui/NavBar';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { WizardStepIndicator } from '../../../components/ui/WizardStepIndicator';
import { colors, radius, spacing } from '../../../constants/tokens';
import { useListingStore } from '../../../store/listingStore';
import { MaterialCode } from '../../../components/ui/MaterialChip';
import { safeBack } from '../../../utils/navigation';

const FALLBACK_RATES: Record<MaterialCode, number> = {
  metal: 30,
  plastic: 11.5,
  paper: 9.5,
  ewaste: 100,
  fabric: 14,
  glass: 4,
  custom: 10,
};

export default function Step4Screen() {
  const {
    selectedMaterials,
    weights,
    pickupType,
    scheduledDate,
    scheduledTime,
    addressLine,
    notes,
    resetListing,
    customNames,
    submitListing,
  } = useListingStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Fetch true rates
  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await api.get('/api/rates');
        const rateMap: Record<string, number> = {};
        for (const r of res.data.rates) {
          rateMap[r.material_code] = r.rate_per_kg;
        }
        setRates((prev) => ({ ...prev, ...rateMap }));
      } catch (err) {
        // silently fallback to FALLBACK_RATES
      } finally {
        setRatesLoading(false);
      }
    }
    fetchRates();
  }, []);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (showSuccess) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        router.dismissAll(); // Resets the listing stack back to step1
        router.replace('/(seller)/home');
      }, 4000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showSuccess]);

  // Calculate Breakdown
  let totalEstimate = 0;
  const breakDownItems = selectedMaterials.map((code) => {
    const weightStr = weights[code] || '0';
    const weightNum = parseFloat(weightStr) || 0;

    // Use fetched rate or fallback
    const rate = rates[code] || FALLBACK_RATES[code] || 0;
    const itemTotal = weightNum * rate;
    totalEstimate += itemTotal;

    return {
      code,
      label: code === 'custom'
        ? (customNames[code] || 'Other Item')
        : (code.charAt(0).toUpperCase() + code.slice(1)),
      weight: weightNum,
      rate,
      total: itemTotal,
    };
  }).filter((item) => item.weight > 0);

  const handleSubmit = async () => {
    setErrorBanner(null);
    setIsSubmitting(true);
    
    const res = await submitListing();
    
    setIsSubmitting(false);
    if (res.success) {
      setShowSuccess(true);
    } else {
      const errStr = res.error || '';
      if (errStr.includes('unsupported_city')) {
        setErrorBanner('Service unavailable in this area');
      } else if (errStr.includes('geocode_failed')) {
        setErrorBanner('Address not found — please check and try again');
      } else if (errStr.includes('429')) {
        setErrorBanner("You've reached the daily listing limit");
      } else {
        setErrorBanner(errStr || 'Failed to submit listing');
      }
    }
  };

  if (showSuccess) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.teal }}>
        <SafeAreaView style={styles.successContainer} edges={['top', 'bottom']}>
          <Animated.View style={[styles.successContent, { opacity: fadeAnim }]}>
            <Animated.View style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
              <CheckCircle size={48} color={colors.teal} weight="fill" />
            </Animated.View>

            <Text variant="heading" style={styles.successTitle}>Listing Submitted!</Text>
            <Text variant="body" style={styles.successBody}>
              We're finding nearby aggregators. You'll get a notification when someone accepts.
            </Text>

            <View style={styles.successFooter}>
              <Pressable
                style={styles.backHomeBtn}
                onPress={() => {
                  if (timerRef.current) clearTimeout(timerRef.current);
                  router.dismissAll();
                  router.replace('/(seller)/home');
                }}
              >
                <Text style={styles.backHomeBtnText}>Back to Home</Text>
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NavBar
        title="Review & Submit"
        onBack={() => safeBack('/(seller)/listing/step3')}
        rightAction={<Text variant="caption" style={{ color: colors.navy }}>Step 4 of 4</Text>}
      />

      <View style={styles.content}>
        <WizardStepIndicator currentStep={4} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Earnings Card */}
          <View style={styles.earningsCard}>
            <View style={styles.earningsHeaderRow}>
              <Text variant="heading" style={{ fontSize: 16 }}>Earnings Calculator</Text>
              <View style={[styles.liveRatesPill, { backgroundColor: colors.amberLight }]}>
                {ratesLoading ? (
                  <ActivityIndicator size="small" color={colors.amber} />
                ) : (
                  <Text variant="caption" color={colors.amber} style={{ fontWeight: '600' }}>Live Rates</Text>
                )}
              </View>
            </View>

            <View style={styles.tableHeader}>
              <Text variant="caption" color={colors.slate} style={{ flex: 2 }}>Material</Text>
              <Text variant="caption" color={colors.slate} style={{ flex: 1 }}>Weight</Text>
              <Text variant="caption" color={colors.slate} style={{ flex: 1 }}>Rate</Text>
              <Text variant="caption" color={colors.slate} style={{ flex: 1, textAlign: 'right' }}>Est.</Text>
            </View>

            {breakDownItems.length > 0 ? (
              breakDownItems.map((item) => (
                <View key={item.code} style={styles.tableRow}>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {item.code === 'metal' && <Nut size={18} color={colors.surface} weight="fill" />}
                    {item.code === 'paper' && <FileText size={18} color={colors.surface} weight="fill" />}
                    {item.code === 'plastic' && <Jar size={18} color={colors.surface} weight="fill" />}
                    {item.code === 'ewaste' && <Laptop size={18} color={colors.surface} weight="fill" />}
                    {item.code === 'fabric' && <Dress size={18} color={colors.surface} weight="fill" />}
                    {item.code === 'glass' && <Martini size={18} color={colors.surface} weight="fill" />}
                    {item.code === 'custom' && <Package size={18} color={colors.surface} weight="fill" />}
                    <Text variant="label" color={colors.surface}>{item.label}</Text>
                  </View>
                  <Text variant="body" style={styles.monoCell}>{item.weight} kg</Text>
                  <Text variant="body" color={colors.muted} style={styles.monoCell}>₹{item.rate}</Text>
                  <Text variant="body" color={colors.amber} style={[styles.monoCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                    ₹{item.total.toFixed(0)}
                  </Text>
                </View>
              ))
            ) : (
              <Text variant="body" color={colors.muted} style={{ paddingVertical: spacing.md }}>No weights entered.</Text>
            )}
          </View>

          {/* Total Earnings */}
          <View style={styles.earningsTotalRow}>
            <Text variant="subheading">Estimated Earnings</Text>
            <Text variant="heading" style={{ fontSize: 20 }}>₹{totalEstimate.toFixed(0)}</Text>
          </View>
          <Text variant="caption" color={colors.muted} style={{ textAlign: 'center', marginBottom: spacing.lg }}>
            Estimate based on today's rates · Final amount confirmed at pickup
          </Text>

          {/* Breakdown / Review Details */}
          <View style={styles.reviewCard}>
            {/* Materials */}
            <View style={styles.listRow}>
              <Package size={20} color={colors.navy} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text variant="label" color={colors.navy}>Materials</Text>
                <Text variant="caption" color={colors.slate}>
                  {breakDownItems.length > 0
                    ? breakDownItems.map(i => `${i.label} ${i.weight} kg`).join(', ')
                    : 'None'}
                </Text>
              </View>
              <Pressable onPress={() => router.push('/(seller)/listing/step2')}>
                <Text variant="caption" color={colors.red}>Edit</Text>
              </Pressable>
            </View>

            {/* Address */}
            <View style={styles.listRow}>
              <MapPin size={20} color={colors.navy} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text variant="label" color={colors.navy}>Pickup Address</Text>
                <Text variant="caption" color={colors.slate} numberOfLines={2}>
                  {pickupType === 'scheduled' ? addressLine || 'Flat 4B, Shanti Apartments...' : 'Store Drop-off'}
                </Text>
              </View>
              <Pressable onPress={() => router.push('/(seller)/listing/step3')}>
                <Text variant="caption" color={colors.red}>Edit</Text>
              </Pressable>
            </View>

            {/* Window */}
            <View style={[styles.listRow, { borderBottomWidth: 0 }]}>
              <Calendar size={20} color={colors.navy} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text variant="label" color={colors.navy}>Pickup Window</Text>
                <Text variant="caption" color={colors.slate}>
                  {pickupType === 'scheduled' ? `${scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''} · ${scheduledTime}` : 'Drop-off any time'}
                </Text>
              </View>
              <Pressable onPress={() => router.push('/(seller)/listing/step3')}>
                <Text variant="caption" color={colors.red}>Edit</Text>
              </Pressable>
            </View>
          </View>

          {errorBanner && (
            <View style={styles.errorBannerWrap}>
              <WarningCircle size={20} color={colors.red} weight="bold" />
              <Text variant="body" style={styles.errorBannerText as any}>{errorBanner}</Text>
            </View>
          )}

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Info size={18} color={colors.navy} />
            <Text variant="caption" color={colors.slate} style={{ flex: 1, lineHeight: 18 }}>
              Your listing will be sent to verified aggregators near you. You'll be notified when someone accepts.
            </Text>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={isSubmitting ? "Submitting..." : "Submit Listing"}
            disabled={isSubmitting}
            onPress={handleSubmit}
          />
        </View>
      </View >
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  earningsCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  earningsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  liveRatesPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  errorBannerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.redLight,
    padding: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.red,
  },
  errorBannerText: {
    color: colors.red,
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: spacing.xs,
    marginBottom: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    alignItems: 'center',
    gap: 4,
  },
  monoCell: {
    fontFamily: 'DMMono-Regular',
  },
  earningsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  rowIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceBlueLight,
    padding: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
  // Success Screen
  successContainer: {
    flex: 1,
    backgroundColor: colors.teal,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  successBody: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 1.5 * 14,
  },
  successFooter: {
    marginTop: 40,
    width: '100%',
  },
  backHomeBtn: {
    backgroundColor: colors.surface,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  backHomeBtnText: {
    color: colors.teal,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'DMSans-Bold',
  },
});
