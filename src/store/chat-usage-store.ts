import { create } from 'zustand';
import type { ChatCompletionUsage, ChatUsageSnapshot } from '@/services/api';

const getTotalTokens = (usage: ChatCompletionUsage) =>
  (usage.tokens_prompt || usage.native_tokens_prompt || 0) +
  (usage.tokens_completion || usage.native_tokens_completion || 0) +
  (usage.native_tokens_reasoning || 0);

interface ChatUsageState {
  snapshot: ChatUsageSnapshot | null;
  completionUsages: ChatCompletionUsage[];
  setSnapshot: (snapshot: ChatUsageSnapshot | null) => void;
  addCompletionUsage: (usage: ChatCompletionUsage) => void;
  sessionTokens: () => number;
  sessionCost: () => number;
}

export const useChatUsageStore = create<ChatUsageState>((set, get) => ({
  snapshot: null,
  completionUsages: [],
  setSnapshot: (snapshot) => set({ snapshot }),
  addCompletionUsage: (usage) =>
    set((state) => ({
      completionUsages: [...state.completionUsages, usage],
    })),
  sessionTokens: () => get().completionUsages.reduce((total, usage) => total + getTotalTokens(usage), 0),
  sessionCost: () =>
    get().completionUsages.reduce((total, usage) => total + (usage.total_cost || usage.usage || 0), 0),
}));
