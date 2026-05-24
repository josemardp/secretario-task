import React, { useMemo } from 'react';
import type { Task } from '../types';
import { calculateTaskScore } from '../lib/ranking';
import { useContextStore } from '../stores/contextStore';

interface TimelineViewProps {
  tasks: Task[];
}

interface TimelineBlock {
  id: string;
  type: 'task' | 'break';
  title: string;
  startTime: Date;
  endTime: Date;
  task?: Task;
}

export function TimelineView({ tasks }: TimelineViewProps) {
  const { currentEnergy, activeContext } = useContextStore();

  const blocks = useMemo(() => {
    const today = new Date();
    today.setHours(8, 30, 0, 0); // Início às 08:30
    
    // Pegar apenas tarefas "A Fazer" (todo)
    const todoTasks = tasks.filter(t => t.status === 'todo' && !t.deleted_at);
    
    // Ordenar pelo ranking de prioridade (as mais urgentes/melhor score vêm primeiro)
    const sortedTasks = todoTasks
      .map(task => ({
        ...task,
        score: calculateTaskScore(task, currentEnergy, activeContext)
      }))
      .sort((a, b) => b.score - a.score);

    const timeline: TimelineBlock[] = [];
    let currentTime = new Date(today.getTime());
    const limitNormal = new Date(today.getTime());
    limitNormal.setHours(17, 0, 0, 0);
    const limitUrgent = new Date(today.getTime());
    limitUrgent.setHours(21, 0, 0, 0);

    for (const task of sortedTasks) {
      const duration = task.estimated_minutes || 30;
      
      // Se passar das 17h e não for urgente (priority < 8), para de agendar
      if (currentTime >= limitNormal && task.priority < 8) {
        continue;
      }
      
      // Se passar das 21h, para tudo
      if (currentTime >= limitUrgent) {
        break;
      }

      const blockStart = new Date(currentTime.getTime());
      const blockEnd = new Date(currentTime.getTime() + duration * 60000);
      
      timeline.push({
        id: task.id,
        type: 'task',
        title: task.title,
        startTime: blockStart,
        endTime: blockEnd,
        task: task
      });
      
      currentTime = new Date(blockEnd.getTime());

      // Lógica de Pausa Inteligente (Neurodivergente)
      // Tarefas chatas (baixa energia, prioridade menor) ganham pausa depois.
      // Tarefas de hiperfoco (alta energia) ganham menos pausas.
      let pauseDuration = 0;
      if (task.energy < 4) {
        pauseDuration = 15; // Tarefas maçantes exigem pausa maior
      } else if (task.energy > 7) {
        pauseDuration = 5; // Tarefas de hiperfoco não quebram o fluxo, apenas respiro rápido
      } else {
        pauseDuration = 10;
      }

      const pauseEnd = new Date(currentTime.getTime() + pauseDuration * 60000);
      
      if (pauseEnd < limitUrgent) {
        timeline.push({
          id: `pause-${task.id}`,
          type: 'break',
          title: '☕ Pausa Estratégica',
          startTime: new Date(currentTime.getTime()),
          endTime: pauseEnd
        });
        currentTime = new Date(pauseEnd.getTime());
      }
    }

    return timeline;
  }, [tasks, currentEnergy, activeContext]);

  if (blocks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhuma tarefa pendente para organizar na linha do tempo hoje.
      </div>
    );
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="relative border-l-2 border-indigo-200 ml-4">
        {blocks.map((block, idx) => (
          <div key={block.id} className="mb-6 ml-6 relative">
            <span className={`absolute -left-[35px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${
              block.type === 'break' ? 'bg-orange-100 text-orange-500 text-xs' : 'bg-indigo-600 text-white text-xs font-bold'
            }`}>
              {block.type === 'break' ? '☕' : idx / 2 + 1}
            </span>
            
            <div className={`p-4 rounded-lg shadow-sm border ${
              block.type === 'break' 
                ? 'bg-orange-50 border-orange-100' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-gray-500">
                  {formatTime(block.startTime)} - {formatTime(block.endTime)}
                </span>
                {block.type === 'task' && block.task && (
                  <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">
                    {block.task.estimated_minutes || 30} min
                  </span>
                )}
              </div>
              
              <h3 className={`text-base font-semibold ${
                block.type === 'break' ? 'text-orange-700' : 'text-gray-900'
              }`}>
                {block.title}
              </h3>
              
              {block.type === 'task' && block.task && (
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    Energia: {block.task.energy}
                  </span>
                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded">
                    Prioridade: {block.task.priority}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
