import type { PendingMutation, ResolutionType, Task } from '../types';

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

/** Tempo que uma mutation pode ficar na fila antes de virar sinal de problema.
 *
 * Ter mutation pendente é normal por alguns instantes: o push imediato sai em
 * menos de um segundo. O que interessa marcar na tela é a fila **parada** — sem
 * rede, com erro no servidor, ou enfileirada com o app já congelado em segundo
 * plano. Com um limiar menor o marcador piscaria a cada toque e viraria ruído
 * em vez de sinal. */
export const UNSYNCED_GRACE_MS = 60_000;

/** A tarefa tem alteração presa na fila de sync há tempo demais?
 *
 * Puro e determinístico: recebe `now` por parâmetro, seguindo o padrão do
 * arquivo. Usado pela Agenda para marcar a tarefa que ainda não subiu. */
export function hasStalePendingMutation(
  mutations: PendingMutation[],
  taskId: string,
  now: Date,
): boolean {
  return mutations.some((mutation) => {
    if (mutation.entity !== 'task' || mutation.entityId !== taskId) return false;
    // Já falhou pelo menos uma vez: não há o que esperar, sinaliza na hora.
    if (mutation.retryCount > 0) return true;

    const queuedAt = new Date(mutation.createdAt).getTime();
    if (!Number.isFinite(queuedAt)) return false;

    return now.getTime() - queuedAt >= UNSYNCED_GRACE_MS;
  });
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

export function getReviewEligibleTasks(tasks: Task[], topN?: number): Task[] {
  const eligible = tasks
    .filter((task) => isOpenTask(task) && !task.blocker_type)
    .sort((a, b) => {
      const postponedDelta = (b.postponed_count ?? 0) - (a.postponed_count ?? 0);
      if (postponedDelta !== 0) return postponedDelta;

      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      const safeACreated = Number.isFinite(aCreated) ? aCreated : 0;
      const safeBCreated = Number.isFinite(bCreated) ? bCreated : 0;
      return safeACreated - safeBCreated;
    });

  return typeof topN === 'number' ? eligible.slice(0, Math.max(0, topN)) : eligible;
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
