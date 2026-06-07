export type ContextType = 'PM' | 'Esdra' | 'Pessoal' | 'Familia' | 'CCB' | 'Estudo' | 'Saude';

/** Valores suportados pelo seletor de UI. O campo no banco é text, portanto
 * o tipo no modelo Task permanece string | null para compatibilidade com
 * o parser (que produz dias individuais como 'monday', 'tuesday', etc.).
 * Use RecurrenceRule apenas para tipar o estado do formulário de edição. */
export type RecurrenceRule =
  | 'daily'
  | 'monday,tuesday,wednesday,thursday,friday'
  | 'weekly'
  | 'monthly'
  | 'odd_days'
  | 'even_days'
  | null;

export const CONTEXTS_LIST: ContextType[] = ['PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', 'Saude'];
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  context: ContextType;
  priority: number;
  energy: number;
  status: TaskStatus;
  due_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  estimated_minutes?: number | null;
  actual_minutes?: number | null;
  started_at?: string | null;
  recurrence_rule?: string | null;
  recurrence_origin_id?: string | null;
  postponed_count?: number | null;
  version: number;
}

export type TaskInput = Omit<Task, 'id' | 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export type PendingMutation = {
  id: string;
  entity: 'task' | 'task_event';
  operation: 'insert' | 'update' | 'delete';
  entityId: string;
  payload: any;
  baseUpdatedAt?: string | null;
  baseVersion?: number;
  createdAt: string;
  retryCount: number;
};
