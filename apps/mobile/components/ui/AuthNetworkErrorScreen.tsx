import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../../constants/tokens';
import { APP_NAME } from '../../constants/app';
import { Text } from './Typography';
import { PrimaryButton } from './Button';
import { SorttLogo } from './SorttLogo';

interface AuthNetworkErrorScreenProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

const RETRY_DELAY_SEC = 10;

export function AuthNetworkErrorScreen({
  onRetry,
  isRetrying = false,
}: AuthNetworkErrorScreenProps) {
  const insets = useSafeAreaInsets();
  const [timeLeft, setTimeLeft] = useState(RETRY_DELAY_SEC);

  const triggerRetry = useCallback(() => {
    setTimeLeft(RETRY_DELAY_SEC);
    onRetry();
  }, [onRetry]);

  useEffect(() => {
    if (isRetrying) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isRetrying]);

  useEffect(() => {
    if (timeLeft !== 0 || isRetrying) {
      return;
    }

    triggerRetry();
  }, [timeLeft, isRetrying, triggerRetry]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.red} />

      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <View style={styles.headerContent}>
          <SorttLogo variant="compact-dark" />
        </View>
      </View>

      <View style={styles.content}>
        <Text variant="heading" style={styles.title}>No internet connection</Text>
        <Text variant="body" style={styles.message}>
          You're offline. Check your Wi-Fi or mobile data and tap Retry.
        </Text>

        <View style={styles.retryState}>
          <ActivityIndicator size="small" color={colors.red} />
          <Text variant="caption" style={styles.retryText}>
            {isRetrying ? 'Retrying now...' : `Auto-retrying in ${timeLeft}s`}
          </Text>
        </View>

        <View style={styles.buttonWrap}>
          <PrimaryButton
            label="Retry now"
            onPress={triggerRetry}
            disabled={isRetrying}
          />
        </View>

        <Text variant="caption" style={styles.footerHint}>
          Authentication screens are unavailable while offline
        </Text>

        <Text variant="caption" style={styles.branding}>{APP_NAME}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.red,
    width: '100%',
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    color: colors.navy,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.slate,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  retryText: {
    color: colors.slate,
    fontWeight: '600',
  },
  buttonWrap: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  footerHint: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 'auto',
  },
  branding: {
    color: colors.muted,
    marginTop: spacing.sm,
  },
});
