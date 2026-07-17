import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContextType, DecisionLocation, TaskDecisionMetadata } from '../types';

interface ContextState {
  activeContext: ContextType;
  contextUpdatedAt: string | null;
  aiApiKey: string | null;
  decisionEnergy: number;
  availableMinutes: number;
  dailyCapacityMinutes: number;
  currentLocation: DecisionLocation;
  skippedTaskIds: string[];
  skippedTaskDay: string | null;
  taskDecisionMetadata: Record<string, TaskDecisionMetadata>;
  setActiveContext: (context: ContextType) => void;
  setContextFromRemote: (context: ContextType, updatedAt: string) => void;
  setAiApiKey: (key: string | null) => void;
  setDecisionEnergy: (energy: number) => void;
  setAvailableMinutes: (minutes: number) => void;
  setDailyCapacityMinutes: (minutes: number) => void;
  setCurrentLocation: (location: DecisionLocation) => void;
  skipTaskForToday: (taskId: string) => void;
  clearSkippedTasks: () => void;
  setTaskDecisionMetadata: (taskId: string, metadata: TaskDecisionMetadata) => void;
  removeTaskDecisionMetadata: (taskId: string) => void;
}

function localDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      activeContext: 'PM',
      contextUpdatedAt: null,
      aiApiKey: null,
      decisionEnergy: 5,
      availableMinutes: 30,
      dailyCapacityMinutes: 180,
      currentLocation: 'anywhere',
      skippedTaskIds: [],
      skippedTaskDay: null,
      taskDecisionMetadata: {},
      setActiveContext: (context) => set({ activeContext: context, contextUpdatedAt: new Date().toISOString() }),
      setContextFromRemote: (context, updatedAt) => set({ activeContext: context, contextUpdatedAt: updatedAt }),
      setAiApiKey: (key) => set({ aiApiKey: key }),
      setDecisionEnergy: (energy) => set({ decisionEnergy: Math.max(0, Math.min(10, Math.round(energy))) }),
      setAvailableMinutes: (minutes) => set({ availableMinutes: Math.max(5, Math.min(240, Math.round(minutes))) }),
      setDailyCapacityMinutes: (minutes) => set({ dailyCapacityMinutes: Math.max(30, Math.min(720, Math.round(minutes))) }),
      setCurrentLocation: (location) => set({ currentLocation: location }),
      skipTaskForToday: (taskId) => set((state) => {
        const today = localDayKey();
        const currentIds = state.skippedTaskDay === today ? state.skippedTaskIds : [];
        return {
          skippedTaskDay: today,
          skippedTaskIds: currentIds.includes(taskId) ? currentIds : [...currentIds, taskId],
        };
      }),
      clearSkippedTasks: () => set({ skippedTaskIds: [], skippedTaskDay: localDayKey() }),
      setTaskDecisionMetadata: (taskId, metadata) => set((state) => ({
        taskDecisionMetadata: {
          ...state.taskDecisionMetadata,
          [taskId]: metadata,
        },
      })),
      removeTaskDecisionMetadata: (taskId) => set((state) => {
        const nextMetadata = { ...state.taskDecisionMetadata };
        delete nextMetadata[taskId];
        return { taskDecisionMetadata: nextMetadata };
      }),
    }),
    {
      name: 'secretario-task:context-store',
      partialize: (state) => ({
        activeContext: state.activeContext,
        contextUpdatedAt: state.contextUpdatedAt,
        decisionEnergy: state.decisionEnergy,
        availableMinutes: state.availableMinutes,
        dailyCapacityMinutes: state.dailyCapacityMinutes,
        currentLocation: state.currentLocation,
        skippedTaskIds: state.skippedTaskIds,
        skippedTaskDay: state.skippedTaskDay,
        taskDecisionMetadata: state.taskDecisionMetadata,
      }),
    }
  )
);
