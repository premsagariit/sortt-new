import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text } from '../ui/Typography';
import { Avatar } from '../ui/Avatar';
import { ChatActionButton } from '../ui/ChatActionButton';
import { PhoneActionButton } from '../ui/PhoneActionButton';
import { colors, spacing, radius } from '../../constants/tokens';

interface ContactCardProps {
  name: string;
  phone?: string | null;
  role: string;
  userType: 'seller' | 'aggregator';
  onChat?: () => void;
  unreadCount?: number;
}

export function ContactCard({ name, phone, role, userType, onChat, unreadCount }: ContactCardProps) {
  return (
    <View style={styles.container}>
      <Avatar name={name} userType={userType} size="lg" />
      <View style={styles.info}>
        <Text variant="subheading" color={colors.navy} numberOfLines={1}>{name}</Text>
        <Text variant="caption" color={colors.muted}>{role}</Text>
      </View>
      <View style={styles.actions}>
        {onChat && (
          <ChatActionButton onPress={onChat} unreadCount={unreadCount} />
        )}
        {phone && (
          <PhoneActionButton onPress={() => Linking.openURL(`tel:${phone}`)} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.card,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
