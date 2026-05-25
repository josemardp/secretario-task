import { useMemo, useState, useEffect } from 'react';
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import { CONTEXTS_LIST } from '../types';
import { calculateTaskScore } from '../lib/ranking';
import { useContextStore } from '../stores/contextStore';
import { useTaskStore } from '../stores/taskStore';
import { TaskActions } from './TaskActions';
import { CalendarWidget } from './CalendarWidget';

interface TimelineViewProps {
  tasks: Task[];
  overSlotId: string | null;
}

interface TimelineBlock {
  id: string;
  type: 'task' | 'break';
  title: string;
  startTime: Date;
  endTime: Date;
  task?: Task;
}

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface DraggableTaskCardProps {
  block: TimelineBlock;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  openEdit: (task: Task) => void;
  handleComplete: (id: string) => void;
  handlePostponeTomorrow: (id: string) => void;
  handlePostponeDate: (id: string, dateString: string) => void;
  formatTime: (date: Date) => string;
}

function DraggableTaskCard({
  block,
  updateTask,
  deleteTask,
  openEdit,
  handleComplete,
  handlePostponeTomorrow,
  handlePostponeDate,
  formatTime
}: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    touchAction: 'none',
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg shadow-sm border cursor-grab active:cursor-grabbing w-full min-w-0 overflow-hidden flex flex-col bg-white border-indigo-100 ring-1 ring-indigo-50 ${
        isDragging ? 'shadow-lg border-indigo-300 z-10' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 mb-2">
        <span className="text-xs font-bold text-gray-500 select-none">
          {formatTime(block.startTime)} - {formatTime(block.endTime)}
        </span>
        {block.task && (
          <div className="flex gap-2 items-center flex-wrap">
            {((block.task.due_at && new Date(block.task.due_at) < new Date()) || 
              (!block.task.due_at && new Date(block.task.created_at).getTime() < new Date().getTime() - 3 * 60 * 60 * 1000 && new Date(block.task.created_at).getDate() === new Date().getDate())
            ) && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 animate-pulse select-none">
                ⚠️ Atrasada
              </span>
            )}
            <div className="flex items-center bg-gray-50 rounded-md h-[24px]">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask(block.task!.id, { estimated_minutes: Math.max(5, (block.task!.estimated_minutes || 30) - 15) });
                }}
                className="px-2 text-gray-400 hover:text-indigo-600 border-r border-gray-200 text-xs font-bold"
              >-</button>
              <span className="text-xs font-medium text-gray-600 px-2 min-w-[40px] text-center select-none">
                {block.task.actual_minutes !== undefined && block.task.actual_minutes !== null 
                  ? `${block.task.actual_minutes}m (real)` 
                  : `${block.task.estimated_minutes || 30}m`}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask(block.task!.id, { estimated_minutes: (block.task!.estimated_minutes || 30) + 15 });
                }}
                className="px-2 text-gray-400 hover:text-indigo-600 border-l border-gray-200 text-xs font-bold"
              >+</button>
            </div>
          </div>
        )}
      </div>
      
      <h3 className="text-sm font-semibold break-words text-gray-900 select-none">
        {block.task?.recurrence_rule && (
          <span title="Tarefa Recorrente" className="text-indigo-500 text-xs mr-1 inline-block align-middle">🔁</span>
        )}
        {block.task && (block.task.postponed_count ?? 0) > 0 && (
          <span title={`${block.task.postponed_count}x adiada`} className="text-orange-500 text-[10px] font-bold bg-orange-50 px-1 rounded mr-1 inline-block align-middle">
            🐌 {block.task.postponed_count}x
          </span>
        )}
        {block.title}
      </h3>
      
      {block.task && (
        <>
          <div className="mt-2 flex gap-2 text-[10px] mb-2 flex-wrap items-center">
            <select
              value={block.task.context}
              onChange={(e) => {
                e.stopPropagation();
                updateTask(block.task!.id, { context: e.target.value as any });
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="inline-flex items-center rounded bg-gray-50 px-1 py-0.5 font-medium text-gray-600 cursor-pointer outline-none border-none focus:ring-1 focus:ring-indigo-600 appearance-none text-center"
            >
              {CONTEXTS_LIST.map((ctx) => (
                <option key={ctx} value={ctx}>{ctx}</option>
              ))}
            </select>
            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded select-none">E:{block.task.energy}</span>
            <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded select-none">P:{block.task.priority}</span>
          </div>
          <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2" onMouseDown={(e) => e.stopPropagation()}>
            <TaskActions
              showComplete={true}
              onComplete={() => handleComplete(block.task!.id)}
              onPostponeTomorrow={() => handlePostponeTomorrow(block.task!.id)}
              onPostponeDate={(dateString) => handlePostponeDate(block.task!.id, dateString)}
            />
            <div className="flex gap-3 items-center shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(block.task!);
                }}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                Editar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask(block.task!.id);
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Excluir
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface TimelineSlotProps {
  slot: { timeString: string; dateObj: Date };
  isTargetSlot: boolean;
  isCurrentSlot: boolean;
  topPercent: number;
  now: Date;
  slotBlocksCount: number;
  isDropTarget: boolean;
  children: React.ReactNode;
}

function TimelineSlot({
  slot,
  isTargetSlot,
  isCurrentSlot,
  topPercent,
  now,
  slotBlocksCount,
  isDropTarget,
  children
}: TimelineSlotProps) {
  const { setNodeRef } = useDroppable({
    id: `slot-${slot.dateObj.toISOString()}`,
  });

  const [isDragging, setIsDragging] = useState(false);
  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragCancel: () => setIsDragging(false),
  });

  return (
    <div
      ref={setNodeRef}
      id={isTargetSlot ? 'current-time-slot' : undefined}
      className={`flex border-b border-gray-100 relative ${
        slotBlocksCount === 0 ? 'min-h-[24px]' : 'min-h-[80px]'
      } ${
        isDropTarget 
          ? 'bg-brand/5 transition-colors duration-150' 
          : isDragging 
            ? 'bg-gray-50/60 transition-colors duration-150' 
            : ''
      }`}
    >
      {/* Linha horizontal destacada no topo (Estilo C) */}
      {isDropTarget && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-brand rounded-[2px] z-10 pointer-events-none">
          <div className="absolute top-[-10px] left-2 text-[11px] font-semibold text-brand bg-white px-1.5 py-0.5 rounded border border-brand z-20 whitespace-nowrap select-none">
            {slot.timeString}
          </div>
        </div>
      )}

      {/* Linha vermelha de "Agora" */}
      {isCurrentSlot && !isDropTarget && (
        <div
          className="absolute left-0 right-0 z-10 flex items-center pointer-events-none w-full"
          style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
        >
          <span className="w-16 pr-2 text-right text-[11px] font-bold text-red-600 bg-white/90 z-20 select-none">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex-1 h-[2px] bg-red-600"></div>
        </div>
      )}

      {/* Horário (Coluna Esquerda) */}
      <div className={`w-16 flex-shrink-0 border-r border-gray-50 bg-gray-50/50 text-right shrink-0 flex items-center justify-end pr-2 ${slotBlocksCount === 0 ? 'py-0.5' : 'py-2'}`}>
        <span className="text-xs font-semibold text-gray-400 leading-none select-none">{slot.timeString}</span>
      </div>

      {/* Espaço das Tarefas (Coluna Direita) */}
      <div className={`flex-1 min-w-0 flex flex-col gap-2 relative ${slotBlocksCount === 0 ? 'p-0' : 'p-2'}`}>
        {children}
      </div>
    </div>
  );
}

