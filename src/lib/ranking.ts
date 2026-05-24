import type { Task, ContextType } from '../types';

export function calculateTaskScore(task: Task, currentEnergy: number, activeContext: ContextType): number {
  const now = new Date();
  
  // 1. f_due: Proximity to deadline (0 to 1)
  let f_due = 0;
  if (task.due_at) {
    const dueDate = new Date(task.due_at);
    // Difference in milliseconds
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 0) {
      // Overdue or today
      f_due = 1.0;
    } else if (diffDays <= 14) {
      // Scales linearly from 1 to 0 over 14 days
      f_due = 1.0 - (diffDays / 14);
    } else {
      f_due = 0;
    }
  }

  // 2. f_urgency: Combines priority and deadline (0 to 1)
  const priority = task.priority || 0;
  const f_urgency = (priority / 10) * 0.6 + f_due * 0.4;

  // 3. f_energy: Match between task energy and user current energy (0 to 1)
  const taskEnergy = task.energy || 0;
  const energyDiff = Math.abs((taskEnergy / 10) - (currentEnergy / 10));
  const f_energy = 1.0 - energyDiff;

  // 4. f_age: Task age in days, capped at 30 days (0 to 1)
  let f_age = 0;
  if (task.created_at) {
    const createdDate = new Date(task.created_at);
    const ageMs = now.getTime() - createdDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    f_age = Math.min(ageDays / 30, 1.0);
  }

  // 5. f_context: Match with active context (0 or 1)
  const f_context = task.context === activeContext ? 1.0 : 0;

  // Final Score (0 to 1)
  const score = (f_urgency * 0.4) + (f_energy * 0.2) + (f_age * 0.2) + (f_context * 0.2);

  return score;
}
