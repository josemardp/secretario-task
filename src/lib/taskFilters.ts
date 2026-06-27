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

export function getTaskResolvedAt(task: Task): string | null {
  if (task.deleted_at) return null;
  if (task.resolution_type === 'completed' || task.status === 'done') return task.completed_at ?? null;
  if (isClosedWithoutExecution(task)) return task.resolved_at ?? null;
  return null;
}

function isSameLocalDay(iso: string, date: Date): boolean {
  const value = new Date(iso);
  if (!Number.isFinite(value.getTime())) return false;

  return value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate();
}

export function filterTasksByText(tasks: Task[], query: string): Task[] {
  const q = query.toLowerCase().trim();
  if (!q) return tasks;
  return tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false),
  );
}

export function getResolvedTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks
    .filter((task) => {
      const resolvedAt = getTaskResolvedAt(task);
      return !!resolvedAt && isSameLocalDay(resolvedAt, date);
    })
    .sort((a, b) => {
      const aTime = new Date(getTaskResolvedAt(a) ?? 0).getTime();
      const bTime = new Date(getTaskResolvedAt(b) ?? 0).getTime();
      return bTime - aTime;
    });
}
