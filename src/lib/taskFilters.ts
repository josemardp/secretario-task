import type { ResolutionType, Task } from '../types';

const CLOSED_WITHOUT_EXECUTION: ResolutionType[] = ['cancelled', 'delegated', 'obsolete'];

export function isClosedWithoutExecution(task: Task): boolean {
  return !!task.resolution_type && CLOSED_WITHOUT_EXECUTION.includes(task.resolution_type);
}

export function isActiveTask(task: Task): boolean {
  return !task.deleted_at && !isClosedWithoutExecution(task);
}

export function isOpenTask(task: Task): boolean {
  return isActiveTask(task) && task.status !== 'done';
}

export function isActionableBriefingTask(task: Task, now: Date): boolean {
  if (!isOpenTask(task)) return false;
  if (!task.due_at) return true;

  return new Date(task.due_at).getTime() >= now.getTime();
}
