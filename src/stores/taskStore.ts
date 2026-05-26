import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, PendingMutation } from '../types';

function getNextOccurrence(baseDateStr: string | null, rule: string): string {
  const d = baseDateStr ? new Date(baseDateStr) : new Date();
  const now = new Date();
  
  do {
    if (rule === 'daily') {
      d.setDate(d.getDate() + 1);
    } else if (rule === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else if (rule === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else {
      // rule pode ser "monday,tuesday" ou apenas "monday"
      const daysMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const validDays = rule.toLowerCase().split(',').map(r => daysMap[r.trim()]).filter(n => n !== undefined);
      
      if (validDays.length > 0) {
        let added = false;
        for (let i = 1; i <= 7; i++) {
          d.setDate(d.getDate() + 1);
          if (validDays.includes(d.getDay())) {
            added = true;
            break;
          }
        }
        if (!added) d.setDate(d.getDate() + 7); // fallback absurdo
      } else {
        d.setDate(d.getDate() + 7);
      }
    }
  } while (d < now && rule !== 'monthly'); 
  
  return d.toISOString();
}

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
        const { tasks, mutations, addTask, updateMutation } = get();
        const taskToUpdate = tasks.find(t => t.id === id);
        const clientEditedAt = new Date().toISOString();
        const payload = {
          ...updates,
          updated_at: clientEditedAt,
        };

        // Se a tarefa está sendo concluída e tem regra de recorrência
        if (
          taskToUpdate && 
          updates.status === 'done' && 
          taskToUpdate.status !== 'done' && 
          taskToUpdate.recurrence_rule
        ) {
           const nextDueAt = getNextOccurrence(taskToUpdate.due_at, taskToUpdate.recurrence_rule);
           // Cria o clone de forma assíncrona para não dar conflito com o set() atual do Zustand
           setTimeout(() => {
             addTask({
               user_id: taskToUpdate.user_id,
               title: taskToUpdate.title,
               description: taskToUpdate.description,
               context: taskToUpdate.context,
               priority: taskToUpdate.priority,
               energy: taskToUpdate.energy,
               status: 'todo',
               due_at: nextDueAt,
               deleted_at: null,
               recurrence_rule: taskToUpdate.recurrence_rule
             });
           }, 500);
        }

        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? { ...t, ...updates, updated_at: clientEditedAt } : t
          )
        }));

        const existingPendingMutation = mutations.find(
          (m) => m.entity === 'task' &&
            m.entityId === id &&
            (m.operation === 'insert' || m.operation === 'update')
        );

        if (existingPendingMutation) {
          updateMutation(existingPendingMutation.id, {
            payload: {
              ...existingPendingMutation.payload,
              ...payload,
            },
            baseUpdatedAt: existingPendingMutation.baseUpdatedAt ?? taskToUpdate?.updated_at ?? null,
          });
          return;
        }

        useTaskStore.getState().addMutation({
          entity: 'task',
          operation: 'update',
          entityId: id,
          payload,
          baseUpdatedAt: taskToUpdate?.updated_at ?? null
        });
      },

      deleteTask: (id) => {
        const now = new Date().toISOString();
        const taskToDelete = get().tasks.find(t => t.id === id);
        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? { ...t, deleted_at: now, updated_at: now } : t
          )
        }));

        useTaskStore.getState().addMutation({
          entity: 'task',
          operation: 'delete',
          entityId: id,
          payload: { deleted_at: now, updated_at: now },
          baseUpdatedAt: taskToDelete?.updated_at ?? null
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
