import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskInput, PendingMutation } from '../types';

function stripReadonlyTaskFields<T extends Partial<Task>>(task: T): Omit<T, 'created_at' | 'updated_at'> {
  const { created_at: _createdAt, updated_at: _updatedAt, ...rest } = task;
  return rest;
}

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
    } else if (rule === 'odd_days') {
      d.setDate(d.getDate() + 1);
      while (d.getDate() % 2 === 0) d.setDate(d.getDate() + 1);
    } else if (rule === 'even_days') {
      d.setDate(d.getDate() + 1);
      while (d.getDate() % 2 !== 0) d.setDate(d.getDate() + 1);
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
  addTask: (task: TaskInput) => void;
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
        const createdAt = taskData.created_at ?? now;
        const updatedAt = taskData.updated_at ?? createdAt;
        const newTask: Task = {
          ...taskData,
          id,
          created_at: createdAt,
          updated_at: updatedAt,
          // Self-reference establishes this task as the root of its series
          ...(taskData.recurrence_rule && !taskData.recurrence_origin_id
            ? { recurrence_origin_id: id }
            : {}),
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
        const { tasks, mutations, updateMutation } = get();
        const taskToUpdate = tasks.find(t => t.id === id);
        const clientEditedAt = new Date().toISOString();
        const sanitizedUpdates = stripReadonlyTaskFields(updates);
        const payload = sanitizedUpdates;
        let recurringClone: TaskInput | null = null;

        // Se a tarefa está sendo concluída e tem regra de recorrência
        if (
          taskToUpdate && 
          updates.status === 'done' && 
          taskToUpdate.status !== 'done' && 
          taskToUpdate.recurrence_rule
        ) {
          const nextDueAt = getNextOccurrence(taskToUpdate.due_at, taskToUpdate.recurrence_rule);
          recurringClone = {
            user_id: taskToUpdate.user_id,
            title: taskToUpdate.title,
            description: taskToUpdate.description,
            context: taskToUpdate.context,
            priority: taskToUpdate.priority,
            energy: taskToUpdate.energy,
            status: 'todo',
            due_at: nextDueAt,
            deleted_at: null,
            recurrence_rule: taskToUpdate.recurrence_rule,
            recurrence_origin_id: taskToUpdate.recurrence_origin_id ?? taskToUpdate.id
          };
        }

        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? { ...t, ...sanitizedUpdates, updated_at: clientEditedAt } : t
          )
        }));

        const addRecurringCloneIfMissing = () => {
          if (!recurringClone || !taskToUpdate) return;

          const originId = taskToUpdate.recurrence_origin_id ?? taskToUpdate.id;
          const cloneAlreadyExists = useTaskStore.getState().tasks.some((t) =>
            t.recurrence_origin_id === originId &&
            !t.deleted_at &&
            t.status !== 'done'
          );

          if (!cloneAlreadyExists) {
            useTaskStore.getState().addTask(recurringClone);
          }
        };

        const existingPendingMutation = mutations.find(
          (m) => m.entity === 'task' &&
            m.entityId === id &&
            (m.operation === 'insert' || m.operation === 'update')
        );

        if (existingPendingMutation) {
          const mergedPayload = existingPendingMutation.operation === 'insert'
            ? {
                ...existingPendingMutation.payload,
                ...payload,
                updated_at: clientEditedAt,
              }
            : {
                ...existingPendingMutation.payload,
                ...payload,
              };

          updateMutation(existingPendingMutation.id, {
            payload: mergedPayload,
            baseUpdatedAt: existingPendingMutation.baseUpdatedAt ?? taskToUpdate?.updated_at ?? null,
            baseVersion: existingPendingMutation.baseVersion ?? taskToUpdate?.version,
          });
          addRecurringCloneIfMissing();
          return;
        }

        useTaskStore.getState().addMutation({
          entity: 'task',
          operation: 'update',
          entityId: id,
          payload,
          baseUpdatedAt: taskToUpdate?.updated_at ?? null,
          baseVersion: taskToUpdate?.version,
        });

        addRecurringCloneIfMissing();
      },

      deleteTask: (id) => {
        const now = new Date().toISOString();
        const taskToDelete = get().tasks.find(t => t.id === id);
        const deletePayload = { deleted_at: now };
        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? { ...t, deleted_at: now, updated_at: now } : t
          )
        }));

        useTaskStore.getState().addMutation({
          entity: 'task',
          operation: 'delete',
          entityId: id,
          payload: deletePayload,
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
      partialize: (state) => ({
        tasks: state.tasks,
        mutations: state.mutations,
        viewedRecords: state.viewedRecords,
      }),
    }
  )
);
