import { useMemo, useState, useEffect } from 'react';
import { rescheduleToDate, postponeToTomorrow } from '../lib/datetime';
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar as CalIcon, Flag, Repeat, X, Edit3, Trash2 } from 'lucide-react';
import type { Task, ContextType } from '../types';
import { CONTEXTS_LIST } from '../types';
import { calculateTaskScore } from '../lib/ranking';
import { useContextStore } from '../stores/contextStore';
import { useTaskStore } from '../stores/taskStore';
import { TaskActions } from './TaskActions';
import { CalendarWidget } from './CalendarWidget';

interface TimelineViewProps {
  tasks: Task[];
  overSlotId: string | null;
  dragStartTime: Date | null;
}

interface TimelineBlock {
  id: string;
  type: 'task' | 'break';
  title: string;
  startTime: Date;
  endTime: Date;
  task?: Task;
}

const CTX_BAR: Record<ContextType, string> = {
  PM:      'border-l-ctxPM',
  Esdra:   'border-l-ctxEsdra',
  Pessoal: 'border-l-ctxPessoal',
  Familia: 'border-l-ctxFamilia',
  CCB:     'border-l-ctxCCB',
  Estudo:  'border-l-ctxEstudo',
  Saude:   'border-l-ctxSaude',
};

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Draggable task card ────────────────────────────────────────

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
  block, updateTask, deleteTask, openEdit,
  handleComplete, handlePostponeTomorrow, handlePostponeDate, formatTime,
}: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: block.id });
  const t = block.task!;
  const isLate =
    (t.due_at && new Date(t.due_at) < new Date()) ||
    (!t.due_at &&
      new Date(t.created_at).getTime() < Date.now() - 3 * 60 * 60 * 1000 &&
      new Date(t.created_at).getDate() === new Date().getDate());

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    touchAction: 'none',
    opacity: isDragging ? 0.6 : undefined,
  };

  const durText = t.actual_minutes != null ? `${t.actual_minutes}m real` : `${t.estimated_minutes || 30}m`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        'w-full min-w-0 overflow-hidden flex flex-col bg-paper rounded-xl border border-line border-l-4',
        CTX_BAR[t.context],
        'cursor-grab active:cursor-grabbing',
        isDragging ? 'shadow-soft' : 'shadow-card',
      ].join(' ')}
    >
      <div className="px-3 pt-2.5 pb-2.5">
        {/* time + duration controls */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-extrabold tnum text-ink-3 tracking-wide">
            {formatTime(block.startTime)} – {formatTime(block.endTime)}
          </span>
          <div className="flex items-center gap-1.5">
            {isLate && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-danger-light text-danger tracking-[0.05em]">
                ATRASADA
              </span>
            )}
            <div className="flex items-center bg-paper2 rounded-md h-[22px] overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask(t.id, { estimated_minutes: Math.max(5, (t.estimated_minutes || 30) - 15) });
                }}
                className="px-2 text-ink-3 hover:text-ink text-[11px] font-extrabold"
              >−</button>
              <span className="text-[10px] font-bold text-ink-2 px-2 min-w-[44px] text-center tnum select-none">
                {durText}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask(t.id, { estimated_minutes: (t.estimated_minutes || 30) + 15 });
                }}
                className="px-2 text-ink-3 hover:text-ink text-[11px] font-extrabold"
              >+</button>
            </div>
          </div>
        </div>

        {/* title row */}
        <h3 className="text-[14px] font-bold text-ink leading-snug tracking-tight break-words flex items-center gap-1.5">
          {t.recurrence_rule && <Repeat size={11} className="shrink-0 text-ink-3" />}
          {(t.postponed_count ?? 0) > 0 && (
            <span title={`${t.postponed_count}× adiada`} className="shrink-0 text-[9px] font-extrabold bg-warning-light text-warning px-1 rounded">
              🐌 {t.postponed_count}×
            </span>
          )}
          <span className="min-w-0">{block.title}</span>
        </h3>

        {/* priority chip */}
        {t.priority > 0 && (
          <div className="mt-1.5">
            <span
              className={
                'inline-flex items-center gap-1 text-[10px] font-extrabold tnum ' +
                (t.priority >= 8 ? 'text-danger' : t.priority >= 5 ? 'text-warning' : 'text-ink-3')
              }
            >
              <Flag size={10} strokeWidth={2.4} /> P{t.priority}
            </span>
          </div>
        )}

        {/* actions */}
        <div
          className="mt-2.5 pt-2 border-t border-line2 flex items-center justify-between gap-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <TaskActions
            showComplete={true}
            onComplete={() => handleComplete(t.id)}
            onPostponeTomorrow={() => handlePostponeTomorrow(t.id)}
            onPostponeDate={(d) => handlePostponeDate(t.id, d)}
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(t); }}
              className="text-ink-2 p-1.5 rounded-lg hover:bg-paper2"
              title="Editar"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}
              className="text-danger p-1.5 rounded-lg hover:bg-danger-light"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slot ───────────────────────────────────────────────────────

