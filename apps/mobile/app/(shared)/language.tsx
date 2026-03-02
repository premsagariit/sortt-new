/**
 * app/(seller)/language.tsx
 * ──────────────────────────────────────────────────────────────────
 * Language Selection screen.
 * Allows switching between English and Telugu.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info, CheckCircle } from 'phosphor-react-native';

import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { safeBack } from '../../utils/navigation';
import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';

type LangCode = 'English' | 'Telugu';

export default function LanguageSelection() {
  const router = useRouter();
  const [selected, setSelected] = useState<LangCode>('English');
  const [isSaved, setIsSaved] = useState(false);

  const handleApply = () => {
    // Logic for applying language changes would go here
    setIsSaved(true);
    // Auto-back after a delay might be nice, but simple confirmation is safer
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NavBar 
        title="Language" 
        variant="light" 
        onBack={() => safeBack()} 
      />

      <View style={styles.content}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Info size={20} color={colors.navy} weight="fill" />
          <Text variant="caption" style={styles.infoText}>
            We're currently translating Sortt into Telugu. Some parts of the app may still appear in English during this pilot phase.
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsWrap}>
          <LanguageRow 
            label="English" 
            isSelected={selected === 'English'} 
            onPress={() => { setSelected('English'); setIsSaved(false); }} 
          />
          <LanguageRow 
            label="Telugu" 
            isSelected={selected === 'Telugu'} 
            onPress={() => { setSelected('Telugu'); setIsSaved(false); }} 
          />
        </View>

        <View style={{ flex: 1 }} />

        {/* Footer Action */}
        <View style={styles.footer}>
          {isSaved ? (
            <View style={styles.successBanner}>
              <CheckCircle size={20} color={colors.teal} weight="fill" />
              <Text variant="body" color={colors.teal} style={{ fontWeight: '600' }}>
                Language preferences updated
              </Text>
            </View>
          ) : (
            <PrimaryButton 
              label="Apply Language" 
              onPress={handleApply} 
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function LanguageRow({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
  return (
    <Pressable 
      style={[styles.row, isSelected && styles.rowSelected]} 
      onPress={onPress}
    >
      <Text variant="body" color={isSelected ? colors.navy : colors.slate} style={isSelected ? { fontWeight: '600' } : undefined}>
        {label}
      </Text>
      <View style={[styles.radio, isSelected && styles.radioSelected]}>
        {isSelected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colorExtended.surface2,
    borderRadius: radius.card,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    color: colors.navy,
    lineHeight: 18,
  },
  optionsWrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: {
    borderColor: colors.navy,
    backgroundColor: colorExtended.surface2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.navy,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.navy,
  },
  footer: {
    paddingVertical: spacing.md,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colorExtended.tealLight,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.teal,
  },
});
