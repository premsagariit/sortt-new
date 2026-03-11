import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle } from 'phosphor-react-native';
import { Text, Numeric } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { NavBar } from '../../../components/ui/NavBar';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { colors, spacing, radius, colorExtended, materialBg } from '../../../constants/tokens';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { safeBack } from '../../../utils/navigation';
import { api } from '../../../lib/api';

/**
 * Aggregator Materials Setup — Step 3 of 3
 * Implements HTML screen: s-agg-materials-setup
 */
export default function AggregatorMaterialsSetup() {
  const router = useRouter();
  const { materials, setMaterialSelected, setMaterialRate } = useAggregatorStore();

  const selectedCount = materials.filter(m => m.selected).length;
  const [isLoading, setIsLoading] = React.useState(false);

  const handleFinish = async () => {
    const rates = materials
      .filter(m => m.selected)
      .map(m => ({ material_code: m.id, rate_per_kg: m.ratePerKg }));

    setIsLoading(true);
    try {
      await api.patch('/api/aggregators/rates', { rates });
      router.push('/(auth)/aggregator/kyc' as any);
    } catch (e) {
      console.error('Failed to update rates:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    safeBack('/(auth)/aggregator/area-setup');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NavBar
        title="Rates & Materials"
        variant="light"
        onBack={handleBack}
        rightAction={<Text variant="caption">Step 3 of 3</Text>}
      />

      <View style={styles.progressContainer}>
        <ProgressBar progress={1.0} color={colors.teal} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="heading" style={styles.title}>What do you buy?</Text>
          <Text variant="body" style={styles.subtitle}>
            Set your buying rates for scrap materials.
          </Text>
        </View>

        <View style={styles.list}>
          {materials.map((m) => {
            const bg = materialBg[m.bgToken as keyof typeof materialBg] || colors.bg;
            return (
              <View key={m.id} style={[styles.card, m.selected && styles.cardSelected]}>
                {/* Left: Checkbox + Name */}
                <TouchableOpacity
                  style={styles.cardInfo}
                  onPress={() => setMaterialSelected(m.id, !m.selected)}
                  activeOpacity={0.7}
                >
                  <CheckCircle
                    size={24}
                    color={m.selected ? colors.teal : colors.border}
                    weight={m.selected ? "fill" : "regular"}
                  />
                  <View style={styles.titleWrap}>
                    <Text variant="body" style={styles.materialName}>{m.name}</Text>
                    <Numeric size={12} color={colors.muted}>Avg: ₹{m.avgRateHint}/kg</Numeric>
                  </View>
                </TouchableOpacity>

                {/* Right: Rate Input */}
                <View style={[styles.rateWrap, !m.selected && styles.rateWrapDisabled]}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={String(m.ratePerKg)}
                    onChangeText={(txt) => setMaterialRate(m.id, Number(txt) || 0)}
                    keyboardType="numeric"
                    editable={m.selected}
                  />
                  <Text style={styles.unit}>/kg</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Next →"
          onPress={handleFinish}
          disabled={selectedCount === 0 || isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
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
    borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.teal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    color: colors.navy,
    marginBottom: 2,
  },
  rateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    height: 44,
    minWidth: 100,
  },
  rateWrapDisabled: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderColor: 'transparent',
  },
  currency: {
    fontFamily: 'DMMono-Regular',
    color: colors.muted,
    marginRight: 4,
  },
  rateInput: {
    flex: 1,
    fontFamily: 'DMMono-Regular',
    fontSize: 16,
    color: colors.navy,
    padding: 0,
  },
  unit: {
    color: colors.muted,
    fontSize: 12,
    marginLeft: 4,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
