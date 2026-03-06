/**
 * app/(auth)/seller/business-setup.tsx
 * ──────────────────────────────────────────────────────────────────
 * Screen 3 of Seller Onboarding.
 * Back button: Yes
 * Step Indicator: o o •
 * Inputs: Business Name, GSTIN (15 chars required), Complete Address
 * Chips: Industry Type
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { Input } from '../../../components/ui/Input';
import { PrimaryButton } from '../../../components/ui/Button';
import { StepIndicator } from './account-type';
import { colors, radius, spacing } from '../../../constants/tokens';
import { useAuthStore } from '../../../store/authStore';
import { safeBack } from '../../../utils/navigation';

const INDUSTRIES = ['Manufacturing', 'Retail', 'Corporate', 'Warehouse'] as const;

export default function BusinessSetupScreen() {
  const userType = useAuthStore((s) => s.userType);
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [industry, setIndustry] = useState<string | null>(null);

  // Validation: GSTIN must be exactly 15 characters
  const isValid = gstin.trim().length === 15;

  const handleComplete = () => {
    // Business flow finishes here
    router.replace('/(seller)/home' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <NavBar title="Business Setup" variant="light" onBack={() => safeBack('/(auth)/seller/seller-setup')} />

      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerArea}>
            <StepIndicator step={3} />
            <Text variant="heading" style={styles.title}>Business Details</Text>
            <Text variant="body" style={styles.subtitle}>
              Almost done! Help us understand your business better.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Business Name"
              placeholder="e.g. Acme Corp"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
            />

            <Input
              label="GSTIN *"
              placeholder="15-character GSTIN"
              value={gstin}
              onChangeText={setGstin}
              maxLength={15}
              autoCapitalize="characters"
              error={gstin.length > 0 && gstin.length < 15 ? 'GSTIN must be 15 characters' : undefined}
            />

            <Input
              label="Complete Address"
              placeholder="Full street address"
              value={address}
              onChangeText={setAddress}
            />

            <View style={styles.industrySection}>
              <Text variant="label" style={styles.industryLabel}>Industry Type</Text>
              <View style={styles.chipsContainer}>
                {INDUSTRIES.map((ind) => {
                  const isSelected = industry === ind;
                  return (
                    <TouchableOpacity
                      key={ind}
                      onPress={() => setIndustry(ind)}
                      activeOpacity={0.7}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive
                      ]}
                    >
                      <Text
                        variant="label"
                        color={isSelected ? colors.teal : colors.slate}
                      >
                        {ind}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="Complete Setup"
            onPress={handleComplete}
            disabled={!isValid}
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
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.muted,
  },
  form: {
    gap: spacing.sm,
  },
  industrySection: {
    marginTop: spacing.xs,
  },
  industryLabel: {
    marginBottom: spacing.sm,
    color: colors.slate,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealLight,
  },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});
