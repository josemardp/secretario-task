import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContextType } from '../types';

interface ContextState {
  activeContext: ContextType;
  currentEnergy: number;
  energyUpdatedAt: string | null;
  aiApiKey: string | null;
  setActiveContext: (context: ContextType) => void;
  setCurrentEnergy: (energy: number) => void;
  setEnergyFromRemote: (energy: number, context: ContextType, updatedAt: string) => void;
  setAiApiKey: (key: string | null) => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      activeContext: 'PM',
      currentEnergy: 5,
      energyUpdatedAt: null,
      aiApiKey: null,
      setActiveContext: (context) => set({ activeContext: context, energyUpdatedAt: new Date().toISOString() }),
      setCurrentEnergy: (energy) => set({ currentEnergy: energy, energyUpdatedAt: new Date().toISOString() }),
      setEnergyFromRemote: (energy, context, updatedAt) => set({ currentEnergy: energy, activeContext: context, energyUpdatedAt: updatedAt }),
      setAiApiKey: (key) => set({ aiApiKey: key }),
    }),
    {
      name: 'secretario-task:context-store',
      partialize: (state) => ({
        activeContext: state.activeContext,
        currentEnergy: state.currentEnergy,
        energyUpdatedAt: state.energyUpdatedAt,
      }),
    }
  )
);
