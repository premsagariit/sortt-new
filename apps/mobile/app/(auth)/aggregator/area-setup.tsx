import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MagnifyingGlass } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Typography';
import { PrimaryButton } from '../../../components/ui/Button';
import { NavBar } from '../../../components/ui/NavBar';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { ZoneChip } from '../../../components/ui/ZoneChip';
import { colors, spacing, radius } from '../../../constants/tokens';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { safeBack } from '../../../utils/navigation';

const POPULAR_ZONES = [
  'Banjara Hills', 'Jubilee Hills', 'Gachibowli',
  'Kondapur', 'Madhapur', 'Hitech City',
  'Manikonda', 'Miyapur'
];

/**
 * Aggregator Area Setup — Step 2 of 3
 * Implements HTML screen: s-agg-area-setup
 */
export default function AggregatorAreaSetup() {
  const router = useRouter();
  const { operatingAreas, setOperatingAreas } = useAggregatorStore();
  const [search, setSearch] = useState('');

  const handleNext = () => {
    router.push('/(auth)/aggregator/materials-setup' as any);
  };

  const handleBack = () => {
    safeBack('/(auth)/aggregator/profile-setup');
  };

  const toggleArea = (area: string) => {
    const newAreas = operatingAreas.includes(area)
      ? operatingAreas.filter(a => a !== area)
      : [...operatingAreas, area];
    setOperatingAreas(newAreas);
  };

  const filteredZones = POPULAR_ZONES.filter(z =>
    z.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NavBar
        title="Operating Area"
        variant="light"
        onBack={handleBack}
        rightAction={<Text variant="caption">Step 2 of 3</Text>}
      />

      <View style={styles.progressContainer}>
        <ProgressBar progress={0.66} color={colors.red} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="heading" style={styles.title}>Where do you operate?</Text>
          <Text variant="body" style={styles.subtitle}>
            Select the areas where you can pick up scrap.
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <MagnifyingGlass size={20} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for neighborhoods..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.section}>
          <Text variant="label" style={styles.sectionLabel}>Popular Zones</Text>
          <View style={styles.chipGrid}>
            {filteredZones.map((zone) => (
              <ZoneChip
                key={zone}
                label={zone}
                selected={operatingAreas.includes(zone)}
                onPress={() => toggleArea(zone)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Next →"
          onPress={handleNext}
          disabled={operatingAreas.length === 0}
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface, // Pure white for input
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    height: 52,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.navy,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    marginBottom: spacing.md,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
