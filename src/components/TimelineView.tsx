import { useMemo, useState } from 'react';
import type { Task } from '../types';
import { CONTEXTS_LIST } from '../types';
import { calculateTaskScore } from '../lib/ranking';
import { useContextStore } from '../stores/contextStore';
import { useTaskStore } from '../stores/taskStore';
import { TaskActions } from './TaskActions';
import { CalendarWidget } from './CalendarWidget';

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
  const { updateTask, deleteTask } = useTaskStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dismissedBreaks, setDismissedBreaks] = useState<string[]>([]);

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
    const task = tasks.find(t => t.id === taskId);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    updateTask(taskId, { due_at: tomorrow.toISOString(), postponed_count: (task?.postponed_count || 0) + 1 });
  };

  const handlePostponeDate = (taskId: string, dateString: string) => {
    const task = tasks.find(t => t.id === taskId);
    const selected = new Date(dateString + 'T23:59:59');
    updateTask(taskId, { due_at: selected.toISOString(), postponed_count: (task?.postponed_count || 0) + 1 });
  };

  const handleDrop = (e: React.DragEvent, slotDate: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && !taskId.startsWith('pause-')) {
      updateTask(taskId, { due_at: slotDate.toISOString() });
    }
  };

  const blocks = useMemo(() => {
    const now = new Date();
    const isToday = selectedDate.getDate() === now.getDate() &&
                    selectedDate.getMonth() === now.getMonth() &&
                    selectedDate.getFullYear() === now.getFullYear();

    const startOfDay = new Date(selectedDate.getTime());
    startOfDay.setHours(8, 30, 0, 0);

    // currentTime só é usado para tarefas SEM due_at
    let currentTime = new Date(isToday ? Math.max(now.getTime(), startOfDay.getTime()) : startOfDay.getTime());
    const m = currentTime.getMinutes();
    if (m > 0 && m <= 30) currentTime.setMinutes(30, 0, 0);
    else if (m > 30) currentTime.setHours(currentTime.getHours() + 1, 0, 0, 0);

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

    const timeline: TimelineBlock[] = [];

    // ── Tarefas COM horário definido: respeitam o horário exato, sem arredondar ──
    const scheduled = todoTasks.filter(t => t.due_at);
    for (const task of scheduled) {
      const duration = task.estimated_minutes || 30;
      const blockStart = new Date(task.due_at!);
      const blockEnd = new Date(blockStart.getTime() + duration * 60000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
    }

    // ── Tarefas SEM horário: agendadas sequencialmente com pausas ──
    const unscheduled = todoTasks
      .filter(t => !t.due_at)
      .map(task => ({ ...task, score: calculateTaskScore(task, currentEnergy, activeContext) }))
      .sort((a, b) => b.score - a.score);

    for (const task of unscheduled) {
      const duration = task.estimated_minutes || 30;
      const blockStart = new Date(currentTime);
      const blockEnd = new Date(currentTime.getTime() + duration * 60000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
      currentTime = new Date(blockEnd.getTime());

      let pauseDuration = 0;
      if (task.energy < 4) pauseDuration = 15;
      else if (task.energy > 7) pauseDuration = 5;
      else pauseDuration = 10;

      if (pauseDuration > 0) {
        const pauseEnd = new Date(currentTime.getTime() + 30 * 60000);
        const pId = `pause-${task.id}`;
        if (!dismissedBreaks.includes(pId)) {
          timeline.push({ id: pId, type: 'break', title: '☕ Pausa Estratégica', startTime: new Date(currentTime.getTime()), endTime: pauseEnd });
          currentTime = new Date(pauseEnd.getTime());
        }
      }
    }

    timeline.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    return timeline;
  }, [tasks, currentEnergy, activeContext, selectedDate, dismissedBreaks]);

  // Gerar grid de horários 08:30 até 22:00
  const timeGrid: { timeString: string; dateObj: Date }[] = [];
  for (let h = 8; h <= 21; h++) {
    if (h === 8) {
      const d = new Date(selectedDate); d.setHours(8, 30, 0, 0);
      timeGrid.push({ timeString: '08:30', dateObj: d });
    } else {
      const d1 = new Date(selectedDate); d1.setHours(h, 0, 0, 0);
      timeGrid.push({ timeString: `${h.toString().padStart(2, '0')}:00`, dateObj: d1 });
      const d2 = new Date(selectedDate); d2.setHours(h, 30, 0, 0);
      timeGrid.push({ timeString: `${h.toString().padStart(2, '0')}:30`, dateObj: d2 });
    }
  }

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-4xl mx-auto py-6 px-2">
      <div className="mb-8 flex items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-w-0">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-800">Agenda do Dia</h2>
          <p className="text-sm text-gray-500 capitalize truncate">
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => setIsCalendarOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors shrink-0"
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {timeGrid.map((slot) => {
          // Filtrar os blocos que cobrem este slot de 30 min
          const slotBlocks = blocks.filter(b =>
            b.startTime.getTime() < slot.dateObj.getTime() + 30 * 60 * 1000 &&
            b.endTime.getTime() > slot.dateObj.getTime()
          );

          return (
            <div 
              key={slot.timeString} 
              className="flex border-b border-gray-100 min-h-[80px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, slot.dateObj)}
            >
              {/* Horário (Coluna Esquerda) */}
              <div className="w-16 flex-shrink-0 border-r border-gray-50 bg-gray-50/50 p-2 text-right">
                <span className="text-xs font-semibold text-gray-400">{slot.timeString}</span>
              </div>
              
              {/* Espaço das Tarefas (Coluna Direita) */}
              <div className="flex-1 min-w-0 p-2 flex flex-col gap-2 relative">
                {slotBlocks.map((block) => (
                  <div 
                    key={`${block.id}-${slot.timeString}`}
                    draggable={block.type === 'task'}
                    onDragStart={(e) => {
                      if (block.type === 'task') {
                        e.dataTransfer.setData('taskId', block.id);
                      }
                    }}
                    className={`p-3 rounded-lg shadow-sm border cursor-grab active:cursor-grabbing w-full min-w-0 overflow-hidden flex flex-col ${
                      block.type === 'break' 
                        ? 'bg-orange-50 border-orange-100' 
                        : 'bg-white border-indigo-100 ring-1 ring-indigo-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500">
                        {formatTime(block.startTime)} - {formatTime(block.endTime)}
                      </span>
                      {block.type === 'break' ? (
                        <button 
                          onClick={() => setDismissedBreaks([...dismissedBreaks, block.id])}
                          className="text-orange-400 hover:text-orange-600 font-bold px-2 rounded hover:bg-orange-100"
                          title="Ignorar Pausa"
                        >
                          ✕
                        </button>
                      ) : block.task && (
                        <div className="flex gap-2 items-center flex-wrap">
                          {((block.task.due_at && new Date(block.task.due_at) < new Date()) || 
                            (!block.task.due_at && new Date(block.task.created_at).getTime() < new Date().getTime() - 3 * 60 * 60 * 1000 && new Date(block.task.created_at).getDate() === new Date().getDate())
                          ) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 animate-pulse">
                              ⚠️ Atrasada
                            </span>
                          )}
                          <div className="flex items-center bg-gray-50 rounded-md h-[24px]">
                            <button 
                              onClick={() => updateTask(block.task!.id, { estimated_minutes: Math.max(5, (block.task!.estimated_minutes || 30) - 15) })}
                              className="px-2 text-gray-400 hover:text-indigo-600 border-r border-gray-200 text-xs font-bold"
                            >-</button>
                            <span className="text-xs font-medium text-gray-600 px-2 min-w-[40px] text-center">
                              {block.task.actual_minutes !== undefined && block.task.actual_minutes !== null 
                                ? `${block.task.actual_minutes}m (real)` 
                                : `${block.task.estimated_minutes || 30}m`}
                            </span>
                            <button 
                              onClick={() => updateTask(block.task!.id, { estimated_minutes: (block.task!.estimated_minutes || 30) + 15 })}
                              className="px-2 text-gray-400 hover:text-indigo-600 border-l border-gray-200 text-xs font-bold"
                            >+</button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <h3 className={`text-sm font-semibold break-words ${
                      block.type === 'break' ? 'text-orange-700' : 'text-gray-900'
                    }`}>
                      {block.type === 'task' && block.task?.recurrence_rule && (
                        <span title="Tarefa Recorrente" className="text-indigo-500 text-xs mr-1 inline-block align-middle">🔁</span>
                      )}
                      {block.type === 'task' && (block.task?.postponed_count ?? 0) > 0 && (
                        <span title={`${block.task?.postponed_count}x adiada`} className="text-orange-500 text-[10px] font-bold bg-orange-50 px-1 rounded mr-1 inline-block align-middle">
                          🐌 {block.task?.postponed_count}x
                        </span>
                      )}
                      {block.title}
                    </h3>
                    
                    {block.type === 'task' && block.task && (
                      <>
                        <div className="mt-2 flex gap-2 text-[10px] mb-2 flex-wrap items-center">
                          <select
                            value={block.task.context}
                            onChange={(e) => updateTask(block.task!.id, { context: e.target.value as any })}
                            className="inline-flex items-center rounded bg-gray-50 px-1 py-0.5 font-medium text-gray-600 cursor-pointer outline-none border-none focus:ring-1 focus:ring-indigo-600 appearance-none text-center"
                          >
                            {CONTEXTS_LIST.map((ctx) => (
                              <option key={ctx} value={ctx}>{ctx}</option>
                            ))}
                          </select>
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">E:{block.task.energy}</span>
                          <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded">P:{block.task.priority}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
                          <TaskActions
                            showComplete={true}
                            onComplete={() => handleComplete(block.task!.id)}
                            onPostponeTomorrow={() => handlePostponeTomorrow(block.task!.id)}
                            onPostponeDate={(dateString) => handlePostponeDate(block.task!.id, dateString)}
                          />
                          <button
                            onClick={() => deleteTask(block.task!.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
                          >
                            Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
