import { useState, useEffect, useMemo } from 'react';
import type { Task, ContextType } from '../types';
import { calculateTaskScore } from '../lib/ranking';
import { isOpenTask } from '../lib/taskFilters';

export interface TimelineBlock {
  id: string;
  type: 'task' | 'break';
  title: string;
  startTime: Date;
  endTime: Date;
  task?: Task;
}

export function calculateAgendaBlocks(
  tasks: Task[],
  selectedDate: Date,
  activeContext: ContextType,
  now: Date,
  isToday: boolean
): TimelineBlock[] {
  const startOfDay = new Date(selectedDate.getTime());
  startOfDay.setHours(8, 30, 0, 0);

  const currentTime = new Date(isToday ? Math.max(now.getTime(), startOfDay.getTime()) : startOfDay.getTime());
  const m = currentTime.getMinutes();
  if (m > 0 && m <= 30) currentTime.setMinutes(30, 0, 0);
  else if (m > 30) currentTime.setHours(currentTime.getHours() + 1, 0, 0, 0);

  let todoTasks = tasks.filter(isOpenTask);

  if (isToday) {
    todoTasks = todoTasks.filter(t => {
      if (!t.due_at) return true;
      const due = new Date(t.due_at);
      return due <= now || (
        due.getDate() === now.getDate() &&
        due.getMonth() === now.getMonth() &&
        due.getFullYear() === now.getFullYear()
      );
    });
  } else {
    todoTasks = todoTasks.filter(t => {
      if (!t.due_at) return false;
      const due = new Date(t.due_at);
      return due.getDate() === selectedDate.getDate() &&
             due.getMonth() === selectedDate.getMonth() &&
             due.getFullYear() === selectedDate.getFullYear();
    });
  }

  const timeline: TimelineBlock[] = [];

  if (isToday) {
    const currentSlotStart = new Date(now.getTime());
    currentSlotStart.setMinutes(now.getMinutes() >= 30 ? 30 : 0, 0, 0);

    // 1. Future scheduled tasks (due_at > now)
    const futureScheduled = todoTasks.filter(t => t.due_at && new Date(t.due_at) > now);
    for (const task of futureScheduled) {
      const duration = task.estimated_minutes || 30;
      const blockStart = new Date(task.due_at!);
      const blockEnd = new Date(blockStart.getTime() + duration * 60000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
    }

    // 2. Late tasks (due_at <= now) -> treated as "now" (start at currentSlotStart)
    const lateTasks = todoTasks.filter(t => t.due_at && new Date(t.due_at) <= now);
    for (const task of lateTasks) {
      const duration = task.estimated_minutes || 30;
      const blockStart = new Date(currentSlotStart);
      const blockEnd = new Date(blockStart.getTime() + duration * 60000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
    }

    // 3. Unscheduled tasks (due_at is null)
    const unscheduled = todoTasks.filter(t => !t.due_at);
    const toQueue = unscheduled
      .map(task => ({ ...task, score: calculateTaskScore(task, activeContext) }))
      .sort((a, b) => b.score - a.score);

    const MAX_PER_SLOT = 4;
    const lastSlotStart = new Date(selectedDate);
    lastSlotStart.setHours(16, 30, 0, 0);

    let slotStart = new Date(Math.min(currentTime.getTime(), lastSlotStart.getTime()));
    let countInSlot = 0;

    for (const task of toQueue) {
      if (countInSlot >= MAX_PER_SLOT && slotStart.getTime() < lastSlotStart.getTime()) {
        slotStart = new Date(Math.min(slotStart.getTime() + 30 * 60 * 1000, lastSlotStart.getTime()));
        countInSlot = 0;
      }
      const blockStart = new Date(slotStart);
      const blockEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
      countInSlot++;
    }
  } else {
    // isToday is false: original logic
    const futureScheduled = todoTasks.filter(t => t.due_at && new Date(t.due_at) > now);
    for (const task of futureScheduled) {
      const duration = task.estimated_minutes || 30;
      const blockStart = new Date(task.due_at!);
      const blockEnd = new Date(blockStart.getTime() + duration * 60000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
    }

    const toQueue = todoTasks
      .filter(t => !t.due_at || new Date(t.due_at) <= now)
      .map(task => ({ ...task, score: calculateTaskScore(task, activeContext) }))
      .sort((a, b) => b.score - a.score);

    const MAX_PER_SLOT = 4;
    const lastSlotStart = new Date(selectedDate);
    lastSlotStart.setHours(16, 30, 0, 0);

    let slotStart = new Date(Math.min(currentTime.getTime(), lastSlotStart.getTime()));
    let countInSlot = 0;

    for (const task of toQueue) {
      if (countInSlot >= MAX_PER_SLOT && slotStart.getTime() < lastSlotStart.getTime()) {
        slotStart = new Date(Math.min(slotStart.getTime() + 30 * 60 * 1000, lastSlotStart.getTime()));
        countInSlot = 0;
      }
      const blockStart = new Date(slotStart);
      const blockEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
      countInSlot++;
    }
  }

  // Sort timeline blocks
  timeline.sort((a, b) => {
    const diff = a.startTime.getTime() - b.startTime.getTime();
    if (diff !== 0) return diff;

    // If start times are identical, sort by original due_at (preserve relative order)
    if (a.task && b.task) {
      const aDue = a.task.due_at ? new Date(a.task.due_at).getTime() : Infinity;
      const bDue = b.task.due_at ? new Date(b.task.due_at).getTime() : Infinity;
      return aDue - bDue;
    }
    return 0;
  });

  return timeline;
}

export function useAgendaPositions(
  tasks: Task[],
  selectedDate: Date,
  activeContext: ContextType
) {
  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.getDate() === today.getDate() &&
           selectedDate.getMonth() === today.getMonth() &&
           selectedDate.getFullYear() === today.getFullYear();
  }, [selectedDate]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isToday) return;

    // Reset now to current date when changing to today.
    const frame = requestAnimationFrame(() => setNow(new Date()));

    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000); // 30 seconds

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [isToday]);

  const blocks = useMemo(() => {
    return calculateAgendaBlocks(tasks, selectedDate, activeContext, now, isToday);
  }, [tasks, selectedDate, activeContext, now, isToday]);

  return { blocks, now };
}
