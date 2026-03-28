/**
 * app/(aggregator)/profile/buy-rates.tsx
 * ──────────────────────────────────────────────────────────────────
 * Aggregator "My Buy Rates" — UI matches materials-setup.tsx style.
 * Standard materials only (no custom). Select/deselect + set rate.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CheckCircle, Lightbulb } from 'phosphor-react-native';
import { useFocusEffect } from 'expo-router';

import { colors, spacing, radius } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { NavBar } from '../../../components/ui/NavBar';
import { PrimaryButton } from '../../../components/ui/Button';
import { useAggregatorStore } from '../../../store/aggregatorStore';

// ── Standard material definitions ────────────────────────────────
// These map 1-to-1 with order_items.material_code values in the DB.
// Only standard codes trigger notifications/feed matching.

interface MaterialDef {
  code: string;
  name: string;
  avgRateHint: number;
}

const STANDARD_MATERIALS: MaterialDef[] = [
  { code: 'metal',   name: 'Metal',   avgRateHint: 35 },
  { code: 'paper',   name: 'Paper',   avgRateHint: 12 },
  { code: 'plastic', name: 'Plastic', avgRateHint: 8  },
  { code: 'ewaste',  name: 'E-Waste', avgRateHint: 60 },
  { code: 'fabric',  name: 'Fabric',  avgRateHint: 10 },
  { code: 'glass',   name: 'Glass',   avgRateHint: 5  },
];

interface LocalRate {
  code: string;
  name: string;
  avgRateHint: number;
  selected: boolean;
  rate: string; // string for TextInput
}

// ── Main Screen ───────────────────────────────────────────────────

export default function BuyRatesScreen() {
  const router = useRouter();
  const { materialRates, fetchAggregatorRates, updateRates, ratesError } = useAggregatorStore();

  const [localRates, setLocalRates] = useState<LocalRate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  // ── Build local state from saved materialRates ─────────────────
  const buildLocalRates = useCallback(() => {
    const rates: LocalRate[] = STANDARD_MATERIALS.map(m => {
      // Only match non-custom standard entries by material_code
      const saved = materialRates.find(r => r.material_code === m.code && !r.is_custom);
      return {
        code: m.code,
        name: m.name,
        avgRateHint: m.avgRateHint,
        selected: !!saved,
        rate: saved ? String(Number(saved.rate_per_kg)) : '',
      };
    });
    setLocalRates(rates);
  }, [materialRates]);

  useFocusEffect(
    useCallback(() => {
      setIsLoadingRates(true);
      fetchAggregatorRates().finally(() => setIsLoadingRates(false));
    }, [fetchAggregatorRates])
  );

  React.useEffect(() => {
    buildLocalRates();
  }, [buildLocalRates]);

  // ── Toggle selection ───────────────────────────────────────────
  const handleToggle = (code: string) => {
    setLocalRates(prev =>
      prev.map(r =>
        r.code === code
          ? { ...r, selected: !r.selected, rate: r.selected ? '' : r.rate }
          : r
      )
    );
  };

  // ── Update rate for a row ──────────────────────────────────────
  const handleRateChange = (code: string, value: string) => {
    setLocalRates(prev =>
      prev.map(r => (r.code === code ? { ...r, rate: value } : r))
    );
  };

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveError(null);

    // Validate: every selected material must have a rate > 0
    const invalidSelected = localRates.filter(
      r => r.selected && (parseFloat(r.rate) <= 0 || isNaN(parseFloat(r.rate)))
    );
    if (invalidSelected.length > 0) {
      setSaveError(
        `Please enter a valid rate for: ${invalidSelected.map(r => r.name).join(', ')}`
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = localRates
        .filter(r => r.selected && parseFloat(r.rate) > 0)
        .map(r => ({
          material_code: r.code,
          rate_per_kg: parseFloat(r.rate),
        }));

      await updateRates(payload);
      router.back();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? e?.message ?? 'Failed to save rates');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = localRates.filter(r => r.selected).length;

  // ── Render ────────────────────────────────────────────────────

  if (isLoadingRates && localRates.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <NavBar title="My Buy Rates" variant="light" onBack={() => router.back()} />
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="My Buy Rates" variant="light" onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="heading" style={styles.title}>What do you buy?</Text>
          <Text variant="body" style={styles.subtitle}>
            Select materials you accept and set your buying rate. Only selected materials will
            receive order notifications.
          </Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBox}>
          <Lightbulb size={18} color={colors.amber} weight="fill" />
          <Text variant="caption" style={styles.infoText}>
            Orders from sellers will only appear in your feed if at least one order material
            matches your selected materials below.
          </Text>
        </View>

        {ratesError ? (
          <Text variant="caption" color={colors.red} style={{ marginBottom: spacing.md }}>
            {ratesError}
          </Text>
        ) : null}

        {/* Material Cards */}
        <View style={styles.list}>
          {localRates.map(m => (
            <View
              key={m.code}
              style={[styles.card, m.selected && styles.cardSelected]}
            >
              {/* Left: Checkbox + Name */}
              <TouchableOpacity
                style={styles.cardInfo}
                onPress={() => handleToggle(m.code)}
                activeOpacity={0.7}
              >
                <CheckCircle
                  size={26}
                  color={m.selected ? colors.teal : colors.border}
                  weight={m.selected ? 'fill' : 'regular'}
                />
                <View style={styles.titleWrap}>
                  <Text variant="body" style={[styles.materialName, m.selected && styles.materialNameSelected]}>
                    {m.name}
                  </Text>
                  <Numeric size={12} color={colors.muted}>
                    Avg: ₹{m.avgRateHint}/kg
                  </Numeric>
                </View>
              </TouchableOpacity>

              {/* Right: Rate Input */}
              <View style={[styles.rateWrap, !m.selected && styles.rateWrapDisabled]}>
                <Text style={[styles.currency, !m.selected && styles.currencyDisabled]}>₹</Text>
                <TextInput
                  style={[styles.rateInput, !m.selected && styles.rateInputDisabled]}
                  value={m.rate}
                  onChangeText={val => handleRateChange(m.code, val)}
                  keyboardType="numeric"
                  editable={m.selected}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                />
                <Text style={[styles.unit, !m.selected && styles.unitDisabled]}>/kg</Text>
              </View>
            </View>
          ))}
        </View>

        {saveError ? (
          <Text variant="caption" color={colors.red} style={styles.saveError}>
            {saveError}
          </Text>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {selectedCount === 0 && (
          <Text variant="caption" color={colors.muted} style={styles.footerHint}>
            Select at least one material to save.
          </Text>
        )}
        <PrimaryButton
          label={isSaving ? 'Saving…' : `Save Rates (${selectedCount} selected)`}
          onPress={handleSave}
          disabled={isSaving || selectedCount === 0}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9EB',
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FFE8A3',
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
    color: '#4B5563',
  },
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.teal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
  },
  materialName: {
    fontWeight: '600',
    color: colors.slate,
    marginBottom: 2,
  },
  materialNameSelected: {
    color: colors.navy,
  },
  rateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    height: 46,
    minWidth: 104,
  },
  rateWrapDisabled: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderColor: 'transparent',
  },
  currency: {
    fontFamily: 'DMMono-Regular',
    fontSize: 14,
    color: colors.navy,
    marginRight: 2,
  },
  currencyDisabled: {
    color: colors.muted,
  },
  rateInput: {
    flex: 1,
    fontFamily: 'DMMono-Regular',
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    padding: 0,
  },
  rateInputDisabled: {
    color: colors.muted,
  },
  unit: {
    color: colors.muted,
    fontSize: 12,
    marginLeft: 2,
  },
  unitDisabled: {
    opacity: 0.4,
  },
  saveError: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  footerHint: {
    textAlign: 'center',
  },
});
