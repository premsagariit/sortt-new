import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Tray, Warning, ArrowRight, X } from 'phosphor-react-native';

import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { WizardStepIndicator } from '../../../components/ui/WizardStepIndicator';
import { MaterialChip, MaterialCode } from '../../../components/ui/MaterialChip';
import { SellerMaterialCard } from '../../../components/ui/SellerMaterialCard';
import { colors, colorExtended, radius, spacing } from '../../../constants/tokens';
import { useListingStore } from '../../../store/listingStore';
import { useSellerMaterialRates } from '../../../hooks/useSellerMaterialRates';

const AVAILABLE_MATERIALS: MaterialCode[] = ['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass'];

export default function Step2Screen() {
  const {
    selectedMaterials,
    weights,
    setWeight,
    setMaterials,
    customNames,
    setCustomName,
  } = useListingStore();
  const { rates } = useSellerMaterialRates();
  const ratesByCode = useMemo(() => new Map(rates.map((rate) => [rate.material_code, rate] as const)), [rates]);

  const handleToggleMaterial = (code: MaterialCode) => {
    const rate = ratesByCode.get(code);
    const isAvailable = Boolean(rate?.is_available && rate?.rate_per_kg != null);
    if (!isAvailable) return;

    if (selectedMaterials.includes(code)) {
      setMaterials(selectedMaterials.filter((m) => m !== code));
    } else {
      setMaterials([...selectedMaterials, code]);
    }
  };

  const hasOneValidWeight = selectedMaterials.some(
    (m) => parseFloat(weights[m] || '0') > 0
  );

  const canProceed = hasOneValidWeight;

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
            <Text variant="heading">Review Materials & Weights</Text>
            <Text variant="caption" color={colors.muted}>
              {selectedMaterials.length > 0
                ? "Verify AI estimates or add/remove materials manually."
                : "Add materials manually below."}
            </Text>
          </View>

          <View style={styles.section}>
            <Text variant="heading" style={{ marginBottom: spacing.md }}>Estimated Weights</Text>
            {selectedMaterials.length === 0 ? (
              <View style={styles.emptyBox}>
                <Tray size={32} color={colors.muted} />
                <Text variant="caption" color={colors.muted} style={{ marginTop: spacing.sm }}>
                  No materials selected. Choose materials below to enter weights.
                </Text>
              </View>
            ) : (
              selectedMaterials.map((code) => (
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

                  <Pressable
                    onPress={() => handleToggleMaterial(code)}
                    style={styles.removeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={14} color={colors.slate} weight="bold" />
                  </Pressable>
                </View>
              ))
            )}



            <View style={styles.warnBanner}>
              <Warning size={16} color={colors.amber} weight="fill" />
              <Text variant="caption" style={styles.warnText}>
                Approximate weight is fine here. Aggregator will weigh exactly during pickup.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="heading" style={{ marginBottom: spacing.md }}>Select Materials</Text>
            <View style={styles.grid}>
              {AVAILABLE_MATERIALS.map(code => {
                const isSelected = selectedMaterials.includes(code);
                const rate = ratesByCode.get(code);
                const isAvailable = Boolean(rate?.is_available && rate?.rate_per_kg != null);
                return (
                  <SellerMaterialCard
                    key={code}
                    code={code}
                    isSelected={isSelected}
                    isDisabled={!isAvailable}
                    ratePerKg={rate?.rate_per_kg ?? null}
                    trend={rate?.trend ?? 'flat'}
                    helpText="no aggregator is ready to accept this material."
                    onPress={() => handleToggleMaterial(code)}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={canProceed ? "Next: Select Pickup Details" : "Next (Add valid weight first)"}
            icon={canProceed && <ArrowRight size={18} color={colors.surface} weight="bold" />}
            disabled={!canProceed}
            onPress={() => router.push('/(seller)/listing/step3')}
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
  emptyBox: { 
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.xl,
    alignItems: 'center', backgroundColor: colors.surface, marginBottom: spacing.md
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'visible',
  },
  chipContainer: {
    flex: 1,
    alignItems: 'flex-start',
    paddingRight: spacing.lg,
  },
  removeBtn: {
    position: 'absolute',
    top: -11,
    right: -11,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 20,
  },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing.sm, width: 100 },
  customNameInput: { flex: 1, fontSize: 14, color: colors.navy, fontWeight: '600', paddingVertical: 4 },
  input: { flex: 1, height: 40, fontSize: 16, fontFamily: 'DMMono-Regular', color: colors.navy, textAlign: 'right' },
  unitText: { marginLeft: spacing.xs },
  footer: { padding: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.bg },
  warnBanner: { flexDirection: 'row', backgroundColor: colors.amberLight, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.amberAlpha30, marginTop: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  warnText: { color: colors.slate, flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 0 },
});
