// Scaffold — backend wired on Day 7 per @PLAN.md
// No Realtime subscription here. All actions are local state only.
import { create } from 'zustand';

export interface ChatMessage {
  messageId: string;
  orderId: string;
  senderId: string;
  body: string;   // phone numbers filtered before display (V26)
  sentAt: string;
  isOwn: boolean;
}

interface ChatStoreState {
  messages: Record<string, ChatMessage[]>; // keyed by orderId
  isLoading: boolean;
  // Actions — all no-ops for now, wired on Day 7 (Realtime)
  setMessages: (orderId: string, msgs: ChatMessage[]) => void;
  appendMessage: (orderId: string, msg: ChatMessage) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

// Scaffold only — no Realtime subscription until Day 7
// V26: phone number regex filter applied before appendMessage in Day 7
//      Pattern: /(?:\+91|0)?[6-9]\d{9}/g → '[phone number removed]'
//      Applied server-side before broadcast; this store receives clean messages.
export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: {},
  isLoading: false,
  setMessages: (orderId, msgs) =>
    set({ messages: { ...get().messages, [orderId]: msgs } }),
  appendMessage: (orderId, msg) => {
    const existing = get().messages[orderId] ?? [];
    set({ messages: { ...get().messages, [orderId]: [...existing, msg] } });
  },
  setLoading: (v) => set({ isLoading: v }),
  reset: () => set({ messages: {}, isLoading: false }),
}));
