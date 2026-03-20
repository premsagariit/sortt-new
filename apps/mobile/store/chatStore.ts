import { create } from 'zustand';
import { api } from '../lib/api';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  body: string;
  sentAt: string;
  read: boolean;
  status?: 'sending' | 'sent' | 'read';
}

// Mock Order Participants
export const MOCK_PARTICIPANTS = {
  sellerId: 'user-seller-001',
  sellerName: 'Abhi (Seller)',
  aggregatorId: 'user-agg-001',
  aggregatorName: 'Global Scrap'
};

interface ChatStoreState {
  messages: Record<string, ChatMessage[]>; // keyed by orderId
  participants: Record<string, typeof MOCK_PARTICIPANTS>;
  isLoading: boolean;

  // Actions
  getMessages: (orderId: string) => ChatMessage[];
  fetchMessages: (orderId: string) => Promise<void>;
  sendMessage: (orderId: string, content: string, senderId: string) => void;
  setMessages: (orderId: string, msgs: ChatMessage[]) => void;
  appendMessage: (orderId: string, msg: ChatMessage) => void;
  updateMessageStatus: (messageId: string, orderId: string, status: 'sending' | 'sent' | 'read') => void;
  markSentMessagesAsRead: (orderId: string, ownSenderId: string) => void;
  // Mark all received (other-party) messages as locally read — resets unread badge
  markAllReceived: (orderId: string, ownUserId: string) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: {},
  participants: {},
  isLoading: false,

  getMessages: (orderId) => {
    return get().messages[orderId] || [];
  },

  fetchMessages: async (orderId) => {
    try {
      const res = await api.get('/api/messages', { params: { order_id: orderId } });
      const msgs: ChatMessage[] = (res.data.messages ?? []).map((m: any) => ({
        id: m.id,
        orderId,
        senderId: m.sender_id,
        body: m.content,
        sentAt: m.created_at,
        read: Boolean(m.read_at),
        // Messages with read_at set were already read by the other party
        status: m.read_at ? 'read' : 'sent',
      }));
      get().setMessages(orderId, msgs);
    } catch (err) {
      console.error('[chatStore] fetchMessages error:', err);
    }
  },

  sendMessage: (orderId, content, senderId) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg-local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Optimistic update with 'sending' status
    get().appendMessage(orderId, {
      id,
      orderId,
      senderId,
      body: content,
      sentAt: new Date().toISOString(),
      read: false,
      status: 'sending',
    });

    // Call backend — publishes Ably event so recipient receives via useOrderChannel
    api.post('/api/messages', { order_id: orderId, content })
      .then(() => {
        // Update to 'sent' once confirmed in DB
        get().updateMessageStatus(id, orderId, 'sent');
      })
      .catch((err) => {
        console.error('[chatStore] sendMessage API error:', err);
      });
  },

  setMessages: (orderId, msgs) =>
    set({ messages: { ...get().messages, [orderId]: msgs } }),

  appendMessage: (orderId, msg) => {
    const existing = get().messages[orderId] ?? [];
    set({ messages: { ...get().messages, [orderId]: [...existing, msg] } });
  },

  updateMessageStatus: (messageId, orderId, status) => {
    const msgs = get().messages[orderId] ?? [];
    const updated = msgs.map(m => m.id === messageId ? { ...m, status } : m);
    set({ messages: { ...get().messages, [orderId]: updated } });
  },

  markSentMessagesAsRead: (orderId, ownSenderId) => {
    const msgs = get().messages[orderId] ?? [];
    const updated = msgs.map(m =>
      m.senderId === ownSenderId && (m.status === 'sent' || m.status === 'sending')
        ? { ...m, status: 'read' as const, read: true }
        : m
    );
    set({ messages: { ...get().messages, [orderId]: updated } });
  },

  markAllReceived: (orderId, ownUserId) => {
    const msgs = get().messages[orderId] ?? [];
    const updated = msgs.map(m =>
      m.senderId !== ownUserId && !m.read ? { ...m, read: true } : m
    );
    set({ messages: { ...get().messages, [orderId]: updated } });
  },

  setLoading: (v) => set({ isLoading: v }),

  reset: () => set({ messages: {}, isLoading: false }),
}));
