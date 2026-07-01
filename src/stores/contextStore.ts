import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContextType } from '../types';

interface ContextState {
  activeContext: ContextType;
  contextUpdatedAt: string | null;
  aiApiKey: string | null;
  setActiveContext: (context: ContextType) => void;
  setContextFromRemote: (context: ContextType, updatedAt: string) => void;
  setAiApiKey: (key: string | null) => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      activeContext: 'PM',
      contextUpdatedAt: null,
      aiApiKey: null,
      setActiveContext: (context) => set({ activeContext: context, contextUpdatedAt: new Date().toISOString() }),
      setContextFromRemote: (context, updatedAt) => set({ activeContext: context, contextUpdatedAt: updatedAt }),
      setAiApiKey: (key) => set({ aiApiKey: key }),
    }),
    {
      name: 'secretario-task:context-store',
      partialize: (state) => ({
        activeContext: state.activeContext,
        contextUpdatedAt: state.contextUpdatedAt,
      }),
    }
  )
);
