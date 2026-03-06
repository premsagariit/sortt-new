/**
 * app/(seller)/listing/step1.tsx
 * ──────────────────────────────────────────────────────────────────
 * Step 1: Material Selection
 * Back button returns to seller home.
 * Shows a grid of materials with mock earnings preview.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Nut, Jar, FileText, Laptop, TShirt, Martini, Lightbulb, ArrowRight } from 'phosphor-react-native';
import { NavBar } from '../../../components/ui/NavBar';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { WizardStepIndicator } from '../../../components/ui/WizardStepIndicator';
import { MaterialCode } from '../../../components/ui/MaterialChip';
import { colors, colorExtended, radius, spacing } from '../../../constants/tokens';
import { useListingStore } from '../../../store/listingStore';

// ── Mock data ────────────────────────────────────────────────────────
const MATERIALS: { code: MaterialCode; label: string; icon: React.ReactNode }[] = [
  { code: 'metal', label: 'Metal / Iron', icon: <Nut size={24} color={colors.navy} weight="fill" /> },
  { code: 'plastic', label: 'Plastic', icon: <Jar size={24} color={colors.navy} weight="fill" /> },
  { code: 'paper', label: 'Paper', icon: <FileText size={24} color={colors.navy} weight="fill" /> },
  { code: 'ewaste', label: 'E-Waste', icon: <Laptop size={24} color={colors.navy} weight="fill" /> },
  { code: 'fabric', label: 'Fabric', icon: <TShirt size={24} color={colors.navy} weight="fill" /> },
  { code: 'glass', label: 'Glass', icon: <Martini size={24} color={colors.navy} weight="fill" /> },
];

const RATE_ESTIMATES: Record<MaterialCode, { min: number; max: number }> = {
  metal: { min: 25, max: 35 },
  plastic: { min: 8, max: 15 },
  paper: { min: 7, max: 12 },
  ewaste: { min: 50, max: 150 },
  fabric: { min: 10, max: 18 },
  glass: { min: 2, max: 6 },
};

export default function Step1Screen() {
  const selectedMaterials = useListingStore((s) => s.selectedMaterials);
  const setMaterials = useListingStore((s) => s.setMaterials);

  const toggleMaterial = (code: MaterialCode) => {
    if (selectedMaterials.includes(code)) {
      setMaterials(selectedMaterials.filter((m) => m !== code));
    } else {
      setMaterials([...selectedMaterials, code]);
    }
  };

  // Calculate mock earnings preview (assuming 5kg per selected material)
  const calculateEstimate = () => {
    if (selectedMaterials.length === 0) return null;
    let min = 0;
    let max = 0;
    selectedMaterials.forEach((code) => {
      min += RATE_ESTIMATES[code].min * 5;
      max += RATE_ESTIMATES[code].max * 5;
    });
    return { min, max };
  };

  const estimate = calculateEstimate();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NavBar
        title="List Scrap"
        rightAction={<Text variant="caption" style={{ color: colors.navy }}>Step 1 of 4</Text>}
      />

      <View style={styles.content}>
        <WizardStepIndicator currentStep={1} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text variant="heading">What are you selling?</Text>
            <Text variant="caption" color={colors.muted}>Select all that apply</Text>
          </View>

          <View style={styles.grid}>
            {MATERIALS.map((mat) => {
              const isSelected = selectedMaterials.includes(mat.code);
              const { fg } = colors.material[mat.code]; // Original dot color

              return (
                <Pressable
                  key={mat.code}
                  style={[
                    styles.card,
                    isSelected ? styles.cardSelected : styles.cardUnselected
                  ]}
                  onPress={() => toggleMaterial(mat.code)}
                >
                  <View style={styles.cardHeader}>
                    {/* Dot */}
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: isSelected ? colors.surface : fg }
                      ]}
                    />
                    {React.cloneElement(mat.icon as React.ReactElement<any>, {
                      color: isSelected ? colors.surface : colors.navy,
                      size: 24
                    })}
                  </View>
                  <Text
                    variant="label"
                    style={{
                      color: isSelected ? colors.surface : colors.slate,
                      fontWeight: isSelected ? '700' : '500'
                    }}
                  >
                    {mat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {/* Info Banner */}
          {selectedMaterials.length > 0 && (
            <View style={styles.infoBanner}>
              <Lightbulb size={18} color={colors.teal} weight="fill" />
              <Text variant="caption" style={styles.infoText}>
                {selectedMaterials.length} material{selectedMaterials.length !== 1 ? 's' : ''} selected. Our AI will verify this in the next step.
              </Text>
            </View>
          )}

          {/* Earnings Preview */}
          <View style={styles.earningsCard}>
            {estimate ? (
              <View style={styles.estimateRow}>
                <Text variant="caption">Estimated: </Text>
                <Numeric color={colors.amber}>₹{estimate.min} – ₹{estimate.max}</Numeric>
              </View>
            ) : (
              <Text variant="caption" color={colors.muted}>Select materials to see estimated value</Text>
            )}
          </View>

          <PrimaryButton
            label="Next"
            icon={<ArrowRight size={18} color={colors.surface} weight="bold" />}
            onPress={() => router.push('/(seller)/listing/step2')}
            disabled={selectedMaterials.length === 0}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '47%', // Fits 2 per row with gap
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1.5,
  },
  cardUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  infoBanner: {
    backgroundColor: colorExtended.tealLight,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg, // To cover scroll items underneath
  },
  earningsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: colors.slate,
    lineHeight: 20,
  },
});
