import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, CheckCircle, ArrowRight, WarningCircle, Sparkle, Plus, Minus, PencilSimple } from 'phosphor-react-native';

import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { WizardStepIndicator } from '../../../components/ui/WizardStepIndicator';
import { colors, colorExtended, radius, spacing } from '../../../constants/tokens';
import { useListingStore } from '../../../store/listingStore';
import { useLanguageStore } from '../../../store/languageStore';
import { useAuthStore } from '../../../store/authStore';
import { usePhotoCapture } from '../../../hooks/usePhotoCapture';
import { MaterialCard } from '../../../components/ui/MaterialCard';
import { ImageCarouselViewer } from '../../../components/ui/ImageCarouselViewer';
import { api } from '../../../lib/api';
import { MaterialCode } from '../../../components/ui/MaterialChip';

export default function Step1Screen() {
  const { fresh } = useLocalSearchParams<{ fresh?: string }>();
  const { photoUris, isAnalyzing, addPhotoUri, removePhotoAt, setIsAnalyzing, processAiItems, resetListing, selectedMaterials, setMaterials } = useListingStore();
  const [analysisError, setAnalysisError] = useState<'manual' | null>(null);

  const language = useLanguageStore((state) => state.language);
  const { photoUri, capturePhoto, permissionDenied, isLoading, reset: resetPhoto } = usePhotoCapture();

  React.useEffect(() => {
    if (fresh === '1') {
      resetListing();
    }
  }, [fresh, resetListing]);

  const analyzePhoto = async (photoUriToAnalyze: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: photoUriToAnalyze,
        type: 'image/jpeg',
        name: 'scrap.jpg',
      } as any);

      const authToken = useAuthStore.getState().token;
      const url = `${api.defaults.baseURL}/api/scrap/analyze?language=${encodeURIComponent(language)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        setAnalysisError('manual');
        return;
      }

      const data = await response.json();

      if (data?.manual_entry_required || data?.status === 'analysis_failed' || !data.items || data.items.length === 0) {
        setAnalysisError('manual');
      } else {
        processAiItems(data.items);
      }
    } catch (error: any) {
      setAnalysisError('manual');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Ref tracks the last URI we already sent to analyze — prevents
  // duplicate calls from StrictMode double-invocations or remounts.
  const lastAnalyzedUri = React.useRef<string | null>(null);

  useEffect(() => {
    if (photoUri && photoUri !== lastAnalyzedUri.current) {
      lastAnalyzedUri.current = photoUri;
      addPhotoUri(photoUri);
      analyzePhoto(photoUri);
    }
  }, [photoUri]);

  const handleAddPhoto = async () => {
    await capturePhoto();
  };

  const handleRemoveLast = () => {
    if (photoUris.length === 0) return;
    removePhotoAt(photoUris.length - 1);
    resetPhoto();
    setAnalysisError(null);
  };

  const handleToggleMaterial = (code: MaterialCode) => {
    if (selectedMaterials.includes(code)) {
      setMaterials(selectedMaterials.filter((m) => m !== code));
    } else {
      setMaterials([...selectedMaterials, code]);
    }
  };

  const canProceed = !isAnalyzing && selectedMaterials.length > 0;
  
  const AVAILABLE_MATERIALS: MaterialCode[] = ['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass'];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NavBar
        title="List Scrap"
        onBack={() => {
          if (router.canGoBack()) {
            router.back()
          } else {
            router.replace('/(seller)/home')
          }
        }}
        rightAction={<Text variant="caption" style={{ color: colors.navy }}>Step 1 of 4</Text>}
      />

      <View style={styles.content}>
        <WizardStepIndicator currentStep={1} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="heading">Capture Scrap Photos</Text>
            <Text variant="caption" color={colors.muted}>Our AI will analyze your scrap to estimate materials and weights automatically.</Text>
          </View>

          {permissionDenied && (
            <View style={styles.permissionBanner}>
              <WarningCircle size={16} color={colors.surface} weight="fill" />
              <Text variant="caption" color={colors.surface} style={{ flex: 1, marginLeft: spacing.xs }}>
                Camera access denied. Enable it in Settings.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            {photoUris.length === 0 ? (
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
                  {isLoading ? 'Opening camera...' : 'Tap to take a photo'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.photoBoxFilled}>
                <View style={styles.previewShell}>
                  <ImageCarouselViewer images={photoUris} height={182} autoScrollIntervalMs={4000} />

                  <View style={styles.previewTopRow}>
                    <View style={styles.photoStatus}>
                      <CheckCircle size={14} color={colors.teal} weight="fill" />
                      <Text variant="label" color={colors.teal}>{photoUris.length} photo{photoUris.length > 1 ? 's' : ''} added</Text>
                    </View>

                    <Pressable style={styles.editBtn} onPress={handleAddPhoto}>
                      <PencilSimple size={14} color={colors.navy} weight="bold" />
                      <Text variant="caption" color={colors.navy} style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                  </View>

                  <View style={styles.previewBottomRow}>
                    <View style={styles.previewCountPill}>
                      <Text variant="caption" color={colors.surface}>
                        {photoUris.length} photo{photoUris.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.captureTray}>
                  <View style={styles.thumbnailWrap}>
                    <Image
                      source={{ uri: photoUris[photoUris.length - 1] }}
                      style={styles.thumbnailImage}
                    />
                  </View>

                  <Pressable style={styles.trayActionBtn} onPress={handleAddPhoto}>
                    <Plus size={18} color={colors.navy} weight="bold" />
                  </Pressable>

                  <Pressable
                    style={styles.trayActionBtn}
                    onPress={handleRemoveLast}
                    disabled={photoUris.length === 0}
                  >
                    <Minus size={18} color={colors.navy} weight="bold" />
                  </Pressable>

                  <Text variant="caption" color={colors.muted} style={styles.captureTrayMeta}>
                    {photoUris.length} photos
                  </Text>
                </View>

                {/* AI Box */}
                <View style={styles.aiBox}>
                  {isAnalyzing ? (
                    <View style={styles.aiLoading}>
                      <ActivityIndicator size="small" color={colors.navy} />
                      <Text variant="caption" style={{ marginLeft: spacing.sm }}>Analyzing photo...</Text>
                    </View>
                  ) : analysisError === 'manual' ? (
                    <View style={styles.analysisErrorBanner}>
                      <Text variant="caption" color={colors.slate}>AI could not confidently identify materials. You can enter them manually in the next step.</Text>
                    </View>
                  ) : (
                    <View style={styles.aiHintCard}>
                      <View style={styles.aiHintRow}>
                        <Sparkle size={16} color={colors.amber} />
                        <Text variant="label" color={colors.amber}>AI Analysis Complete</Text>
                      </View>
                      <Text variant="caption" color={colors.slate} style={{ marginTop: spacing.xs }}>
                        Materials and weights have been auto-extracted! You can review and edit them in the next step.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
          
          <View style={styles.section}>
            <Text variant="heading" style={{ marginBottom: spacing.md }}>Select Materials</Text>
            <View style={styles.grid}>
              {AVAILABLE_MATERIALS.map(code => {
                const isSelected = selectedMaterials.includes(code);
                return (
                  <MaterialCard
                    key={code}
                    code={code}
                    isSelected={isSelected}
                    onPress={() => handleToggleMaterial(code)}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={isAnalyzing ? "Analyzing..." : "Next: Review Materials"}
            icon={!isAnalyzing && <ArrowRight size={18} color={colors.surface} weight="bold" />}
            onPress={() => router.push('/(seller)/listing/step2')}
            disabled={!canProceed}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl },
  photoBoxEmpty: {
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.card,
    padding: spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  photoBoxFilled: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radius.card,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  previewShell: {
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.navy,
    position: 'relative',
  },
  previewTopRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBottomRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  previewCountPill: {
    backgroundColor: 'rgba(16, 28, 50, 0.84)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  editBtnText: {
    fontFamily: 'DMSans-SemiBold',
  },
  captureTray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colorExtended.surface2,
    borderRadius: radius.btn,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.teal,
    backgroundColor: colors.navy,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  trayActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  captureTrayMeta: {
    marginLeft: 'auto',
    fontFamily: 'DMMono-Medium',
  },
  permissionBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.amber, borderRadius: radius.btn, padding: spacing.sm, marginBottom: spacing.sm, gap: spacing.xs,
  },
  aiBox: {
    backgroundColor: colorExtended.amberLight, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  aiLoading: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  analysisErrorBanner: { borderLeftWidth: 2, borderLeftColor: colors.amber, paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  aiHintCard: { gap: spacing.xs },
  aiHintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footer: { padding: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 0 },
});
