import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContextType } from '../types';

interface ContextState {
  activeContext: ContextType;
  currentEnergy: number;
  setActiveContext: (context: ContextType) => void;
  setCurrentEnergy: (energy: number) => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      activeContext: 'PM', // Default context
      currentEnergy: 5,    // Default energy (0-10)
      setActiveContext: (context) => set({ activeContext: context }),
      setCurrentEnergy: (energy) => set({ currentEnergy: energy }),
    }),
    {
      name: 'secretario-task:context-store',
    }
  )
);
