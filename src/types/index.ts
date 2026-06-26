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

/** Regra de recorrência estruturada (V2). Serializada como JSON compacto no campo
 * tasks.recurrence_rule (TEXT). Detectada pelo prefixo `{` em parseRecurrenceRule.
 * Retrocompatível: strings sem esse prefixo continuam tratadas como regras legadas. */
export type RecurrenceRuleV2 = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  byMonthDay?: number | 'last';
  byDay?: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
  bySetPos?: 1 | 2 | 3 | 4 | -1;
  end: null | { type: 'date'; value: string } | { type: 'count'; value: number };
};

export const CONTEXTS_LIST: ContextType[] = ['PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', 'Saude'];
export type TaskStatus = 'todo' | 'doing' | 'done';
export type CompletedAtConfidence = 'confirmed' | 'legacy_approx';
export type ResolutionType = 'completed' | 'cancelled' | 'delegated' | 'obsolete';
export type EstimatedMinutesSource = 'default_30' | 'manual' | 'ai' | 'parser';
export type ActualMinutesSource = 'timer' | 'manual' | 'retroactive' | 'unknown';
export type TaskEventType =
  | 'created'
  | 'updated'
  | 'completed'
  | 'viewed'
  | 'started'
  | 'reopened'
  | 'postponed'
  | 'resolved';

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
  completed_at?: string | null;
  completed_at_confidence?: CompletedAtConfidence | null;
  resolution_type?: ResolutionType | null;
  resolved_at?: string | null;
  estimated_minutes?: number | null;
  actual_minutes?: number | null;
  estimated_minutes_source?: EstimatedMinutesSource | null;
  actual_minutes_source?: ActualMinutesSource | null;
  started_at?: string | null;
  recurrence_rule?: string | null;
  recurrence_origin_id?: string | null;
  postponed_count?: number | null;
  version?: number;
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
  payload: Partial<Task> | Record<string, unknown>;
  baseUpdatedAt?: string | null;
  baseVersion?: number;
  createdAt: string;
  retryCount: number;
};
