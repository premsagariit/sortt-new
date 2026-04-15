import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../../components/ui/Typography';
import { Input } from '../../../components/ui/Input';
import { PrimaryButton } from '../../../components/ui/Button';
import { NavBar } from '../../../components/ui/NavBar';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { DayToggle } from '../../../components/ui/DayToggle';
import { colors, spacing } from '../../../constants/tokens';
import { useAggregatorStore } from '../../../store/aggregatorStore';
import { safeBack } from '../../../utils/navigation';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';

/**
 * Aggregator Profile Setup — Step 1 of 3
 * Implements HTML screen: s-agg-profile-setup
 */
export default function AggregatorProfileSetup() {
  const router = useRouter();
  const {
    fullName, businessName, aggregatorType, primaryArea,
    operatingHours, operatingDays, setProfile
  } = useAggregatorStore();
  const { token, setSession, user } = useAuthStore((s) => ({
    token: s.token,
    setSession: s.setSession,
    user: s.user,
  }));

  const isNextDisabled = !fullName || !aggregatorType || !primaryArea;
  const [isLoading, setIsLoading] = React.useState(false);

  const handleNext = async () => {
    // Guard: must have a valid auth token before hitting protected endpoints
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) {
      Alert.alert('Session Error', 'Your session expired. Please go back and verify your phone again.');
      return;
    }

    setIsLoading(true);
    try {
      const profileRes = await api.post('/api/aggregators/profile', {
        name: fullName,
        business_name: businessName || fullName,
        aggregator_type: aggregatorType,
        city_code: 'HYD', // Hardcoded for MVP
      });

      // If the backend renamed the provisional ID, update token + user ID in auth store.
      // The backend issues a fresh JWT for the new permanent ID to prevent stale-sub errors
      // on subsequent requireAuth lookups (the old tmp_ ID no longer exists in the DB).
      const idChanged: string | undefined = profileRes.data?.id_changed;
      const freshToken: string | undefined = profileRes.data?.new_token;
      if (idChanged && user) {
        const tokenToUse = freshToken || currentToken;
        console.log('[ProfileSetup] ID renamed to', idChanged, '— swapping token and updating auth store');
        setSession({ token: tokenToUse, user: { ...user, id: idChanged }, isNewUser: false });
      }

      await api.patch('/api/aggregators/profile', {
        aggregator_type: aggregatorType,
        operating_hours: { days: operatingDays, from: operatingHours.from, to: operatingHours.to }
      });
      router.push('/(auth)/aggregator/area-setup' as any);
    } catch (e: any) {
      console.error('Failed to create profile:', e);
      const errMsg = e?.response?.data?.error || 'Failed to save profile. Please try again.';
      Alert.alert('Error', errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    safeBack('/(auth)/phone');
  };

  const toggleDay = (day: string) => {
    const newDays = operatingDays.includes(day)
      ? operatingDays.filter(d => d !== day)
      : [...operatingDays, day].sort((a, b) => {
        const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return order.indexOf(a) - order.indexOf(b);
      });
    setProfile({ operatingDays: newDays });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NavBar
        title="Set Up Profile"
        variant="light"
        onBack={handleBack}
        rightAction={<Text variant="caption">Step 1 of 3</Text>}
      />

      <View style={styles.progressContainer}>
        <ProgressBar progress={0.33} color={colors.red} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text variant="label" style={styles.label}>Full Name</Text>
          <Input
            value={fullName}
            onChangeText={(txt) => setProfile({ fullName: txt })}
            placeholder="e.g. Vijay Kumar"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text variant="label" style={styles.label}>Business Name</Text>
            <Text variant="caption" style={styles.optional}>(optional)</Text>
          </View>
          <Input
            value={businessName}
            onChangeText={(txt) => setProfile({ businessName: txt })}
            placeholder="e.g. Kumar Scrap Co."
          />
        </View>

        <View style={styles.section}>
          <Text variant="label" style={styles.label}>Business Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeCard, aggregatorType === 'shop' && styles.typeCardSelected]}
              onPress={() => setProfile({ aggregatorType: 'shop' })}
            >
              <Text style={styles.typeIcon}>🏪</Text>
              <Text variant="body" style={styles.typeTitle}>Shop-Based</Text>
              <Text variant="caption" style={styles.typeSub}>Fixed location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeCard, aggregatorType === 'mobile' && styles.typeCardSelected]}
              onPress={() => setProfile({ aggregatorType: 'mobile' })}
            >
              <Text style={styles.typeIcon}>🏍</Text>
              <Text variant="body" style={styles.typeTitle}>Mobile</Text>
              <Text variant="caption" style={styles.typeSub}>Tempo / Auto</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="label" style={styles.label}>Primary Area</Text>
          <Input
            value={primaryArea}
            onChangeText={(txt) => setProfile({ primaryArea: txt })}
            placeholder="e.g. Banjara Hills, Hyderabad"
          />
        </View>

        <View style={styles.section}>
          <Text variant="label" style={styles.label}>Operating Hours</Text>
          <View style={styles.hoursRow}>
            <Input
              style={styles.hourInput}
              value={operatingHours.from}
              onChangeText={(txt) => setProfile({ operatingHours: { ...operatingHours, from: txt } })}
              mono
            />
            <Text style={styles.hoursSeparator}>—</Text>
            <Input
              style={styles.hourInput}
              value={operatingHours.to}
              onChangeText={(txt) => setProfile({ operatingHours: { ...operatingHours, to: txt } })}
              mono
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="label" style={styles.label}>Operating Days</Text>
          <DayToggle
            selectedDays={operatingDays}
            onToggle={toggleDay}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Next →"
          onPress={handleNext}
          disabled={isNextDisabled || isLoading}
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
    backgroundColor: colors.surface, // NavBar is white, keep PB container white for seamless look or match NavBar variant
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
    color: colors.navy,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  optional: {
    color: colors.muted,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 6,
  },
  typeCardSelected: {
    borderColor: colors.navy,
    backgroundColor: 'rgba(28, 46, 74, 0.03)',
  },
  typeIcon: {
    fontSize: 24,
  },
  typeTitle: {
    fontWeight: '600',
    color: colors.navy,
  },
  typeSub: {
    color: colors.muted,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  hourInput: {
    flex: 1,
  },
  hoursSeparator: {
    color: colors.muted,
    padding: spacing.xs,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