interface TimelineSlotProps {
  slot: { timeString: string; dateObj: Date };
  isTargetSlot: boolean;
  isCurrentSlot: boolean;
  topPercent: number;
  now: Date;
  slotBlocksCount: number;
  isDropTarget: boolean;
  dragStartTime: Date | null;
  selectedDate: Date;
  children: React.ReactNode;
}

function TimelineSlot({
  slot, isTargetSlot, isCurrentSlot, topPercent, now,
  slotBlocksCount, isDropTarget, dragStartTime, selectedDate, children,
}: TimelineSlotProps) {
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isPast  = isToday && dragStartTime !== null && slot.dateObj.getTime() < dragStartTime.getTime();

  const { setNodeRef } = useDroppable({
    id: `slot-${slot.dateObj.toISOString()}`,
    disabled: isPast,
  });

  const [isDragging, setIsDragging] = useState(false);
  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd:   () => setIsDragging(false),
    onDragCancel:() => setIsDragging(false),
  });

  // half-hour vs hour boundary
  const onHourBoundary = slot.dateObj.getMinutes() === 0;

  return (
    <div
      ref={setNodeRef}
      id={isTargetSlot ? 'current-time-slot' : undefined}
      className={[
        'flex relative border-b',
        onHourBoundary ? 'border-line' : 'border-line2',
        slotBlocksCount === 0 ? 'min-h-[28px]' : 'min-h-[76px]',
        isDropTarget && !isPast ? 'bg-amber-soft/30 transition-colors' :
          isDragging && !isPast ? 'bg-paper2/60 transition-colors' : '',
      ].join(' ')}
      style={{
        opacity: isPast && isDragging ? 0.35 : undefined,
        transition: 'opacity 150ms ease, background-color 150ms ease',
      }}
    >
      {/* Drop highlight */}
      {isDropTarget && !isPast && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-ink z-10 pointer-events-none">
          <div className="absolute -top-2 left-2 text-[10px] font-extrabold text-ink bg-paper px-1.5 py-0.5 rounded border border-line z-20 whitespace-nowrap select-none">
            {slot.timeString}
          </div>
        </div>
      )}

      {/* Now line */}
      {isCurrentSlot && !isDropTarget && !isPast && (
        <div
          className="absolute left-0 right-0 z-10 flex items-center pointer-events-none w-full"
          style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
        >
          <span className="w-12 pr-1.5 text-right text-[10px] font-extrabold text-danger bg-paper z-20 tnum select-none">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex-1 h-[1.5px] bg-danger" />
        </div>
      )}

      {/* Hour column */}
      <div className={`w-12 flex-shrink-0 text-right pr-2 flex items-start justify-end ${slotBlocksCount === 0 ? 'py-1' : 'pt-2'}`}>
        <span className={[
          'leading-none tnum select-none',
          onHourBoundary ? 'text-[11px] font-extrabold text-ink-2' : 'text-[10px] text-ink-3',
        ].join(' ')}>
          {slot.timeString}
        </span>
      </div>

      {/* Slot column */}
      <div className={`flex-1 min-w-0 flex flex-col gap-2 relative ${slotBlocksCount === 0 ? 'py-1 pr-2' : 'p-2'}`}>
        {children}
      </div>
    </div>
  );
}

// ─── Main view ──────────────────────────────────────────────────

