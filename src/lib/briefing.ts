import type { Task, ContextType } from '../types';
import { calculateTaskScore } from './ranking';
import { generateSmartBriefing } from './ai';
import { isActionableBriefingTask } from './taskFilters';

export function getDailyBriefing(tasks: Task[], currentEnergy: number, activeContext: ContextType, limit: number = 3): Task[] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const isForToday = (dueAt: string | null) => {
    if (!dueAt) return true;
    const due = new Date(dueAt);
    return due >= start && due <= end;
  };

  // "Pendentes, não deletadas, do dia corrente e ainda acionáveis"
  const pendingTodayTasks = tasks.filter((t) => isActionableBriefingTask(t, now) && isForToday(t.due_at));

  // Calculate scores without mutating task shape
  const tasksWithScore = pendingTodayTasks.map((task) => ({
    task,
    score: calculateTaskScore(task, currentEnergy, activeContext),
  }));

  // Sort deterministically (stable tie-breakers)
  const dueMs = (t: Task) => (t.due_at ? new Date(t.due_at).getTime() : Number.POSITIVE_INFINITY);
  const createdMs = (t: Task) => (t.created_at ? new Date(t.created_at).getTime() : Number.POSITIVE_INFINITY);

  tasksWithScore.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dueDiff = dueMs(a.task) - dueMs(b.task);
    if (dueDiff !== 0) return dueDiff;
    const priDiff = (b.task.priority || 0) - (a.task.priority || 0);
    if (priDiff !== 0) return priDiff;
    const ageDiff = createdMs(a.task) - createdMs(b.task); // older first
    if (ageDiff !== 0) return ageDiff;
    return a.task.id.localeCompare(b.task.id);
  });

  // Return the top N tasks
  return tasksWithScore.slice(0, limit).map((x) => x.task);
}

export async function generateBriefingFromTopTasks(
  topTasks: Task[],
  currentEnergy: number,
  aiApiKey: string
): Promise<string> {
  const now = new Date();
  const actionableTasks = topTasks.filter((task) => isActionableBriefingTask(task, now));

  return generateSmartBriefing(actionableTasks, currentEnergy, aiApiKey);
}
