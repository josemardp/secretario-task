import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, PendingMutation } from '../types';

interface TaskState {
  tasks: Task[];
  mutations: PendingMutation[];
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addMutation: (mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retryCount'>) => void;
  removeMutation: (id: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      mutations: [],
      
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
      }
    }),
    {
      name: 'secretario-task:task-store',
    }
  )
);