export function TimelineView({ tasks, overSlotId, dragStartTime }: TimelineViewProps) {
  const { currentEnergy, activeContext } = useContextStore();
  const { updateTask, deleteTask } = useTaskStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dismissedBreaks, setDismissedBreaks] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', due_at: '', estimated_minutes: 30,
    context: 'Pessoal' as ContextType, priority: 0, energy: 0,
  });

  useEffect(() => {
    const el = document.getElementById('current-time-slot');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      updates.actual_minutes = Math.round((Date.now() - new Date(task.started_at).getTime()) / 60000);
    }
    updateTask(taskId, updates);
  };

  const handlePostponeTomorrow = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, { due_at: postponeToTomorrow(task?.due_at ?? null), postponed_count: (task?.postponed_count || 0) + 1 });
  };

  const handlePostponeDate = (taskId: string, dateString: string) => {
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, { due_at: rescheduleToDate(dateString, task?.due_at ?? null), postponed_count: (task?.postponed_count || 0) + 1 });
  };

  // ── Block calculation (unchanged logic) ──
  const blocks = useMemo(() => {
    const now = new Date();
    const isToday = selectedDate.getDate() === now.getDate() &&
                    selectedDate.getMonth() === now.getMonth() &&
                    selectedDate.getFullYear() === now.getFullYear();

    const startOfDay = new Date(selectedDate.getTime());
    startOfDay.setHours(8, 30, 0, 0);

    let currentTime = new Date(isToday ? Math.max(now.getTime(), startOfDay.getTime()) : startOfDay.getTime());
    const m = currentTime.getMinutes();
    if (m > 0 && m <= 30) currentTime.setMinutes(30, 0, 0);
    else if (m > 30) currentTime.setHours(currentTime.getHours() + 1, 0, 0, 0);

    let todoTasks = tasks.filter(t => t.status === 'todo' && !t.deleted_at);

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

    const futureScheduled = todoTasks.filter(t => t.due_at && new Date(t.due_at) > now);
    for (const task of futureScheduled) {
      const duration = task.estimated_minutes || 30;
      const blockStart = new Date(task.due_at!);
      const blockEnd = new Date(blockStart.getTime() + duration * 60000);
      timeline.push({ id: task.id, type: 'task', title: task.title, startTime: blockStart, endTime: blockEnd, task });
    }

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
        slotStart = new Date(Math.min(slotStart.getTime() + 30 * 60 * 1000, lastSlotStart.getTime()));
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

  // Time grid 08:30–22:00
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

  const longDate = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalBlocks = blocks.length;
  const totalMins = blocks.reduce((acc, b) => acc + (b.task?.estimated_minutes || 30), 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Day header */}
      <div className="bg-paper border border-line rounded-2xl p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-display text-[24px] leading-[1.1] text-ink tracking-[-0.02em] truncate">
            {longDate[0].toUpperCase() + longDate.slice(1)}.
          </div>
          <div className="text-[11px] text-ink-2 mt-1 tnum">
            {totalBlocks} blocos · {Math.floor(totalMins / 60)}h {totalMins % 60}m planejado
          </div>
        </div>
        <button
          onClick={() => setIsCalendarOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper2 text-ink text-[11px] font-extrabold shrink-0"
        >
          <CalIcon size={12} strokeWidth={2.2} /> Mês
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

      {/* Timeline grid */}
      <div className="bg-paper rounded-2xl border border-line overflow-hidden flex flex-col">
        {timeGrid.map((slot, idx) => {
          const slotBlocks = blocks.filter(b => {
            const start = b.startTime.getTime();
            const slotStart = slot.dateObj.getTime();
            const slotEnd = slotStart + 30 * 60 * 1000;
            if (idx === 0) {
              return start < slotEnd;
            }
            return start >= slotStart && start < slotEnd;
          });

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
              dragStartTime={dragStartTime}
              selectedDate={selectedDate}
            >
              {slotBlocks.map((block) => {
                if (block.type === 'break') {
                  return (
                    <div
                      key={`${block.id}-${slot.timeString}`}
                      className="px-3 py-2.5 rounded-xl border border-warning-light bg-warning-light/50 w-full min-w-0 overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-extrabold tnum text-warning tracking-wide">
                          {formatTime(block.startTime)} – {formatTime(block.endTime)}
                        </span>
                        <button
                          onClick={() => setDismissedBreaks([...dismissedBreaks, block.id])}
                          className="text-warning p-1 rounded hover:bg-paper"
                          title="Ignorar pausa"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <h3 className="text-[13px] font-bold text-warning break-words">
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

      {/* Edit modal */}
      {editingTask && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(26,24,20,0.45)] animate-fade-in"
          onClick={() => setEditingTask(null)}
        >
          <div
            className="bg-paper w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-soft p-5 flex flex-col gap-3 animate-sheet-up"
            style={{
              paddingTop: 'calc(20px + env(safe-area-inset-top))',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center sm:hidden">
              <div className="w-10 h-1 rounded-full bg-paper3 mb-2" />
            </div>

            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink-3">
                  Editar tarefa
                </div>
                <div className="font-display text-[22px] tracking-[-0.02em] text-ink mt-0.5">
                  {editingTask.title}
                </div>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="w-8 h-8 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Título</span>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-paper2 rounded-xl px-3 py-2.5 text-[14px] text-ink outline-none border-0"
                autoFocus
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Data e hora</span>
                <input
                  type="datetime-local"
                  value={editForm.due_at}
                  onChange={(e) => setEditForm((f) => ({ ...f, due_at: e.target.value }))}
                  className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 tnum"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Duração (min)</span>
                <input
                  type="number"
                  value={editForm.estimated_minutes}
                  min={5}
                  step={5}
                  onChange={(e) => setEditForm((f) => ({ ...f, estimated_minutes: Number(e.target.value) }))}
                  className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 tnum"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Contexto</span>
              <select
                value={editForm.context}
                onChange={(e) => setEditForm((f) => ({ ...f, context: e.target.value as ContextType }))}
                className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink outline-none border-0"
              >
                {CONTEXTS_LIST.map((ctx) => (<option key={ctx} value={ctx}>{ctx}</option>))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Prioridade · 0-10</span>
                <input
                  type="number"
                  value={editForm.priority}
                  min={0} max={10}
                  onChange={(e) => setEditForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                  className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 tnum"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Energia · 0-10</span>
                <input
                  type="number"
                  value={editForm.energy}
                  min={0} max={10}
                  onChange={(e) => setEditForm((f) => ({ ...f, energy: Number(e.target.value) }))}
                  className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 tnum"
                />
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 py-2.5 rounded-xl bg-paper2 text-[13px] font-extrabold text-ink-2"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-2.5 rounded-xl bg-ink text-[13px] font-extrabold text-white"
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
