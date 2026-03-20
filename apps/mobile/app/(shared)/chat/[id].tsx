/**
 * app/(shared)/chat/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Live Chat Screen
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { PaperPlaneRight } from 'phosphor-react-native';

import { colors, spacing } from '../../../constants/tokens';
import { NavBar } from '../../../components/ui/NavBar';
import { Text } from '../../../components/ui/Typography';
import { MessageBubble } from '../../../components/ui/MessageBubble';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore, ChatMessage } from '../../../store/chatStore';
import { safeBack } from '../../../utils/navigation';
import { useOrderStore } from '../../../store/orderStore';
import { useOrderChannel } from '../../../hooks/useOrderChannel';
import { api } from '../../../lib/api';

// Skeleton Loader State
const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonBubble1} />
    <View style={styles.skeletonBubble2} />
    <View style={styles.skeletonBubble3} />
  </View>
);

// Empty State
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Text variant="body" color={colors.muted} style={{ textAlign: 'center' }}>
      No messages yet. Say hello!
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

  const order = useOrderStore((state: any) => state.orders.find((o: any) => o.orderId === orderId));
  const fetchOrder = useOrderStore((state: any) => state.fetchOrder);

  // Direct state access — more reliable Zustand re-render pattern than calling getMessages()
  const messages = useChatStore((state) => state.messages[orderId] ?? []);
  const participants = useChatStore((state) => state.participants[orderId] || null);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const markAllReceived = useChatStore((state) => state.markAllReceived);
  const isLoading = useChatStore((state) => state.isLoading);

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // If channel tokens are missing, fetch the order detail to populate them
  useEffect(() => {
    if (orderId && orderId !== 'order-unknown') {
      if (!order?.chatChannelToken || !order?.orderChannelToken) {
        fetchOrder(orderId, false);
      }
    }
  }, [orderId]);

  // Load message history and mark as read on mount
  useEffect(() => {
    if (orderId && orderId !== 'order-unknown') {
      fetchMessages(orderId);
      // Mark other party's messages as read — triggers 'messages_read' Ably event on their device
      api.patch('/api/messages/read', { order_id: orderId }).catch(() => {});
    }
  }, [orderId]);

  // Re-mark as read each time screen is focused:
  // 1. Notify the server so sender's ticks upgrade to double/teal
  // 2. Clear the local unread badge on the ContactCard chat button
  useFocusEffect(
    useCallback(() => {
      if (orderId && orderId !== 'order-unknown') {
        api.patch('/api/messages/read', { order_id: orderId }).catch(() => {});
        if (userId) markAllReceived(orderId, userId);
      }
    }, [orderId, userId])
  );

  // Auto-scroll to newest message when message count changes
  const messageCount = messages.length;
  useEffect(() => {
    if (messageCount > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messageCount]);

  useOrderChannel(
    orderId,
    order?.orderChannelToken ?? null,
    order?.chatChannelToken ?? null
  );

  // Derive other party name from participants
  let otherPartyName = 'Chat';
  if (participants && userId) {
    otherPartyName = userId === participants.sellerId
      ? participants.aggregatorName
      : participants.sellerName;
  }

  const canSend = Boolean(userId || userType);
  const effectiveSenderId = userId ?? (userType === 'seller' ? 'user-seller-001' : 'user-agg-001');

  const handleSend = () => {
    if (!inputText.trim() || !canSend) return;
    sendMessage(orderId, inputText.trim(), effectiveSenderId);
    setInputText('');
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isOwn = userId
      ? item.senderId === userId
      : (userType === 'seller'
        ? item.senderId === 'user-seller-001'
        : item.senderId === 'user-agg-001');

    let senderName: string | undefined = undefined;
    if (!isOwn && participants) {
      senderName = item.senderId === participants.sellerId ? participants.sellerName : participants.aggregatorName;
    }

    // V26: phone number defense-in-depth before render
    const V26_REGEX = /(?:\+91|0)?[6-9]\d{9}/;
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
          status={isOwn ? (item.status ?? 'sent') : undefined}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <NavBar
        variant="light"
        title={otherPartyName}
        onBack={() => safeBack('/')}
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
              ref={flatListRef}
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
    transform: [{ scaleY: -1 }],
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
