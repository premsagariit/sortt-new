/**
 * components/ui/Input.tsx
 * ──────────────────────────────────────────────────────────────────
 * Reusable text input component complying with the design system.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../constants/tokens';
import { Text } from './Typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  mono?:  boolean;
}

export function Input({ label, error, style, mono, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          mono && styles.inputMono,
          style,
        ]}
        placeholderTextColor={colors.muted}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error ? (
        <Text variant="caption" color={colors.red} style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
    color: colors.slate,
  },
  input: {
    height: 52,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.navy,
  },
  inputFocused: {
    borderColor: colors.navy,
  },
  inputError: {
    borderColor: colors.red,
  },
  inputMono: {
    fontFamily: 'DMMono-Regular',
  },
  errorText: {
    marginTop: spacing.xs,
  },
});
