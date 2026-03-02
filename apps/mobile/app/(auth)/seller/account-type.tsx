/**
 * app/(auth)/seller/account-type.tsx
 * ──────────────────────────────────────────────────────────────────
 * Screen 1 of Seller Onboarding.
 * No back button.
 * Step Indicator: • o o
 * Choose between Individual and Business/Scrap Yard.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { colors, radius, spacing } from '../../../constants/tokens';
import { useAuthStore } from '../../../store/authStore';

// Temporary local step indicator component (can be extracted if needed globally, but used just for these 3 screens)
export function StepIndicator({ step }: { step: number }) {
  return (
    <View style={styles.stepContainer}>
      <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />
      <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
      <View style={[styles.stepDot, step === 3 && styles.stepDotActive]} />
    </View>
  );
}

export default function AccountTypeScreen() {
  const [selectedType, setSelectedType] = useState<'individual' | 'business' | null>(null);
  const { setAccountType } = useAuthStore();

  const handleContinue = () => {
    if (selectedType) {
      setAccountType(selectedType);
      // Profile Setup (seller-setup) always comes next
      router.push('/(auth)/seller/seller-setup' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Back button added per user request */}
      <NavBar title="Account Type" variant="light" onBack={() => router.back()} />
      
      <View style={styles.content}>
        <View style={styles.headerArea}>
          <Text variant="heading" style={styles.title}>What describes you best?</Text>
          <Text variant="caption" style={styles.subtitle}>
            This helps us tailor your experience
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedType === 'individual' && styles.optionCardActive
            ]}
            onPress={() => setSelectedType('individual')}
            activeOpacity={0.8}
          >
            {/* Hex allowed per MEMORY.md exception rule for specific card icons */}
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceGreenLight }]}>
              <Text variant="body" style={{ fontSize: 24, lineHeight: 28 }}>🏠</Text>
            </View>
            <View style={styles.optionTextWrap}>
              <Text variant="subheading" color={selectedType === 'individual' ? colors.navy : colors.slate}>Individual / Household</Text>
              <Text variant="caption" color={colors.muted} style={{ marginTop: 4, lineHeight: 18 }}>Sell scrap from home or office. Simple flow — no GST required.</Text>
              <View style={styles.pillRow}>
                <View style={styles.pill}><Text variant="caption" color={colors.navy} style={{ fontWeight: '600' }}>5–50 kg</Text></View>
                <View style={styles.pill}><Text variant="caption" color={colors.navy} style={{ fontWeight: '600' }}>Occasional</Text></View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedType === 'business' && styles.optionCardActive
            ]}
            onPress={() => setSelectedType('business')}
            activeOpacity={0.8}
          >
            {/* Hex allowed per MEMORY.md exception rule for specific card icons */}
            <View style={[styles.iconWrap, { backgroundColor: colors.material.glass.bg }]}>
              <Text variant="body" style={{ fontSize: 24, lineHeight: 28 }}>🏭</Text>
            </View>
            <View style={styles.optionTextWrap}>
              <Text variant="subheading" color={selectedType === 'business' ? colors.navy : colors.slate}>Business / Industry</Text>
              <Text variant="caption" color={colors.muted} style={{ marginTop: 4, lineHeight: 18 }}>Factory or warehouse. GST invoices, recurring schedules, team access.</Text>
              <View style={styles.pillRow}>
                <View style={styles.pill}><Text variant="caption" color={colors.navy} style={{ fontWeight: '600' }}>500 kg+</Text></View>
                <View style={styles.pill}><Text variant="caption" color={colors.navy} style={{ fontWeight: '600' }}>GST invoice</Text></View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Continue"
            onPress={handleContinue}
            disabled={!selectedType}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerArea: {
    marginBottom: spacing.xl,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.teal,
    width: 24,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
  },
  optionsContainer: {
    flex: 1,
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  optionCardActive: {
    borderColor: colors.teal,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.material.metal.bg, // Basic grey for pill bg
  },
  footer: {
    marginTop: 'auto',
  },
});