export function TimelineView({ tasks, overSlotId }: TimelineViewProps) {
  const { currentEnergy, activeContext } = useContextStore();
  const { updateTask, deleteTask } = useTaskStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dismissedBreaks, setDismissedBreaks] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ title: '', due_at: '', estimated_minutes: 30, context: 'Pessoal' as Task['context'], priority: 0, energy: 0 });

  useEffect(() => {
    const el = document.getElementById('current-time-slot');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedDate]);

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      due_at: toLocalDatetimeInput(task.due_at),
      estimated_minutes: task.estimated_minutes || 30,
      context: task.context,
      priority: task.priority,
      energy: task.energy,
    });
  };

  const saveEdit = () => {
    if (!editingTask) return;
    updateTask(editingTask.id, {
      title: editForm.title,
      due_at: editForm.due_at ? new Date(editForm.due_at).toISOString() : null,
      estimated_minutes: editForm.estimated_minutes,
      context: editForm.context,
      priority: editForm.priority,
      energy: editForm.energy,
    });
    setEditingTask(null);
  };

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

    // ── Tarefas COM horário FUTURO: horário exato ──
    const futureScheduled = todoTasks.filter(t => t.due_at && new Date(t.due_at) > now);
    for (const task of futureScheduled) {
      const duration = task.estimated_minutes || 30;
      const blockStart = new Date(task.due_at!);
      const blockEnd = new Date(blockStart.getTime() + duration * 60000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
    }

    // ── Atrasadas + sem horário: distribuídas em blocos de 30min, máx 4 por bloco ──
    // Hard limit: bloco 16:30–17:00 recebe o restante sem limite de tarefas
    const toQueue = todoTasks
      .filter(t => !t.due_at || new Date(t.due_at) <= now)
      .map(task => ({ ...task, score: calculateTaskScore(task, currentEnergy, activeContext) }))
      .sort((a, b) => b.score - a.score);

    const MAX_PER_SLOT = 4;
    const lastSlotStart = new Date(selectedDate);
    lastSlotStart.setHours(16, 30, 0, 0);

    let slotStart = new Date(Math.min(currentTime.getTime(), lastSlotStart.getTime()));
    let countInSlot = 0;

    for (const task of toQueue) {
      if (countInSlot >= MAX_PER_SLOT && slotStart.getTime() < lastSlotStart.getTime()) {
        slotStart = new Date(Math.min(
          slotStart.getTime() + 30 * 60 * 1000,
          lastSlotStart.getTime()
        ));
        countInSlot = 0;
      }
      const blockStart = new Date(slotStart);
      const blockEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
      countInSlot++;
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

          const now = new Date();
          const isToday = selectedDate.getDate() === now.getDate() &&
                          selectedDate.getMonth() === now.getMonth() &&
                          selectedDate.getFullYear() === now.getFullYear();

          const nowTime = now.getTime();
          const slotTime = slot.dateObj.getTime();
          const slotEndTime = slotTime + 30 * 60 * 1000;
          const isCurrentSlot = isToday && nowTime >= slotTime && nowTime < slotEndTime;

          const targetScrollTime = nowTime - 30 * 60 * 1000;
          const isTargetSlot = isToday && targetScrollTime >= slotTime && targetScrollTime < slotEndTime;

          const minutesOffset = Math.floor((nowTime - slotTime) / 60000);
          const topPercent = (minutesOffset / 30) * 100;

          const isDropTarget = overSlotId === `slot-${slot.dateObj.toISOString()}`;

          return (
            <TimelineSlot
              key={slot.timeString}
              slot={slot}
              isTargetSlot={isTargetSlot}
              isCurrentSlot={isCurrentSlot}
              topPercent={topPercent}
              now={now}
              slotBlocksCount={slotBlocks.length}
              isDropTarget={isDropTarget}
            >
              {slotBlocks.map((block) => {
                if (block.type === 'break') {
                  return (
                    <div 
                      key={`${block.id}-${slot.timeString}`}
                      className="p-3 rounded-lg shadow-sm border w-full min-w-0 overflow-hidden flex flex-col bg-orange-50 border-orange-100"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500 select-none">
                          {formatTime(block.startTime)} - {formatTime(block.endTime)}
                        </span>
                        <button 
                          onClick={() => setDismissedBreaks([...dismissedBreaks, block.id])}
                          className="text-orange-400 hover:text-orange-600 font-bold px-2 rounded hover:bg-orange-100"
                          title="Ignorar Pausa"
                        >
                          ✕
                        </button>
                      </div>
                      <h3 className="text-sm font-semibold break-words text-orange-700 select-none">
                        {block.title}
                      </h3>
                    </div>
                  );
                }

                return (
                  <DraggableTaskCard
                    key={`${block.id}-${slot.timeString}`}
                    block={block}
                    updateTask={updateTask}
                    deleteTask={deleteTask}
                    openEdit={openEdit}
                    handleComplete={handleComplete}
                    handlePostponeTomorrow={handlePostponeTomorrow}
                    handlePostponeDate={handlePostponeDate}
                    formatTime={formatTime}
                  />
                );
              })}
            </TimelineSlot>
          );
        })}
      </div>

      {editingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditingTask(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 flex flex-col gap-4"
            style={{
              paddingTop: 'calc(20px + env(safe-area-inset-top))',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom))'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-800">Editar Tarefa</h3>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Título</label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Data e Hora</label>
              <input
                type="datetime-local"
                value={editForm.due_at}
                onChange={e => setEditForm(f => ({ ...f, due_at: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Duração (min)</label>
              <input
                type="number"
                value={editForm.estimated_minutes}
                min={5}
                step={5}
                onChange={e => setEditForm(f => ({ ...f, estimated_minutes: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Contexto</label>
              <select
                value={editForm.context}
                onChange={e => setEditForm(f => ({ ...f, context: e.target.value as Task['context'] }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CONTEXTS_LIST.map(ctx => (
                  <option key={ctx} value={ctx}>{ctx}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Prioridade (0–10)</label>
                <input
                  type="number"
                  value={editForm.priority}
                  min={0}
                  max={10}
                  onChange={e => setEditForm(f => ({ ...f, priority: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Energia (0–10)</label>
                <input
                  type="number"
                  value={editForm.energy}
                  min={0}
                  max={10}
                  onChange={e => setEditForm(f => ({ ...f, energy: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
