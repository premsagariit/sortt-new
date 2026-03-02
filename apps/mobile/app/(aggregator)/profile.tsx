/**
 * app/(aggregator)/profile.tsx
 * ──────────────────────────────────────────────────────────────────
 * PLACEHOLDER — Day 2 §2.1 Navigation Shell only.
 * Full implementation follows in §3.5 Aggregator Profile Screen.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { Text } from '../../components/ui/Typography';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { NavBar } from '../../components/ui/NavBar';

interface InfoRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  rowKey: string;
  onPress?: () => void;
  isLast?: boolean;
}

function InfoRow({ icon, title, subtitle, rowKey, onPress, isLast }: InfoRowProps) {
  return (
    <Pressable 
      style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
    >
      <View style={styles.menuIconWrap}>
        <Text style={styles.menuIcon as any}>{icon}</Text>
      </View>
      <View style={styles.menuTextContent}>
        <Text variant="body" style={styles.menuTitle as any}>{title}</Text>
        {subtitle && <Text variant="caption" color={colors.muted} style={styles.menuSubtitle as any}>{subtitle}</Text>}
      </View>
      <Text variant="body" color={colors.border}>›</Text>
    </Pressable>
  );
}

export default function AggregatorProfileScreen() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <NavBar title="Profile" variant="light" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.placeholderCard}>
          <Text variant="body" style={styles.label}>
            Aggregator Profile — Coming Soon
          </Text>
        </View>

        <View style={styles.menuContainer}>
          <InfoRow 
            rowKey="language" icon="🌐" title="Language" subtitle="English" 
            onPress={() => router.push('/(shared)/language')}
          />
          <InfoRow 
            rowKey="help" icon="❓" title="Help & Support" subtitle="FAQs & contact" 
            onPress={() => router.push('/(shared)/help')}
          />
          <InfoRow 
            rowKey="terms" icon="🛡️" title="Terms & Privacy" subtitle="Legal information" isLast
            onPress={() => router.push('/(shared)/terms-privacy')}
          />
        </View>
        
        <View style={{ paddingHorizontal: spacing.md, width: '100%', gap: spacing.sm }}>
          <PrimaryButton 
            label="Dev Toggle: Seller View" 
            onPress={() => router.replace('/(seller)/home')} 
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.bg,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         0,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  placeholderCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  label: {
    color: colors.slate,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 64,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colorExtended.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuTextContent: {
    flex: 1,
  },
  menuTitle: {
    fontWeight: '600',
    color: colors.navy,
  },
  menuSubtitle: {
    marginTop: 2,
  },
});
