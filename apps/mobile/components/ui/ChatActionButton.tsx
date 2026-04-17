import React from 'react';
import { View, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { ChatCircleDots } from 'phosphor-react-native';

import { colors, spacing } from '../../constants/tokens';
import { Text } from './Typography';

type ChatActionButtonProps = {
  onPress: () => void;
  unreadCount?: number;
  backgroundColor?: string;
  iconColor?: string;
  style?: ViewStyle;
  buttonStyle?: ViewStyle;
};

export function ChatActionButton({
  onPress,
  unreadCount = 0,
  backgroundColor = colors.bg,
  iconColor = colors.navy,
  style,
  buttonStyle,
}: ChatActionButtonProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <Pressable style={[styles.button, { backgroundColor }, buttonStyle]} onPress={onPress}>
        <ChatCircleDots size={24} color={iconColor} weight="regular" />
      </Pressable>
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text variant="caption" color={colors.surface} style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : String(unreadCount)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: 'DMSans-Bold',
  },
});