import type { Task, ContextType } from '../types';
import { calculateTaskScore } from './ranking';

export function getDailyBriefing(tasks: Task[], currentEnergy: number, activeContext: ContextType, limit: number = 3): Task[] {
  // Get only pending tasks
  const pendingTasks = tasks.filter(t => !t.deleted_at && t.status === 'todo');

  // Calculate scores
  const tasksWithScore = pendingTasks.map(task => ({
    ...task,
    score: calculateTaskScore(task, currentEnergy, activeContext)
  }));

  // Sort by highest score
  tasksWithScore.sort((a, b) => b.score - a.score);

  // Return the top N tasks
  return tasksWithScore.slice(0, limit);
}
