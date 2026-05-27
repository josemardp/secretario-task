import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContextType } from '../types';

interface ContextState {
  activeContext: ContextType;
  currentEnergy: number;
  aiApiKey: string | null;
  setActiveContext: (context: ContextType) => void;
  setCurrentEnergy: (energy: number) => void;
  setAiApiKey: (key: string | null) => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      activeContext: 'PM', // Default context
      currentEnergy: 5,    // Default energy (0-10)
      aiApiKey: null,      // OpenAI API Key
      setActiveContext: (context) => set({ activeContext: context }),
      setCurrentEnergy: (energy) => set({ currentEnergy: energy }),
      setAiApiKey: (key) => set({ aiApiKey: key }),
    }),
    {
      name: 'secretario-task:context-store',
      partialize: (state) => ({
        activeContext: state.activeContext,
        currentEnergy: state.currentEnergy,
      }),
    }
  )
);
