import type { ResolutionType, Task } from '../types';
import { buildActualMinutesFromStartedAt } from './timeTracking';

export function buildCompleteUpdates(task: Task): Partial<Task> {
  const updates: Partial<Task> = { status: 'done' };

  if (task.status !== 'done') {
    const completedAt = new Date().toISOString();
    updates.completed_at = completedAt;
    updates.completed_at_confidence = 'confirmed';
    updates.resolution_type = 'completed';
    updates.resolved_at = completedAt;
  }

  if (task.status !== 'done' && task.started_at) {
    Object.assign(updates, buildActualMinutesFromStartedAt(task.started_at));
  }

  return updates;
}

export function buildResolutionUpdates(
  resolutionType: Exclude<ResolutionType, 'completed'>,
): Partial<Task> {
  return {
    resolution_type: resolutionType,
    resolved_at: new Date().toISOString(),
    completed_at: null,
    completed_at_confidence: null,
  };
}
