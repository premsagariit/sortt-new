/**
 * app/(shared)/chat/[id].tsx
 * ──────────────────────────────────────────────────────────────────
 * Live Chat Screen
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { PaperPlaneRight, ChatsCircle, WarningCircle, CaretLeft, Plus } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';

import { colors, spacing, radius } from '../../../constants/tokens';
import { Text, Numeric } from '../../../components/ui/Typography';
import { MessageBubble } from '../../../components/ui/MessageBubble';
import { Avatar } from '../../../components/ui/Avatar';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore, ChatMessage } from '../../../store/chatStore';
import { safeBack } from '../../../utils/navigation';
import { useOrderStore } from '../../../store/orderStore';
import { useOrderChannel } from '../../../hooks/useOrderChannel';
import { api } from '../../../lib/api';

const PHONE_REGEX = /(?:\+91|0)?[6-9]\d{9}/;
const PHONE_REDACTED_TOKEN = '[phone number removed]';
const EMOJI_REGEX = /([\u203C-\u3299]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF])/;
const LOCATION_REGEX = /(https?:\/\/(maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.apple\.com|www\.openstreetmap\.org)|\b-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b|\b(live\s*location|share\s*location|current\s*location)\b)/i;

const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonBubble1} />
    <View style={styles.skeletonBubble2} />
    <View style={styles.skeletonBubble3} />
  </View>
);

const EmptyState = ({
  onTapSuggestion,
  suggestions,
}: {
  onTapSuggestion: (value: string) => void;
  suggestions: string[];
}) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconWrap}>
      <ChatsCircle size={26} color={colors.teal} />
    </View>
    <Text variant="subheading" color={colors.navy} style={{ textAlign: 'center', marginTop: spacing.md }}>
      Start the conversation
    </Text>
    <Text variant="caption" color={colors.muted} style={styles.emptySubtitle}>
      Messages are visible only to you and your order partner.
    </Text>
    <View style={styles.quickRepliesWrap}>
      {suggestions.map((suggestion) => (
        <Pressable key={suggestion} onPress={() => onTapSuggestion(suggestion)} style={styles.quickReplyChip}>
          <Text variant="caption" color={colors.navy} style={styles.quickReplyText}>{suggestion}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

const getInitials = (value: string) => {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

const isBlockedContent = (content: string) => {
  const value = String(content || '').trim();
  if (!value) return true;
  if (value.includes(PHONE_REDACTED_TOKEN)) return true;
  if (PHONE_REGEX.test(value)) return true;
  if (EMOJI_REGEX.test(value)) return true;
  if (LOCATION_REGEX.test(value)) return true;
  return false;
};

const sanitizeMessageBody = (content: string) => String(content || '').replace(EMOJI_REGEX, '').trim();

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
  const sendImageMessage = useChatStore((state) => state.sendImageMessage);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const markAllReceived = useChatStore((state) => state.markAllReceived);
  const isLoading = useChatStore((state) => state.isLoading);

  const [inputText, setInputText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

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

  const visibleMessages = useMemo(() => messages.filter((message) => !isBlockedContent(message.body)), [messages]);

  const messageCount = visibleMessages.length;
  useEffect(() => {
    if (messageCount > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messageCount]);

  useOrderChannel(
    orderId,
    order?.orderChannelToken ?? null,
    order?.chatChannelToken ?? null
  );

  let otherPartyName = 'Chat';
  if (participants && userId) {
    otherPartyName = userId === participants.sellerId
      ? participants.aggregatorName
      : participants.sellerName;
  } else if (userType === 'seller' && typeof order?.aggregatorName === 'string' && order.aggregatorName.trim().length > 0) {
    otherPartyName = order.aggregatorName.trim();
  } else if (userType === 'aggregator' && typeof order?.sellerName === 'string' && order.sellerName.trim().length > 0) {
    otherPartyName = order.sellerName.trim();
  }

  const roleLabel = userType === 'seller' ? 'Aggregator' : 'Seller';
  const headerSubtitle = roleLabel;
  const orderMetaId = order?.orderNumber ? `#${order.orderNumber}` : `#${String(orderId).slice(0, 8).toUpperCase()}`;
  const orderMetaLocality = order?.pickupLocality || 'Hyderabad';
  const orderStatusLabel = order?.status === 'en_route'
    ? 'ON THE WAY'
    : order?.status === 'arrived'
    ? 'ARRIVED'
    : order?.status === 'weighing_in_progress'
    ? 'WEIGHING'
    : order?.status === 'completed'
    ? 'COMPLETED'
    : 'ACTIVE';
  const counterpartAvatarUri = useMemo(() => {
    if (!participants || !userId) return null;
    return userId === participants.sellerId
      ? participants.aggregatorAvatarUrl
      : participants.sellerAvatarUrl;
  }, [participants, userId]);
  const counterpartUserType = userType === 'seller' ? 'aggregator' : 'seller';

  const quickReplies = useMemo(() => {
    const isAggregator = userType === 'aggregator';
    const status = order?.status;

    if (isAggregator) {
      if (status === 'accepted') {
        return [
          "I\'ll reach in about 20 minutes.",
          'I am starting now and will update you on ETA.',
          'Please keep the scrap ready.',
          'I will message you before arriving.',
        ];
      }

      if (status === 'en_route') {
        return [
          'I am on the way to your location.',
          'I will share ETA shortly.',
          'Please keep the scrap ready.',
          'I have almost reached your area.',
        ];
      }

      return [
        'Hello, I am checking your order details.',
        'I will confirm pickup timing shortly.',
        'Please keep the scrap ready.',
        'I will update you here.',
      ];
    }

    return [
      "Hi, I\'m available for pickup.",
      "What\'s your ETA?",
      'Can you come after 3 PM?',
      'Please message me when you are nearby.',
    ];
  }, [userType, order?.status]);

  const canSend = Boolean(userId || userType);
  const effectiveSenderId = userId ?? (userType === 'seller' ? 'user-seller-001' : 'user-agg-001');

  const trySend = useCallback((rawText: string) => {
    const payload = rawText.trim();
    if (!payload || !canSend) return;

    if (isBlockedContent(payload)) {
      setInputError('Phone numbers, live location links, and emojis are not allowed.');
      return;
    }

    const normalized = sanitizeMessageBody(payload);
    if (!normalized) {
      setInputError('Message is empty after applying chat safety rules.');
      return;
    }

    setInputError(null);
    sendMessage(orderId, normalized, effectiveSenderId);
  }, [canSend, effectiveSenderId, orderId, sendMessage]);

  const handleSend = () => {
    trySend(inputText);
    setInputText('');
  };

  const handleQuickReplySend = (value: string) => {
    trySend(value);
  };

  const handleAttachImage = async () => {
    if (!canSend || !orderId || orderId === 'order-unknown') return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
        setInputError('Gallery permission is required to attach images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      setInputError(null);
      await sendImageMessage(orderId, result.assets[0].uri, effectiveSenderId);
    } catch {
      setInputError('Unable to attach image right now. Please try again.');
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isOwn = userId
      ? item.senderId === userId
      : (userType === 'seller'
        ? item.senderId === 'user-seller-001'
        : item.senderId === 'user-agg-001');

    const senderName = !isOwn && participants
      ? item.senderId === participants.sellerId
        ? participants.sellerName
        : participants.aggregatorName
      : undefined;

    return (
      <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOtherWrap]}>
        {!isOwn && (
          <View style={styles.msgAvatar}>
            <Numeric size={10} color={colors.navy}>{getInitials(senderName || otherPartyName)}</Numeric>
          </View>
        )}
        <MessageBubble
          body={sanitizeMessageBody(item.body)}
          time={formatTime(item.sentAt)}
          isOwn={isOwn}
          senderName={senderName}
          messageType={item.messageType}
          mediaUrl={item.mediaUrl}
          isSystemMessage={false}
          status={isOwn ? (item.status ?? 'sent') : undefined}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.chatHeader, { paddingTop: Math.max(0, insets.top > 0 ? 0 : spacing.sm) }]}>
        <Pressable onPress={() => safeBack('/')} style={styles.backBtn}>
          <CaretLeft size={18} color={colors.surface} weight="regular" />
        </Pressable>

        <Avatar
          name={otherPartyName}
          userType={counterpartUserType}
          size="sm"
          uri={counterpartAvatarUri ?? undefined}
        />

        <View style={styles.headerTextWrap}>
          <Text variant="label" color={colors.surface} style={styles.headerName} numberOfLines={1}>{otherPartyName}</Text>
          <Text variant="caption" color={colors.surface} style={styles.headerSubtitle} numberOfLines={1}>{headerSubtitle}</Text>
        </View>
      </View>

      <View style={styles.orderMetaStrip}>
        <View style={styles.orderMetaLeft}>
          <Text variant="caption" color={colors.amber} style={styles.orderMetaId}>Order {orderMetaId}</Text>
          <Text variant="caption" color={colors.muted} numberOfLines={1}>{orderMetaLocality}</Text>
        </View>
        {userType === 'seller' && (
          <View style={styles.orderStatusPill}>
            <Text variant="caption" color={colors.amber} style={styles.orderStatusText}>{orderStatusLabel}</Text>
          </View>
        )}
      </View>

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
              data={visibleMessages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                if (visibleMessages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              ListEmptyComponent={<EmptyState suggestions={quickReplies} onTapSuggestion={handleQuickReplySend} />}
            />
          )}
        </View>

        <View style={styles.inputArea}>
          {!!inputError && (
            <View style={styles.inlineWarning}>
              <WarningCircle size={14} color={colors.red} weight="fill" />
              <Text variant="caption" color={colors.red} style={styles.inlineWarningText}>
                {inputError}
              </Text>
            </View>
          )}

          <View style={styles.inputShell}>
            <Pressable
              style={styles.attachBtn}
              onPress={handleAttachImage}
            >
              <Plus size={18} color={colors.navy} weight="bold" />
            </Pressable>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={(value) => {
                setInputText(value);
                if (inputError) setInputError(null);
              }}
              multiline
              editable={canSend}
            />
            <Pressable
              style={[styles.sendIcon, !inputText.trim() && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <PaperPlaneRight size={18} color={colors.surface} weight="fill" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  chatHeader: {
    minHeight: 56,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 24,
    height: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontFamily: 'DMSans-Bold',
  },
  headerSubtitle: {
    fontSize: 11,
    opacity: 0.9,
  },
  orderMetaStrip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderMetaLeft: {
    flex: 1,
  },
  orderMetaId: {
    fontFamily: 'DMMono-Medium',
  },
  orderStatusPill: {
    borderWidth: 1,
    borderColor: colors.amber,
    backgroundColor: colors.amberLight,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  orderStatusText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  msgRow: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  msgRowOwn: {
    alignItems: 'flex-end',
  },
  msgRowOtherWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  msgAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceBlueLight,
    borderWidth: 1,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  quickRepliesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickReplyChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: '96%',
  },
  quickReplyText: {
    flexShrink: 1,
    textAlign: 'center',
  },
  inputArea: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inlineWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  inlineWarningText: {
    marginLeft: spacing.xs,
    flex: 1,
    flexShrink: 1,
  },
  inputShell: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    paddingRight: 6,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  attachBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    fontFamily: 'DMSans-Regular',
    color: colors.navy,
    fontSize: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});
