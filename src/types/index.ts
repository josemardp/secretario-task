export type ContextType = 'PM' | 'Esdra' | 'Pessoal' | 'Familia' | 'CCB' | 'Estudo' | 'Saude';
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
}

export type PendingMutation = {
  id: string;
  entity: 'task';
  operation: 'insert' | 'update' | 'delete';
  entityId: string;
  payload: Partial<Task>;
  createdAt: string;
  retryCount: number;
};
