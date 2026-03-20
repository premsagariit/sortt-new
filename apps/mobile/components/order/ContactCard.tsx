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
          <View style={styles.chatBtnWrapper}>
            <Pressable style={styles.iconBtn} onPress={onChat}>
              <ChatCircleDots size={24} color={colors.navy} weight="regular" />
            </Pressable>
            {!!unreadCount && unreadCount > 0 && (
              <View style={styles.badge}>
                <Text variant="caption" color={colors.surface} style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </View>
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
  chatBtnWrapper: {
    position: 'relative',
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
