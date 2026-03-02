/**
 * app/(shared)/chat/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Chat placeholder screen — full chat UI is Day 7 (Realtime).
 * This screen must not crash when navigated to.
 *
 * Reads order ID from useLocalSearchParams().id and shows it in the
 * NavBar title as "Chat · #{id}".
 *
 * No store connections. No mock messages. Static screen only.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChatCircle } from 'phosphor-react-native';

import { colors, colorExtended, spacing, radius } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text, Numeric } from '../../../components/ui/Typography';

const MOCK_MESSAGES = [
  { id: '1', text: 'Hello! I am on my way to your location.', sender: 'aggregator', time: '11:02 AM' },
  { id: '2', text: 'Great, thanks! I have some extra newspaper as well.', sender: 'seller', time: '11:05 AM' },
  { id: '3', text: 'Sure, I can take that. Will be there in 5-8 mins.', sender: 'aggregator', time: '11:06 AM' },
];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <NavBar
        variant="light"
        title={`Chat · #${id ?? ''}`}
        onBack={() => router.back()}
      />
      
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBanner}>
          <Text variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
            This is a placeholder chat for testing. Real-time chat integration is coming soon.
          </Text>
        </View>

        {MOCK_MESSAGES.map((msg) => {
          const isMe = msg.sender === 'seller'; // Placeholder logic
          return (
            <View key={msg.id} style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text variant="body" color={isMe ? colors.surface : colors.navy}>
                  {msg.text}
                </Text>
                <Numeric size={10} color={isMe ? 'rgba(255,255,255,0.7)' : colors.muted} style={styles.time}>
                  {msg.time}
                </Numeric>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputArea}>
        <View style={styles.inputPlaceholder}>
          <Text variant="body" color={colors.muted}>Type a message...</Text>
          <View style={styles.sendIcon}>
            <ChatCircle size={20} color={colors.surface} weight="fill" />
          </View>
        </View>
      </View>
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
    gap: spacing.md,
  },
  infoBanner: {
    backgroundColor: colorExtended.surface2,
    padding: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  msgRow: {
    flexDirection: 'row',
    width: '100%',
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowThem: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: 18,
    gap: 4,
  },
  bubbleMe: {
    backgroundColor: colors.navy,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  time: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputArea: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputPlaceholder: {
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: 6,
    justifyContent: 'space-between',
  },
  sendIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
