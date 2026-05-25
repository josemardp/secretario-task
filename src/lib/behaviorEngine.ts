import type { Task } from '../types';

export interface BehavioralProfile {
  highEnergyPeakHour: number | null;
  lowEnergyPeakHour: number | null;
}

export function analyzeBehavior(tasks: Task[]): BehavioralProfile {
  // Pega apenas tarefas concluídas que tenham a data de alteração
  const doneTasks = tasks.filter(t => t.status === 'done' && t.updated_at);
  
  // Exige um mínimo de dados para não fazer conclusões precipitadas
  if (doneTasks.length < 3) {
    return { highEnergyPeakHour: null, lowEnergyPeakHour: null };
  }

  const highEnergyHours: Record<number, number> = {};
  const lowEnergyHours: Record<number, number> = {};

  doneTasks.forEach(t => {
    const hour = new Date(t.updated_at).getHours();
    
    // Alta energia: 7 a 10
    if (t.energy >= 7) {
      highEnergyHours[hour] = (highEnergyHours[hour] || 0) + 1;
    }
    // Baixa energia: 0 a 3
    else if (t.energy <= 3) {
      lowEnergyHours[hour] = (lowEnergyHours[hour] || 0) + 1;
    }
  });

  const getPeak = (counts: Record<number, number>) => {
    let peakHour = null;
    let maxCount = 0;
    // Precisamos de pelo menos 2 ocorrências no mesmo horário para considerar um padrão real
    for (const [hourStr, count] of Object.entries(counts)) {
      if (count > maxCount && count >= 2) {
        maxCount = count;
        peakHour = parseInt(hourStr, 10);
      }
    }
    return peakHour;
  };

  return {
    highEnergyPeakHour: getPeak(highEnergyHours),
    lowEnergyPeakHour: getPeak(lowEnergyHours),
  };
}

export function getSuggestion(tasks: Task[], currentHour: number = new Date().getHours()): { message: string; suggestedTaskId: string | null; type: 'high' | 'low' } | null {
  const profile = analyzeBehavior(tasks);
  
  // Busca tarefas pendentes que não tenham data futura (podem ser feitas hoje)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const pendingTasks = tasks.filter(t => {
    if (t.status !== 'todo') return false;
    if (t.due_at) {
      const due = new Date(t.due_at);
      due.setHours(0, 0, 0, 0);
      if (due > today) return false; // Ignora tarefas agendadas pro futuro
    }
    return true;
  });

  // Checa se estamos no pico de alta energia
  if (profile.highEnergyPeakHour === currentHour) {
    // Encontra a tarefa pesada mais antiga pendente
    const heavyTask = pendingTasks.filter(t => t.energy >= 7).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    if (heavyTask) {
      return {
        message: `Seu cérebro costuma voar nas tarefas complexas às ${currentHour}h. Que tal atacar: "${heavyTask.title}"?`,
        suggestedTaskId: heavyTask.id,
        type: 'high'
      };
    }
  }

  // Checa se estamos no pico de baixa energia
  if (profile.lowEnergyPeakHour === currentHour) {
    // Encontra a tarefa leve mais antiga pendente
    const lightTask = pendingTasks.filter(t => t.energy <= 3).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    if (lightTask) {
      return {
        message: `Sua energia costuma cair às ${currentHour}h. Que tal adiantar algo leve como: "${lightTask.title}"?`,
        suggestedTaskId: lightTask.id,
        type: 'low'
      };
    }
  }

  return null;
}
