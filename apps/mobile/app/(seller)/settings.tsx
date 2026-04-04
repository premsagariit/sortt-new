import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Switch, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Globe, Moon, Article, ShieldCheck, CaretRight } from 'phosphor-react-native';

import { colors, spacing, radius, colorExtended } from '../../constants/tokens';
import { useI18n } from '../../hooks/useI18n';
import { safeBack } from '../../utils/navigation';
import { Text } from '../../components/ui/Typography';
import { NavBar } from '../../components/ui/NavBar';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  hasToggle?: boolean;
  toggleState?: boolean;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
}

function SettingRow({ icon, title, subtitle, hasToggle, toggleState, onToggle, onPress }: SettingRowProps) {
  return (
    <Pressable
      style={styles.settingRow}
      onPress={onPress}
      disabled={hasToggle || !onPress}
    >
      <View style={styles.settingIconWrap}>
        {icon}
      </View>
      <View style={styles.settingTextContent}>
        <Text variant="body" color={colors.navy} style={{ fontWeight: '500' } as any}>{title}</Text>
        {subtitle && (
          <Text variant="caption" color={colors.muted} style={{ marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {hasToggle ? (
        <Switch
          value={toggleState}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.teal }}
          thumbColor={colors.surface}
        />
      ) : onPress ? (
        <CaretRight size={16} color={colors.muted} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { getLanguageName } = useI18n();
  const language = useLanguageStore((state) => state.language);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const signOut = useAuthStore((s) => s.signOut);

  async function handleLogout() {
    try {
      await signOut();
    } catch {
    } finally {
      useAuthStore.getState().clearSession();
      router.replace('/(auth)/phone');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <NavBar
        title="Settings"
        variant="light"
        onBack={() => safeBack()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="caption" color={colors.muted} style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingRow
            icon={<User size={20} color={colors.navy} />}
            title="Edit Profile"
            subtitle="Update name, location, and photo"
            onPress={() => router.push('/(seller)/edit-profile')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Bell size={20} color={colors.navy} />}
            title="Push Notifications"
            subtitle="Order updates and price alerts"
            hasToggle
            toggleState={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
        </View>

        <Text variant="caption" color={colors.muted} style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <SettingRow
            icon={<Globe size={20} color={colors.navy} />}
            title="Language"
            subtitle={getLanguageName(language)}
            onPress={() => router.push('/(shared)/language')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Moon size={20} color={colors.navy} />}
            title="Dark Mode"
            subtitle="System default"
            hasToggle
            toggleState={darkMode}
            onToggle={setDarkMode}
          />
        </View>

        <Text variant="caption" color={colors.muted} style={styles.sectionLabel}>LEGAL & ABOUT</Text>
        <View style={styles.card}>
          <SettingRow
            icon={<Article size={20} color={colors.navy} />}
            title="Terms of Service"
            onPress={() => router.push('/(shared)/terms-of-service')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<ShieldCheck size={20} color={colors.navy} />}
            title="Privacy Policy"
            onPress={() => router.push('/(shared)/privacy-policy')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<User size={20} color={colors.red} />}
            title="Log Out"
            subtitle="Sign out of this device"
            onPress={() => { void handleLogout(); }}
          />
        </View>

        <View style={styles.versionContainer}>
          <Text variant="caption" color={colors.muted}>Sortt for Sellers v1.0.0 (Build 42)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    fontFamily: 'DMSans-Bold',
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 56,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colorExtended.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68, // Aligns with text content left edge
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    opacity: 0.7,
  },
});
