// Scaffold — backend wired on Day 7 per @PLAN.md
// No Realtime subscription here. All actions are local state only.
import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  body: string;
  sentAt: string;
  read: boolean;
}

// Mock Order Participants
export const MOCK_PARTICIPANTS = {
  sellerId: 'user-seller-001',
  sellerName: 'Abhi (Seller)',
  aggregatorId: 'user-agg-001',
  aggregatorName: 'Global Scrap'
};

const createMockMessages = (orderId: string): ChatMessage[] => [
  { id: `msg-1-${orderId}`, orderId, senderId: 'user-agg-001', body: 'Hello! I am on my way to your location.', sentAt: new Date(Date.now() - 360000).toISOString(), read: true },
  { id: `msg-2-${orderId}`, orderId, senderId: 'user-seller-001', body: 'Great, thanks! I have some extra newspaper as well.', sentAt: new Date(Date.now() - 300000).toISOString(), read: true },
  { id: `msg-3-${orderId}`, orderId, senderId: 'user-agg-001', body: 'Sure, I can take that. Will be there in 5-8 mins.', sentAt: new Date(Date.now() - 120000).toISOString(), read: true },
  { id: `msg-4-${orderId}`, orderId, senderId: 'user-seller-001', body: 'Should I keep it outside?', sentAt: new Date(Date.now() - 60000).toISOString(), read: true },
  { id: `msg-5-${orderId}`, orderId, senderId: 'user-agg-001', body: 'Yes, that would be helpful.', sentAt: new Date(Date.now() - 30000).toISOString(), read: true },
  { id: `msg-6-${orderId}`, orderId, senderId: 'user-seller-001', body: 'Ok, see you soon.', sentAt: new Date().toISOString(), read: false },
];

interface ChatStoreState {
  messages: Record<string, ChatMessage[]>; // keyed by orderId
  participants: Record<string, typeof MOCK_PARTICIPANTS>;
  isLoading: boolean;

  // Actions
  getMessages: (orderId: string) => ChatMessage[];
  sendMessage: (orderId: string, content: string, senderId: string) => void;
  setMessages: (orderId: string, msgs: ChatMessage[]) => void;
  appendMessage: (orderId: string, msg: ChatMessage) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: {
    'order-mock-001': createMockMessages('order-mock-001'),
    'ORD-2841': createMockMessages('ORD-2841'),
    'ORD-2790': createMockMessages('ORD-2790'),
    'ORD-1001': createMockMessages('ORD-1001'),
    'ORD-7777': createMockMessages('ORD-7777'),
  },
  participants: {
    'order-mock-001': MOCK_PARTICIPANTS,
    'ORD-2841': MOCK_PARTICIPANTS,
    'ORD-2790': MOCK_PARTICIPANTS,
    'ORD-1001': MOCK_PARTICIPANTS,
    'ORD-7777': MOCK_PARTICIPANTS,
  },
  isLoading: false,

  getMessages: (orderId) => {
    // If the order exists, return it, otherwise fallback to a mock array to prevent UI crashes 
    // during development. In production, this would trigger a fetch if missing.
    return get().messages[orderId] || [];
  },

  sendMessage: (orderId, content, senderId) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg-local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newMsg: ChatMessage = {
      id,
      orderId,
      senderId,
      body: content,
      sentAt: new Date().toISOString(),
      read: false
    };

    // Optimistic update
    get().appendMessage(orderId, newMsg);
  },

  setMessages: (orderId, msgs) =>
    set({ messages: { ...get().messages, [orderId]: msgs } }),

  appendMessage: (orderId, msg) => {
    const existing = get().messages[orderId] ?? [];
    set({ messages: { ...get().messages, [orderId]: [...existing, msg] } });
  },

  setLoading: (v) => set({ isLoading: v }),

  reset: () => set({ messages: {}, isLoading: false }),
}));
