import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, PendingMutation } from '../types';

interface TaskState {
  tasks: Task[];
  mutations: PendingMutation[];
  viewedRecords: Record<string, string>;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  recordViewEvent: (taskId: string) => void;
  addMutation: (mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retryCount'>) => void;
  removeMutation: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  updateMutation: (id: string, updates: Partial<PendingMutation>) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      mutations: [],
      viewedRecords: {},
      
      addTask: (taskData) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newTask: Task = {
          ...taskData,
          id,
          created_at: now,
          updated_at: now,
        };

        set((state) => ({
          tasks: [...state.tasks, newTask]
        }));

        useTaskStore.getState().addMutation({
          entity: 'task',
          operation: 'insert',
          entityId: id,
          payload: newTask
        });
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
          )
        }));

        useTaskStore.getState().addMutation({
          entity: 'task',
          operation: 'update',
          entityId: id,
          payload: updates
        });
      },

      deleteTask: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? { ...t, deleted_at: now, updated_at: now } : t
          )
        }));

        useTaskStore.getState().addMutation({
          entity: 'task',
          operation: 'delete',
          entityId: id,
          payload: { deleted_at: now }
        });
      },

      recordViewEvent: (taskId) => {
        const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        const { viewedRecords } = get();
        
        // Throttling: if already viewed today, ignore
        if (viewedRecords[taskId] === today) {
          return;
        }

        // Update local throttling state
        set((state) => ({
          viewedRecords: {
            ...state.viewedRecords,
            [taskId]: today
          }
        }));

        // Register the event mutation
        const eventId = crypto.randomUUID();
        const now = new Date().toISOString();
        
        useTaskStore.getState().addMutation({
          entity: 'task_event',
          operation: 'insert',
          entityId: eventId,
          payload: {
            id: eventId,
            task_id: taskId,
            user_id: '', // Set on sync
            type: 'viewed',
            created_at: now
          }
        });
      },

      addMutation: (mutationData) => {
        const newMutation: PendingMutation = {
          ...mutationData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          retryCount: 0
        };

        set((state) => ({
          mutations: [...state.mutations, newMutation]
        }));
      },

      removeMutation: (id) => {
        set((state) => ({
          mutations: state.mutations.filter(m => m.id !== id)
        }));
      },

      setTasks: (tasks) => {
        set({ tasks });
      },

      updateMutation: (id, updates) => {
        set((state) => ({
          mutations: state.mutations.map(m =>
            m.id === id ? { ...m, ...updates } : m
          )
        }));
      }
    }),
    {
      name: 'secretario-task:task-store',
    }
  )
);
