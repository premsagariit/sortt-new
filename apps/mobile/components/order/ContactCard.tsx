import React from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { PhoneCall, ChatCircleDots } from 'phosphor-react-native';
import { Text } from '../ui/Typography';
import { Avatar } from '../ui/Avatar';
import { colors, spacing, radius } from '../../constants/tokens';

interface ContactCardProps {
  name: string;
  phone?: string | null;
  role: string;
  userType: 'seller' | 'aggregator';
  onChat?: () => void;
}

export function ContactCard({ name, phone, role, userType, onChat }: ContactCardProps) {
  return (
    <View style={styles.container}>
      <Avatar name={name} userType={userType} size="lg" />
      <View style={styles.info}>
        <Text variant="subheading" color={colors.navy} numberOfLines={1}>{name}</Text>
        <Text variant="caption" color={colors.muted}>{role}</Text>
      </View>
      <View style={styles.actions}>
        {onChat && (
          <Pressable style={styles.iconBtn} onPress={onChat}>
            <ChatCircleDots size={24} color={colors.navy} weight="regular" />
          </Pressable>
        )}
        {phone && (
          <Pressable 
            style={[styles.iconBtn, styles.callBtn]} 
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            <PhoneCall size={24} color={colors.surface} weight="fill" />
          </Pressable>
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
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  callBtn: {
    backgroundColor: colors.teal,
  },
});
