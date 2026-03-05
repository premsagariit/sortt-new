/**
 * app/(seller)/listing/step3.tsx
 * ──────────────────────────────────────────────────────────────────
 * Step 3: Pickup Preference
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Truck, Storefront } from 'phosphor-react-native';

import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { WizardStepIndicator } from '../../../components/ui/WizardStepIndicator';
import { Input } from '../../../components/ui/Input';
import { colors, radius, spacing } from '../../../constants/tokens';
import { useListingStore } from '../../../store/listingStore';
import { useAuthStore } from '../../../store/authStore';

import DateTimePicker from '@react-native-community/datetimepicker';

const TIMES = ['8–10 AM', '10–12 PM', '12–2 PM', '2–4 PM', '4–6 PM', 'Evening'];

export default function Step3Screen() {
  const {
    pickupType,
    scheduledDate,
    scheduledTime,
    addressLine,
    notes,
    setPickupType,
    setScheduledDate,
    setScheduledTime,
    setAddressLine,
    setNotes,
  } = useListingStore();

  const locality = useAuthStore((s) => s.locality);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setScheduledDate(selectedDate.toISOString());
    }
  };

  // Pre-fill address if empty
  useEffect(() => {
    if (!addressLine && locality) {
      setAddressLine('Flat 4B, Shanti Apartments, Road No. 5, Banjara Hills, Hyderabad 500034'); // From HTML
    }
  }, [locality, addressLine, setAddressLine]);

  // Validation
  const canProceed =
    pickupType === 'dropoff' ||
    (pickupType === 'scheduled' && scheduledDate && scheduledTime && addressLine.trim().length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NavBar
        title="List Scrap"
        onBack={() => router.back()}
        rightAction={<Text variant="caption" style={{ color: colors.navy }}>Step 3 of 4</Text>}
      />

      <View style={styles.content}>
        <WizardStepIndicator currentStep={3} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text variant="heading">Pickup preference</Text>
          </View>

          {/* Type Selection */}
          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeCard, pickupType === 'scheduled' ? styles.typeSelected : styles.typeUnselected]}
              onPress={() => setPickupType('scheduled')}
            >
              <Truck size={32} color={pickupType === 'scheduled' ? colors.surface : colors.navy} weight="duotone" />
              <Text variant="label" style={{ color: pickupType === 'scheduled' ? colors.surface : colors.navy, marginTop: spacing.sm, textAlign: 'center' }}>
                Pickup from my location
              </Text>
              <Text variant="caption" style={{ color: pickupType === 'scheduled' ? 'rgba(255,255,255,0.7)' : colors.muted, marginTop: 2, textAlign: 'center' }}>
                Aggregator comes to you · Free
              </Text>
            </Pressable>

            <Pressable
              style={[styles.typeCard, pickupType === 'dropoff' ? styles.typeSelected : styles.typeUnselected]}
              onPress={() => setPickupType('dropoff')}
            >
              <Storefront size={32} color={pickupType === 'dropoff' ? colors.surface : colors.navy} weight="duotone" />
              <Text variant="label" style={{ color: pickupType === 'dropoff' ? colors.surface : colors.navy, marginTop: spacing.sm, textAlign: 'center' }}>
                Drop-off at aggregator
              </Text>
              <Text variant="caption" style={{ color: pickupType === 'dropoff' ? 'rgba(255,255,255,0.7)' : colors.muted, marginTop: 2, textAlign: 'center' }}>
                You bring the scrap · Higher rate
              </Text>
            </Pressable>
          </View>

          {/* Scheduled Details */}
          {pickupType === 'scheduled' && (
            <View style={styles.detailsContainer}>
              <Text variant="subheading" style={styles.sectionTitle}>Pickup Address</Text>
              <TextInput
                style={styles.addressArea}
                value={addressLine || 'Flat 4B, Shanti Apartments, Road No. 5, Banjara Hills, Hyderabad 500034'}
                onChangeText={setAddressLine}
                placeholder="Enter complete address"
                multiline
              />

              <View style={styles.mapPlaceholder}>
                <Text style={{ fontSize: 28 }}>📍</Text>
                <Text variant="caption" color={colors.slate} style={styles.mapPinText}>Tap to adjust pin</Text>
              </View>

              <Text variant="subheading" style={styles.sectionTitle}>Preferred Date</Text>

              {Platform.OS === 'ios' ? (
                <View style={styles.iosPickerContainer}>
                  <DateTimePicker
                    value={scheduledDate ? new Date(scheduledDate) : new Date()}
                    mode="date"
                    display="inline"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    style={styles.datePickerBtn}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text variant="body" color={scheduledDate ? colors.navy : colors.muted}>
                      {scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Select Date'}
                    </Text>
                    <Text>📅</Text>
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={scheduledDate ? new Date(scheduledDate) : new Date()}
                      mode="date"
                      display="calendar"
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}

              <Text variant="subheading" style={styles.sectionTitle}>Preferred Time</Text>
              <View style={styles.timeGrid}>
                {TIMES.map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.timeChip, scheduledTime === t ? styles.chipSelected : styles.chipUnselected]}
                    onPress={() => setScheduledTime(t)}
                  >
                    <Text variant="caption" style={{ color: scheduledTime === t ? colors.surface : colors.navy, textAlign: 'center' }}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {pickupType === 'dropoff' && (
            <View style={styles.detailsContainer}>
              <View style={styles.mapPlaceholder}>
                <Text variant="caption" color={colors.slate}>Drop-off at nearest aggregator</Text>
                <Text variant="caption" color={colors.muted} style={{ marginTop: 4 }}>Aggregator mapping logic coming soon</Text>
              </View>
            </View>
          )}

        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="Next →"
            disabled={!canProceed}
            onPress={() => router.push('/(seller)/listing/step4')}
          />
        </View>
      </View>
    </SafeAreaView>
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
  header: {
    marginBottom: spacing.lg,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  typeCard: {
    flex: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  typeSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  typeUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },

  detailsContainer: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  dateChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 64,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    width: '31%',
  },
  chipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  mapPlaceholder: {
    backgroundColor: colors.surface,
    height: 120,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    position: 'relative',
  },
  mapPinText: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
  },
  addressArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.btn,
    padding: spacing.md,
    color: colors.navy,
    minHeight: 60,
    textAlignVertical: 'top',
  },


  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
  iosPickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  datePickerBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.btn,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
});
