import type { Task } from '../types';

export function isActionableBriefingTask(task: Task, now: Date): boolean {
  if (task.deleted_at) return false;
  if (task.status === 'done') return false;
  if (!task.due_at) return true;

  return new Date(task.due_at).getTime() >= now.getTime();
}
