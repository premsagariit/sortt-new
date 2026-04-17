import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { PhoneCall } from 'phosphor-react-native';

import { colors, spacing } from '../../constants/tokens';

type PhoneActionButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function PhoneActionButton({ onPress, disabled = false, style }: PhoneActionButtonProps) {
  return (
    <Pressable
      style={[styles.button, style, disabled && styles.buttonDisabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <PhoneCall size={24} color={colors.navy} weight="regular" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});