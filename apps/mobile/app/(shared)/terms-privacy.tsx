/**
 * app/(seller)/terms-privacy.tsx
 * ──────────────────────────────────────────────────────────────────
 * Hub page for legal documents.
 * Links to Terms of Service and Privacy Policy.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardText, ShieldCheck, CaretRight } from 'phosphor-react-native';
import { safeBack } from '../../utils/navigation';

import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text } from '../../components/ui/Typography';

export default function TermsPrivacyHub() {
  const router = useRouter();

  const handleBack = () => safeBack();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NavBar 
        title="Terms & Privacy" 
        variant="light" 
        onBack={handleBack} 
      />

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Row 1: Terms of Service */}
        <Pressable 
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => router.push('/(shared)/terms-of-service')}
        >
          <View style={styles.iconWrap}>
            <ClipboardText size={24} color={colors.navy} weight="regular" />
          </View>
          <View style={styles.textWrap}>
            <Text variant="subheading">Terms of Service</Text>
            <Text variant="caption">Last updated: 1 March 2026</Text>
          </View>
          <CaretRight size={20} color={colors.muted} weight="bold" />
        </Pressable>

        {/* Row 2: Privacy Policy */}
        <Pressable 
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed, styles.lastRow]}
          onPress={() => router.push('/(shared)/privacy-policy')}
        >
          <View style={styles.iconWrap}>
            <ShieldCheck size={24} color={colors.navy} weight="regular" />
          </View>
          <View style={styles.textWrap}>
            <Text variant="subheading">Privacy Policy</Text>
            <Text variant="caption">Last updated: 1 March 2026</Text>
          </View>
          <CaretRight size={20} color={colors.muted} weight="bold" />
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="caption" style={styles.footerText}>
            Sortt is operated by Sortt Technologies Pvt. Ltd., Hyderabad, Telangana, India.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colorExtended.surface2,
    borderColor: colors.border,
  },
  lastRow: {
    marginBottom: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colorExtended.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  footer: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    color: colors.muted,
  },
});
