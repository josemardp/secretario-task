import { useEffect, useRef } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useNotifications } from '../hooks/useNotifications';
import { isOpenTask } from '../lib/taskFilters';

export function NotificationEngine() {
  const { tasks } = useTaskStore();
  const { permission, sendNotification } = useNotifications();
  const notifiedTasks = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only run if notifications are granted
    if (permission !== 'granted') return;

    // 1. Briefing do dia (primeira abertura do dia)
    const todayStr = new Date().toISOString().split('T')[0];
    const lastBriefingDate = localStorage.getItem('secretario-task:last-briefing-date');
    
    if (lastBriefingDate !== todayStr) {
      sendNotification('Briefing do dia', {
        body: 'Abra o SecretárioTask para ver suas prioridades de hoje.',
        tag: 'daily-briefing' // Tag prevents duplicate popups
      });
      localStorage.setItem('secretario-task:last-briefing-date', todayStr);
    }

    // 2. Scheduled Tasks Check (runs every 60 seconds)
    const checkTasks = () => {
      const now = new Date();
      
      const todoTasks = tasks.filter(t => isOpenTask(t) && t.due_at);
      
      todoTasks.forEach(task => {
        if (!task.due_at || notifiedTasks.current.has(task.id)) return;
        
        const dueTime = new Date(task.due_at);
        const timeDiffMinutes = (dueTime.getTime() - now.getTime()) / (1000 * 60);
        
        // Notify if task is due in 15 minutes or less, OR if it's already delayed by up to 60 mins
        if (timeDiffMinutes <= 15 && timeDiffMinutes >= -60) {
          sendNotification(timeDiffMinutes < 0 ? 'Tarefa atrasada' : 'Tarefa se aproximando', {
            body: `A tarefa "${task.title}" está marcada para ${dueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            tag: `task-${task.id}`,
            requireInteraction: true // Keep it on screen until user clicks
          });
          notifiedTasks.current.add(task.id);
        }
      });
    };

    // Run once immediately, then every minute
    checkTasks();
    const intervalId = setInterval(checkTasks, 60000);

    return () => clearInterval(intervalId);
  }, [tasks, permission, sendNotification]);

  return null; // This component is strictly logical, no UI
}
