import { useMemo } from 'react';
import type { Task } from '../types';
import { CONTEXTS_LIST } from '../types';
import { calculateTaskScore } from '../lib/ranking';
import { useContextStore } from '../stores/contextStore';
import { useTaskStore } from '../stores/taskStore';
import { TaskActions } from './TaskActions';
import { CalendarWidget } from './CalendarWidget';
import { useState } from 'react';

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
  const { updateTask } = useTaskStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updates: Partial<Task> = { status: 'done' };
    if (task?.started_at) {
      const start = new Date(task.started_at).getTime();
      const end = new Date().getTime();
      updates.actual_minutes = Math.round((end - start) / 60000);
    }
    updateTask(taskId, updates);
  };

  const handlePostponeTomorrow = (taskId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    updateTask(taskId, { due_at: tomorrow.toISOString() });
  };

  const handlePostponeDate = (taskId: string, dateString: string) => {
    const selected = new Date(dateString + 'T23:59:59');
    updateTask(taskId, { due_at: selected.toISOString() });
  };

  const blocks = useMemo(() => {
    const now = new Date();
    const isToday = selectedDate.getDate() === now.getDate() && 
                    selectedDate.getMonth() === now.getMonth() && 
                    selectedDate.getFullYear() === now.getFullYear();

    const limitNormal = new Date(selectedDate.getTime());
    limitNormal.setHours(17, 0, 0, 0);
    const limitUrgent = new Date(selectedDate.getTime());
    limitUrgent.setHours(21, 0, 0, 0);

    const startOfDay = new Date(selectedDate.getTime());
    startOfDay.setHours(8, 30, 0, 0);
    
    // O início da linha do tempo
    let currentTime = new Date(isToday ? Math.max(now.getTime(), startOfDay.getTime()) : startOfDay.getTime());
    
    // Pegar apenas tarefas "A Fazer" (todo)
    let todoTasks = tasks.filter(t => t.status === 'todo' && !t.deleted_at);
    
    if (isToday) {
      todoTasks = todoTasks.filter(t => {
        if (!t.due_at) return true;
        const due = new Date(t.due_at);
        return due <= now || (due.getDate() === now.getDate() && due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear());
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
    
    // Ordenar pelo ranking de prioridade (as mais urgentes/melhor score vêm primeiro)
    const sortedTasks = todoTasks
      .map(task => ({
        ...task,
        score: calculateTaskScore(task, currentEnergy, activeContext)
      }))
      .sort((a, b) => b.score - a.score);

    const timeline: TimelineBlock[] = [];

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
  }, [tasks, currentEnergy, activeContext, selectedDate]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      
      {/* Calendar Header */}
      <div className="mb-8 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Agenda do Dia
          </h2>
          <p className="text-sm text-gray-500 capitalize">
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button 
          onClick={() => setIsCalendarOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
        >
          📅 Mês
        </button>
      </div>

      {isCalendarOpen && (
        <CalendarWidget
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onClose={() => setIsCalendarOpen(false)}
          tasks={tasks}
        />
      )}

      {blocks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
          Nenhuma tarefa programada para este dia.
        </div>
      ) : (
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
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-bold text-gray-500">
                  {formatTime(block.startTime)} - {formatTime(block.endTime)}
                </span>
                {block.type === 'task' && block.task && (
                  <div className="flex gap-2 items-center">
                    {/* Lógica de Tarefa Atrasada */}
                    {((block.task.due_at && new Date(block.task.due_at) < new Date()) || 
                      (!block.task.due_at && new Date(block.task.created_at).getTime() < new Date().getTime() - 3 * 60 * 60 * 1000 && new Date(block.task.created_at).getDate() === new Date().getDate())
                    ) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 animate-pulse">
                        ⚠️ Atrasada
                      </span>
                    )}
                    <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">
                      {block.task.estimated_minutes || 30} min
                    </span>
                  </div>
                )}
              </div>
              
              <h3 className={`text-base font-semibold flex items-center gap-1 ${
                block.type === 'break' ? 'text-orange-700' : 'text-gray-900'
              }`}>
                {block.type === 'task' && block.task?.recurrence_rule && (
                  <span title="Tarefa Recorrente" className="text-indigo-500 text-xs">🔁</span>
                )}
                {block.title}
              </h3>
              
              {block.type === 'task' && block.task && (
                <>
                  <div className="mt-2 flex gap-2 text-xs mb-3 flex-wrap items-center">
                    <select
                      value={block.task.context}
                      onChange={(e) => updateTask(block.task!.id, { context: e.target.value as any })}
                      className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 cursor-pointer outline-none border-0 focus:ring-2 focus:ring-indigo-600 appearance-none text-center"
                      title="Clique para alterar o contexto"
                    >
                      {CONTEXTS_LIST.map((ctx) => (
                        <option key={ctx} value={ctx}>{ctx}</option>
                      ))}
                    </select>
                    <div className="inline-flex items-center text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      🗓️
                      <input 
                        type="datetime-local" 
                        value={block.task.due_at ? new Date(new Date(block.task.due_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateTask(block.task!.id, { due_at: val ? new Date(val).toISOString() : null });
                        }}
                        className="ml-1 bg-transparent border-none p-0 text-xs cursor-pointer text-indigo-600 focus:ring-0 w-32"
                        title="Alterar data/hora"
                      />
                    </div>
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      Energia: {block.task.energy}
                    </span>
                    <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded">
                      Prioridade: {block.task.priority}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <TaskActions 
                      showComplete={true}
                      onComplete={() => handleComplete(block.task!.id)}
                      onPostponeTomorrow={() => handlePostponeTomorrow(block.task!.id)}
                      onPostponeDate={(dateString) => handlePostponeDate(block.task!.id, dateString)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
    </div>
  );
}
