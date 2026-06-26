import type { Task } from '../types';

export const TIMER_SUSPICIOUS_THRESHOLD_MINUTES = 8 * 60;

export function buildActualMinutesFromStartedAt(startedAt: string): Pick<Partial<Task>, 'actual_minutes' | 'actual_minutes_source'> {
  const startedAtMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedAtMs)) {
    return { actual_minutes_source: 'unknown' };
  }

  const elapsedMinutes = Math.max(0, Math.round((Date.now() - startedAtMs) / 60_000));
  return {
    actual_minutes: elapsedMinutes,
    actual_minutes_source: elapsedMinutes > TIMER_SUSPICIOUS_THRESHOLD_MINUTES ? 'unknown' : 'timer',
  };
}

export function buildReopenUpdates(status?: Task['status']): Partial<Task> {
  return {
    ...(status ? { status } : {}),
    completed_at: null,
    completed_at_confidence: null,
    resolution_type: null,
    resolved_at: null,
    started_at: null,
    actual_minutes: null,
    actual_minutes_source: null,
  };
}
