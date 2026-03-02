import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Recycle, Storefront, Info, Check } from 'phosphor-react-native';
import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { colors, radius, spacing } from '../../constants/tokens';
import { useAuthStore } from '../../store/authStore';

export default function UserTypeScreen() {
  const setUserType = useAuthStore((s) => s.setUserType);
  // 'seller' for "Sell my scrap", 'dealer' for "I'm a scrap dealer"
  const [selectedType, setSelectedType] = useState<'seller' | 'dealer'>('seller');

  const handleContinue = () => {
    // Persist choice to store
    setUserType(selectedType === 'seller' ? 'seller' : 'aggregator');
    router.push('/(auth)/phone');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <NavBar 
        logoVariant="compact-light" 
        variant="light" 
        onBack={() => router.replace('/(auth)/onboarding')}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="heading" style={styles.title}>I want to…</Text>
          <Text variant="body" style={styles.subtitle}>Tell us how you'll use Sortt</Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity 
            style={[styles.typeCard, selectedType === 'seller' && styles.typeCardSelected]}
            onPress={() => setSelectedType('seller')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.redLight }]}>
              <Recycle size={24} color={colors.red} weight="fill" />
            </View>
            <View style={styles.cardContent}>
              <Text variant="subheading" style={styles.cardTitle}>Sell my scrap</Text>
              <Text variant="caption" style={styles.cardDesc}>Household, office, or business looking to sell scrap at fair rates</Text>
              <View style={styles.pillRow}>
                <View style={styles.pill}><Text style={styles.pillText}>Household</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>Office</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>Factory</Text></View>
              </View>
            </View>
            <View style={[styles.radioMarker, selectedType === 'seller' && styles.radioMarkerSelected]}>
              {selectedType === 'seller' && <Check size={12} color={colors.surface} weight="bold" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.typeCard, selectedType === 'dealer' && styles.typeCardSelected]}
            onPress={() => setSelectedType('dealer')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.tealLight }]}>
              <Storefront size={24} color={colors.teal} weight="fill" />
            </View>
            <View style={styles.cardContent}>
              <Text variant="subheading" style={styles.cardTitle}>I'm a scrap dealer</Text>
              <Text variant="caption" style={styles.cardDesc}>I collect scrap and want to find pickup orders near me</Text>
              <View style={styles.pillRow}>
                <View style={styles.pill}><Text style={styles.pillText}>Shop-based</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>Mobile</Text></View>
              </View>
            </View>
            <View style={[styles.radioMarker, selectedType === 'dealer' && styles.radioMarkerSelected]}>
              {selectedType === 'dealer' && <Check size={12} color={colors.surface} weight="bold" />}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.banner}>
          <Info size={20} color={colors.navy} />
          <Text variant="caption" style={styles.bannerText}>
            You can always switch account types later from Settings.
          </Text>
        </View>

        <View style={styles.footer}>
          <PrimaryButton 
            label="Continue as Seller →" 
            onPress={handleContinue} 
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    color: colors.navy,
  },
  subtitle: {
    marginTop: 6,
    color: colors.muted,
  },
  cardsContainer: {
    gap: spacing.md,
  },
  typeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card, // 16px
    padding: 20,
    gap: 16,
    alignItems: 'flex-start',
  },
  typeCardSelected: {
    borderColor: colors.navy,
    backgroundColor: 'rgba(28,46,74,0.03)',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: colors.navy,
    marginBottom: 3,
  },
  cardDesc: {
    color: colors.muted,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  pill: {
    backgroundColor: 'rgba(28,46,74,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: colors.navy,
  },
  radioMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioMarkerSelected: {
    borderWidth: 0,
    backgroundColor: colors.navy,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.material.plastic.bg, // blueish
    borderRadius: 12,
    padding: 12,
    marginTop: spacing.xl,
    gap: 10,
  },
  bannerText: {
    flex: 1,
    color: colors.slate,
    lineHeight: 18,
  },
  footer: {
    marginTop: 'auto',
  }
});
