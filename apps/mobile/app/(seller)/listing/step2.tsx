/**
 * app/(seller)/listing/step2.tsx
 * ──────────────────────────────────────────────────────────────────
 * Step 2: Weights & Photo
 * Captures a mock photo, fakes an AI analysis, and collects weights.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, ActivityIndicator, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera, Tray, WarningCircle } from 'phosphor-react-native';

import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { WizardStepIndicator } from '../../../components/ui/WizardStepIndicator';
import { MaterialChip } from '../../../components/ui/MaterialChip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { colors, colorExtended, radius, spacing } from '../../../constants/tokens';
import { useListingStore } from '../../../store/listingStore';
import { usePhotoCapture } from '../../../hooks/usePhotoCapture';

export default function Step2Screen() {
  const {
    selectedMaterials,
    weights,
    photoUri: storedPhotoUri,
    aiHintShown,
    setWeight,
    setPhotoUri,
    setAiHintShown,
  } = useListingStore();

  // usePhotoCapture is the ONLY place camera is launched — never inline in screens
  const { photoUri, pickPhoto, permissionDenied, isLoading, reset: resetPhoto } = usePhotoCapture();

  // Sync hook URI into store whenever a new photo is captured
  useEffect(() => {
    if (photoUri) {
      setPhotoUri(photoUri);
      setAiHintShown(false);
    }
  }, [photoUri, setPhotoUri, setAiHintShown]);

  const handleRetake = async () => {
    resetPhoto();
    setPhotoUri(null);
    setAiHintShown(false);
    await pickPhoto();
  };

  // Source of truth for UI: store (so disabled state is never local state)
  const capturedUri = storedPhotoUri;

  const hasOneValidWeight = selectedMaterials.some(
    (m) => parseFloat(weights[m] || '0') > 0
  );

  // Disabled state reads from STORE (not local state) per hard rules
  const canProceed = capturedUri !== null && hasOneValidWeight;

  // Mock AI hint (still local — Day 8 replaces with Gemini Vision result)
  useEffect(() => {
    if (capturedUri && !aiHintShown) {
      const timer = setTimeout(() => setAiHintShown(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [capturedUri, aiHintShown, setAiHintShown]);

  if (selectedMaterials.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <NavBar
          title="List Scrap"
          onBack={() => router.back()}
          rightAction={<Text variant="caption" style={{ color: colors.navy }}>Step 2 of 4</Text>}
        />
        <WizardStepIndicator currentStep={2} />
        <EmptyState
          icon={<Tray size={48} color={colors.muted} />}
          heading="No materials selected"
          body="Please go back and select at least one material to sell."
          ctaLabel="Go Back"
          onCtaPress={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NavBar
        title="List Scrap"
        onBack={() => router.back()}
        rightAction={<Text variant="caption" style={{ color: colors.navy }}>Step 2 of 4</Text>}
      />

      <View style={styles.content}>
        <WizardStepIndicator currentStep={2} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text variant="heading">Add a photo & enter weights</Text>
            <Text variant="caption" color={colors.muted}>Photo is required · AI will analyse your scrap pile</Text>
          </View>

          {/* Permission denied inline banner */}
          {permissionDenied && (
            <View style={styles.permissionBanner}>
              <WarningCircle size={16} color={colors.surface} weight="fill" />
              <Text variant="caption" color={colors.surface} style={{ flex: 1, marginLeft: spacing.xs }}>
                Camera access denied. Enable it in Settings.
              </Text>
            </View>
          )}

          {/* Photo Section */}
          <View style={styles.section}>
            {!capturedUri ? (
              <Pressable
                style={styles.photoBoxEmpty}
                onPress={pickPhoto}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.muted} />
                ) : (
                  <Camera size={32} color={colors.muted} weight="light" />
                )}
                <Text variant="label" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                  {isLoading ? 'Opening camera...' : 'Tap to take photo'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.photoBoxFilled}>
                <Image
                  source={{ uri: capturedUri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.photoHeaderRow}>
                  <View style={styles.photoStatus}>
                    <Text variant="label" color={colors.teal}>✓ Photo added</Text>
                  </View>
                  <View style={{ width: 100 }}>
                    <SecondaryButton label="Retake" onPress={handleRetake} />
                  </View>
                </View>

                {/* AI Hint Box */}
                <View style={styles.aiBox}>
                  {!aiHintShown ? (
                    <View style={styles.aiLoading}>
                      <ActivityIndicator size="small" color={colors.navy} />
                      <Text variant="caption" style={{ marginLeft: spacing.sm }}>Analyzing photo...</Text>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.aiResultRowHeader}>
                        <View style={styles.aiEstimateTag}>
                          <Text variant="caption" color={colors.surface} style={{ fontWeight: '700' }}>AI ESTIMATE</Text>
                        </View>
                        <Text variant="caption" color={colors.teal} style={{ fontWeight: '600' }}>Analysis complete</Text>
                      </View>
                      <View style={styles.aiResultRowBody}>
                        <Text variant="label" color={colors.navy}>
                          Detected: ~12 kg Metal
                        </Text>
                        <Text variant="label" color={colors.navy} style={{ fontWeight: '700' }}>
                          ₹380–₹490
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Weights Section */}
          <View style={styles.section}>
            <Text variant="subheading" style={{ marginBottom: spacing.sm }}>
              Approximate Weights
            </Text>

            {selectedMaterials.map((code) => (
              <View key={code} style={styles.weightRow}>
                <View style={styles.chipContainer}>
                  <MaterialChip material={code} variant="chip" />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={weights[code] || ''}
                    onChangeText={(val) => setWeight(code, val)}
                    placeholder="0.0"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                  <Text variant="caption" color={colors.slate} style={styles.unitText}>kg</Text>
                </View>
              </View>
            ))}

            <View style={styles.warnBanner}>
              <Text variant="caption" style={styles.warnText}>
                ⚠️ Approximate weight is fine here. Aggregator will weigh exactly during pickup.
              </Text>
            </View>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={photoUri ? "Next →" : "Next → (Add photo first)"}
            disabled={!canProceed}
            onPress={() => router.push('/(seller)/listing/step3')}
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
  section: {
    marginBottom: spacing.xl,
  },

  // Photo
  photoBoxEmpty: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  photoBoxFilled: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radius.card,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colorExtended.tealLight,
    borderRadius: 8,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: radius.card,
    backgroundColor: colors.border,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: radius.btn,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  aiBox: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    padding: spacing.sm,
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  aiResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  aiBotIcon: {
    fontSize: 16,
  },
  aiBadge: {
    marginLeft: 24, // Align under text
  },

  // Weights
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    width: 100,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    fontFamily: 'DMMono-Regular', // Consistent config
    color: colors.navy,
    textAlign: 'right',
  },
  unitText: {
    marginLeft: spacing.xs,
  },

  aiResultRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  aiEstimateTag: {
    backgroundColor: colors.navy,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiResultRowBody: {
    flexDirection: 'column',
    gap: 2,
  },
  warnBanner: {
    flexDirection: 'row',
    backgroundColor: colors.amberLight,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginTop: spacing.sm,
  },
  warnText: {
    color: colors.slate,
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
});
