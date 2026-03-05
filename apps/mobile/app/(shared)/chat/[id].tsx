/**
 * app/(shared)/chat/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Functional Chat Screen — Day 3 §3.6
 *
 * Implements FlatList, local mock state through Zustand, KeyboardAvoidingView,
 * dynamic alignments, and defense-in-depth regex for phone numbers.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { PaperPlaneRight } from 'phosphor-react-native';

import { colors, spacing } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { MessageBubble } from '../../../components/ui/MessageBubble';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore, ChatMessage } from '../../../store/chatStore';

// Skeleton Loader State
const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonBubble1} />
    <View style={styles.skeletonBubble2} />
    <View style={styles.skeletonBubble3} />
  </View>
);

// Empty / Error State
const EmptyState = ({ isError = false }: { isError?: boolean }) => (
  <View style={styles.emptyContainer}>
    <Text variant="body" color={colors.muted} style={{ textAlign: 'center' }}>
      {isError ? 'Unable to load messages. Please try again later.' : 'No messages yet. Say hello!'}
    </Text>
  </View>
);

// Format ISO string to h:mm AM/PM
const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id || 'order-unknown';

  const userId = useAuthStore((state) => state.userId);
  const userType = useAuthStore((state) => state.userType);
  const messages = useChatStore((state) => state.getMessages(orderId));
  const participants = useChatStore((state) => state.participants[orderId] || null);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const isLoading = useChatStore((state) => state.isLoading);

  const [inputText, setInputText] = useState('');

  // Derive other party name strictly from participants comparison to authStore.userId
  let otherPartyName = 'Chat';
  if (participants && userId) {
    otherPartyName = userId === participants.sellerId
      ? participants.aggregatorName
      : participants.sellerName;
  }

  // Never block sending just because participants dict is missing
  const canSend = Boolean(userId || userType);
  // Effective sender ID for outgoing messages
  const effectiveSenderId = userId ?? (userType === 'seller' ? 'user-seller-001' : 'user-agg-001');

  const handleSend = () => {
    if (!inputText.trim() || !canSend) return;
    sendMessage(orderId, inputText.trim(), effectiveSenderId);
    setInputText('');
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    // isOwn: prefer userId exact match; fall back to userType for pre-auth dev testing
    const isOwn = userId
      ? item.senderId === userId
      : (userType === 'seller'
        ? item.senderId === 'user-seller-001'
        : item.senderId === 'user-agg-001');
    let senderName: string | undefined = undefined;

    if (!isOwn && participants) {
      senderName = item.senderId === participants.sellerId ? participants.sellerName : participants.aggregatorName;
    }

    // Apply V26 Regex: defense in depth before render
    const V26_REGEX = /(?:\+91|0)?[6-9]\d{9}/g;
    const isSystemMessage = V26_REGEX.test(item.body);
    const body = isSystemMessage ? 'Phone sharing blocked for your safety' : item.body;

    return (
      <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
        <MessageBubble
          body={body}
          time={formatTime(item.sentAt)}
          isOwn={isOwn}
          senderName={senderName}
          isSystemMessage={isSystemMessage}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <NavBar
        variant="light"
        title={otherPartyName}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.listContainer}>
          {isLoading ? (
            <SkeletonLoader />
          ) : (
            <FlatList
              data={[...messages].reverse()}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              inverted
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<EmptyState />}
            />
          )}
        </View>

        <View style={styles.inputArea}>
          <View style={styles.inputPlaceholder}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={canSend}
            />
            <TouchableOpacity
              style={[styles.sendIcon, !inputText.trim() && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <PaperPlaneRight size={20} color={colors.surface} weight="fill" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  msgRow: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  msgRowOwn: {
    alignItems: 'flex-end',
  },
  msgRowOther: {
    alignItems: 'flex-start',
  },
  skeletonContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  skeletonBubble1: {
    width: '60%',
    height: 50,
    backgroundColor: colors.skeleton,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  skeletonBubble2: {
    width: '70%',
    height: 60,
    backgroundColor: colors.skeleton,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  skeletonBubble3: {
    width: '50%',
    height: 40,
    backgroundColor: colors.skeleton,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    transform: [{ scaleY: -1 }], // Counteract FlatList inverted
  },
  inputArea: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputPlaceholder: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: spacing.md,
    paddingRight: 6,
    paddingVertical: 6,
    justifyContent: 'space-between',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    // Provide a sensible fallback if DMSans-Regular isn't cached/loaded correctly on init,
    // though the project should have it installed
    fontFamily: 'DMSans-Regular',
    color: colors.slate,
    fontSize: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});
