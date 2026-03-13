/**
 * app/(auth)/seller/seller-setup.tsx
 * ──────────────────────────────────────────────────────────────────
 * Screen 2 of Seller Onboarding.
 * Back button: Yes
 * Step Indicator: o • o
 * Profile inputs: Name, Locality, City
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { Input } from '../../../components/ui/Input';
import { PrimaryButton } from '../../../components/ui/Button';
import { colors, radius, spacing, colorExtended } from '../../../constants/tokens';
import { useAuthStore } from '../../../store/authStore';
import { safeBack } from '../../../utils/navigation';
import { api } from '../../../lib/api';

export default function SellerSetupScreen() {
  const { setName, setLocality, setCity, name, locality, city, accountType } = useAuthStore();

  // Local state for smooth interaction, though we could just use the store directly
  const [localName, setLocalName] = useState(name);
  const [localLocality, setLocalLocality] = useState(locality);
  const [localCity, setLocalCity] = useState(city || 'Hyderabad'); // Defaulting to Hyderabad based on UI mocks

  const [isLoading, setIsLoading] = useState(false);
  const isValid = localName.trim().length > 0 && localLocality.trim().length > 0 && localCity.trim().length > 0;

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // 1. Update backend profile
      await api.post('/api/users/profile', {
        name: localName,
        profile_type: accountType, // individual or business
        locality: localLocality,
        city_code: 'HYD', // Primary pilot city
      });

      // 2. Update local store
      setName(localName);
      setLocality(localLocality);
      setCity(localCity);

      // 3. Choose next screen based on account type
      if (accountType === 'business') {
        router.replace('/(auth)/seller/business-setup' as any);
      } else {
        router.replace('/(seller)/home' as any);
      }
    } catch (e) {
      console.error('Failed to update seller profile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <NavBar
        title="Set Up Profile"
        variant="light"
        onBack={() => safeBack('/(auth)/seller/account-type')}
        rightAction={<Text variant="caption" color={colors.muted}>Step 2 of 3</Text>}
      />

      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerArea}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarPlaceholder}>
                <Text variant="heading" style={{ color: colors.surface }}>R</Text>
              </View>
              <Text variant="caption" color={colors.muted}>Optional · Tap to add photo</Text>
            </View>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="e.g. Ravi Kumar"
              value={localName}
              onChangeText={setLocalName}
              autoCapitalize="words"
            />

            <Input
              label="Locality/Area"
              placeholder="e.g. Kondapur"
              value={localLocality}
              onChangeText={setLocalLocality}
            />

            <View style={styles.inputGroup}>
              <Text variant="label" style={styles.inputLabel}>City</Text>
              <View style={styles.disabledInputRow}>
                <Text variant="body" color={colors.navy}>Hyderabad</Text>
                <View style={styles.pilotPill}>
                  <Text variant="caption" color={colors.muted} style={{ fontSize: 11 }}>Pilot 🔒</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoBanner}>
              <Text variant="body" style={{ fontSize: 16 }}>📍</Text>
              <Text variant="caption" color={colors.slate} style={{ flex: 1, lineHeight: 18 }}>
                Your precise address is only shared with an aggregator after they accept your order.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="Create Account"
            onPress={handleContinue}
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
    paddingTop: 20,
    paddingBottom: spacing.lg,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.xs,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    marginBottom: spacing.xs,
    color: colors.slate,
  },
  disabledInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colorExtended.surface2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    height: 52,
    paddingHorizontal: spacing.md,
  },
  pilotPill: {
    backgroundColor: colors.bg,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start', // allow multiline text wrapping correctly
    backgroundColor: colorExtended.surface2, // Using surface2 as a close matching proxy for the info card or I could use the specific BG color.
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});
