/**
 * app/(seller)/listing/step2.tsx
 * ──────────────────────────────────────────────────────────────────
 * Step 2: Weights & Photo
 * Captures a mock photo, fakes an AI analysis, and collects weights.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, ActivityIndicator, Pressable, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera, Tray, WarningCircle, CheckCircle, ArrowRight, Warning } from 'phosphor-react-native';

import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../../components/ui/Button';
import { WizardStepIndicator } from '../../../components/ui/WizardStepIndicator';
import { MaterialChip, MaterialCode, MATERIAL_LABELS } from '../../../components/ui/MaterialChip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { colors, colorExtended, radius, spacing } from '../../../constants/tokens';
import { useListingStore } from '../../../store/listingStore';
import { usePhotoCapture } from '../../../hooks/usePhotoCapture';
import { safeBack } from '../../../utils/navigation';
import { ImageCarouselViewer } from '../../../components/ui/ImageCarouselViewer';

const ALL_MATERIALS: MaterialCode[] = ['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass', 'custom'];

export default function Step2Screen() {
  const {
    selectedMaterials,
    weights,
    photoUris,
    aiHintShown,
    setWeight,
    addPhotoUri,
    removePhotoAt,
    setAiHintShown,
    setMaterials,
    customNames,
    setCustomName,
  } = useListingStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const remainingMaterials = ALL_MATERIALS.filter(m => !selectedMaterials.includes(m));

  // usePhotoCapture is the ONLY place camera is launched — never inline in screens
  const { photoUri, capturePhoto, permissionDenied, isLoading, reset: resetPhoto } = usePhotoCapture();

  // Sync hook URI into store whenever a new photo is captured
  useEffect(() => {
    if (photoUri) {
      addPhotoUri(photoUri);
      setAiHintShown(false);
    }
  }, [photoUri, addPhotoUri, setAiHintShown]);

  const handleAddPhoto = async () => {
    await capturePhoto();
  };

  const handleRemoveLast = () => {
    if (photoUris.length === 0) return;
    removePhotoAt(photoUris.length - 1);
    resetPhoto();
    setAiHintShown(false);
  };

  const handleAddMaterial = (code: MaterialCode) => {
    setMaterials([...selectedMaterials, code]);
    setShowAddModal(false);
  };

  // Source of truth for UI: store (so disabled state is never local state)
  const capturedUris = photoUris;

  const hasOneValidWeight = selectedMaterials.some(
    (m) => parseFloat(weights[m] || '0') > 0
  );

  // Disabled state reads from STORE (not local state) per hard rules
  const canProceed = capturedUris.length > 0 && hasOneValidWeight;

  // Mock AI hint (still local — Day 8 replaces with Gemini Vision result)
  useEffect(() => {
    if (capturedUris.length > 0 && !aiHintShown) {
      const timer = setTimeout(() => setAiHintShown(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [capturedUris, aiHintShown, setAiHintShown]);

  if (selectedMaterials.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <NavBar
          title="List Scrap"
          onBack={() => safeBack('/(seller)/listing/step1')}
          rightAction={<Text variant="caption" style={{ color: colors.navy }}>Step 2 of 4</Text>}
        />
        <WizardStepIndicator currentStep={2} />
        <EmptyState
          icon={<Tray size={48} color={colors.muted} />}
          heading="No materials selected"
          body="Please go back and select at least one material to sell."
          ctaLabel="Go Back"
          onCtaPress={() => safeBack('/(seller)/listing/step1')}
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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            {capturedUris.length === 0 ? (
              <Pressable
                style={styles.photoBoxEmpty}
                onPress={handleAddPhoto}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.muted} />
                ) : (
                  <Camera size={32} color={colors.muted} weight="light" />
                )}
                <Text variant="label" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                  {isLoading ? 'Opening camera...' : 'Tap to take first photo'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.photoBoxFilled}>
                <ImageCarouselViewer images={capturedUris} height={180} autoScrollIntervalMs={4000} />
                <View style={styles.photoHeaderRow}>
                  <View style={styles.photoStatus}>
                    <CheckCircle size={14} color={colors.teal} weight="fill" />
                    <Text variant="label" color={colors.teal}>{capturedUris.length} photo{capturedUris.length > 1 ? 's' : ''} added</Text>
                  </View>
                  <View style={styles.photoActionsRow}>
                    <View style={styles.photoActionBtnWrap}>
                      <SecondaryButton label="Add More" onPress={handleAddPhoto} />
                    </View>
                    <View style={styles.photoActionBtnWrap}>
                      <SecondaryButton label="Remove" onPress={handleRemoveLast} />
                    </View>
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
                  {code === 'custom' ? (
                    <TextInput
                      style={styles.customNameInput}
                      value={customNames[code] || ''}
                      onChangeText={(val) => setCustomName(code, val)}
                      placeholder="Item Name (e.g. Copper)"
                      placeholderTextColor={colors.muted}
                    />
                  ) : (
                    <MaterialChip material={code} variant="chip" />
                  )}
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

            {remainingMaterials.length > 0 && (
              <Pressable
                style={styles.addMoreBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Text variant="label" color={colors.red}>+ Add another item</Text>
              </Pressable>
            )}

            <View style={styles.warnBanner}>
              <Warning size={16} color={colors.amber} weight="fill" />
              <Text variant="caption" style={styles.warnText}>
                Approximate weight is fine here. Aggregator will weigh exactly during pickup.
              </Text>
            </View>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={capturedUris.length > 0 ? "Next" : "Next (Add photo first)"}
            icon={<ArrowRight size={18} color={colors.surface} weight="bold" />}
            disabled={!canProceed}
            onPress={() => router.push('/(seller)/listing/step3')}
          />
        </View>
      </View>

      {/* Add Material Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <View style={styles.modalContent}>
            <Text variant="subheading" style={{ marginBottom: spacing.md }}>Add Scrap Material</Text>
            <View style={styles.materialGrid}>
              {remainingMaterials.map((code) => (
                <Pressable
                  key={code}
                  style={styles.materialOption}
                  onPress={() => handleAddMaterial(code)}
                >
                  <MaterialChip material={code} variant="chip" />
                  <Text variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
                    {MATERIAL_LABELS[code]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowAddModal(false)}
            >
              <Text variant="label" color={colors.muted}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  photoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colorExtended.tealLight,
    borderRadius: 8,
  },
  photoActionsRow: {
    flexDirection: 'column',
    width: '100%',
    gap: spacing.xs,
  },
  photoActionBtnWrap: {
    flex: 1,
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
    backgroundColor: colors.blackAlpha3,
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
  customNameInput: {
    flex: 1,
    fontSize: 14,
    color: colors.navy,
    fontWeight: '600',
    paddingVertical: 4,
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
    borderColor: colors.amberAlpha30,
    marginTop: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
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
  addMoreBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  materialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  materialOption: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colorExtended.surface2,
  },
  closeBtn: {
    alignItems: 'center',
    padding: spacing.md,
  },
});
