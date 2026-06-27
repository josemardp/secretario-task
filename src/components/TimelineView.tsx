import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatDateTime, rescheduleToDate, postponeToTomorrow, wasEdited } from '../lib/datetime';
import { describeRecurrenceRule, getNextOccurrenceFromNow } from '../lib/recurrence';
import { Archive, Calendar as CalIcon, Repeat, X, Edit3, Send, Trash2, XCircle, RotateCcw } from 'lucide-react';
import { BLOCKER_TYPES, CONTEXTS_LIST } from '../types';
import type { Task, ContextType, ResolutionType, BlockerType } from '../types';
import { useContextStore } from '../stores/contextStore';
import { useTaskStore } from '../stores/taskStore';
import { CalendarWidget } from './CalendarWidget';
import { RecurrenceModal } from './RecurrenceModal';
import { useToast } from './toastContext';
import { useAgendaPositions, type TimelineBlock } from '../hooks/useAgendaPositions';
import { buildActualMinutesFromStartedAt, buildReopenUpdates } from '../lib/timeTracking';


interface TimelineViewProps {
  tasks: Task[];
}

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function priorityTone(priority: number): string {
  if (priority >= 8) return 'text-danger';
  if (priority >= 6) return 'text-warning';
  return 'text-ink-tertiary';
}

function blockerTypeLabel(type: BlockerType): string {
  if (type === 'waiting_third_party') return 'Aguardando terceiro';
  if (type === 'no_time') return 'Sem tempo';
  if (type === 'priority_changed') return 'Prioridade mudou';
  if (type === 'needs_split') return 'Precisa dividir';
  return 'Dependência';
}

function buildResolutionUpdates(resolutionType: Exclude<ResolutionType, 'completed'>): Partial<Task> {
  return {
    resolution_type: resolutionType,
    resolved_at: new Date().toISOString(),
    completed_at: null,
    completed_at_confidence: null,
  };
}

// ─── Recurrence helpers (importados de src/lib/recurrence.ts) ───

function AgendaQuickActions({
  onComplete,
  onPostponeTomorrow,
  onPostponeDate,
  onEdit,
  onDelete,
  onResolve,
}: {
  onComplete: () => void;
  onPostponeTomorrow: () => void;
  onPostponeDate: (dateString: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onResolve: (type: Exclude<ResolutionType, 'completed'>) => void;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:justify-between sm:gap-2">
      <div className="contents sm:flex sm:items-center sm:gap-1.5 sm:min-w-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="h-8 min-w-0 px-2 rounded-lg bg-accent text-white text-[12px] font-bold"
        >
          Concluir
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPostponeTomorrow();
          }}
          className="h-8 min-w-0 px-2 rounded-lg border border-border-strong bg-surface text-ink text-[12px] font-bold"
        >
          Amanhã
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dateInputRef.current?.showPicker?.();
            }}
            className="h-8 w-full min-w-0 px-2 rounded-lg border border-border-strong bg-surface text-ink text-[12px] font-bold"
          >
            Adiar
          </button>
          <input
            ref={dateInputRef}
            type="date"
            className="absolute opacity-0 w-0 h-0 p-0 m-0 border-0"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.value) onPostponeDate(e.target.value);
            }}
          />
        </div>
      </div>
      <div className="col-span-3 grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-1.5 sm:shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-8 min-w-0 px-2 rounded-lg border border-border-strong bg-surface text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1"
          title="Editar"
        >
          <Edit3 size={12} /> Editar
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-8 min-w-0 px-2 rounded-lg border border-border-strong bg-surface text-danger text-[12px] font-bold inline-flex items-center justify-center gap-1"
          title="Excluir"
        >
          <Trash2 size={12} /> Excluir
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onResolve('cancelled');
          }}
          className="h-8 min-w-0 px-2 rounded-lg border border-border-strong bg-surface text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1"
          title="Cancelar sem concluir"
        >
          <XCircle size={12} /> Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Task card ──────────────────────────────────────────────────

interface TimelineTaskCardProps {
  block: TimelineBlock;
  now: Date;
  requestDelete: (task: Task) => void;
  openEdit: (task: Task) => void;
  handleComplete: (id: string) => void;
  handlePostponeTomorrow: (id: string, blockerType?: BlockerType | null) => void;
  handlePostponeDate: (id: string, dateString: string, blockerType?: BlockerType | null) => void;
  handleResolve: (id: string, type: Exclude<ResolutionType, 'completed'>) => void;
  formatTime: (date: Date) => string;
}

function TimelineTaskCard({
  block, now, requestDelete, openEdit,
  handleComplete, handlePostponeTomorrow, handlePostponeDate, handleResolve, formatTime,
}: TimelineTaskCardProps) {
  const t = block.task!;
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragXRef = useRef(0);
  const gestureStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const isLate =
    (t.due_at && new Date(t.due_at) < now) ||
    (!t.due_at &&
      new Date(t.created_at).getTime() < now.getTime() - 3 * 60 * 60 * 1000 &&
      new Date(t.created_at).getDate() === now.getDate());

  const style: React.CSSProperties = {
    touchAction: 'pan-y',
  };

  const resetGesture = () => {
    gestureStartRef.current = null;
    setIsDragging(false);
    dragXRef.current = 0;
    setDragX(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gestureStartRef.current = { x: e.clientX, y: e.clientY, active: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = gestureStartRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      start.active = true;
      setIsDragging(true);
    }
    if (!start.active) return;

    const nextX = Math.max(-116, Math.min(116, dx));
    dragXRef.current = nextX;
    setDragX(nextX);
  };

  const handlePointerUp = () => {
    const finalX = dragXRef.current;
    resetGesture();
    if (finalX > 72) {
      handlePostponeTomorrow(t.id);
    } else if (finalX < -72) {
      requestDelete(t);
    }
  };

  return (
    <div
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={resetGesture}
      className="relative z-20 w-full min-w-0 overflow-visible rounded-xl"
    >
      <div className="absolute inset-0 flex items-center justify-between rounded-xl px-4 bg-surface-sunken sm:hidden">
        <span className="text-[12px] font-bold text-success">Amanhã</span>
        <span className="text-[12px] font-bold text-danger">Excluir</span>
      </div>

      <div
        className={[
          'relative min-w-0 h-auto flex flex-col bg-surface border border-border rounded-xl sm:min-h-[104px]',
          'transition-transform',
          isDragging ? 'duration-0' : 'duration-200',
        ].join(' ')}
        style={{ transform: `translateX(${dragX}px)` }}
      >
      <div className="px-2.5 py-3 sm:px-4 sm:py-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleComplete(t.id);
            }}
            className="w-11 h-11 -ml-1.5 -mt-1.5 shrink-0 inline-flex items-center justify-center rounded-full text-ink-tertiary sm:hidden"
            aria-label="Concluir tarefa"
            title="Concluir"
          >
            <span className="w-6 h-6 rounded-full border-2 border-border-strong inline-flex items-center justify-center" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold tnum text-ink-secondary tracking-wide">
                {formatTime(block.startTime)} – {formatTime(block.endTime)}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {isLate && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger-light text-danger tracking-[0.05em]">
                    ATRASADA
                  </span>
                )}
                {t.priority > 0 && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold tnum ${priorityTone(t.priority)}`}
                  >
                    <span className="w-[7px] h-[7px] rounded-full bg-current" />
                    P{t.priority}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(t);
                  }}
                  className="w-8 h-8 -mr-1.5 rounded-full inline-flex items-center justify-center text-ink-tertiary hover:text-ink sm:hidden"
                  aria-label="Editar tarefa"
                  title="Editar"
                >
                  <Edit3 size={15} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <h3 className="mt-1 text-[15px] font-bold text-ink leading-snug tracking-tight break-words flex items-start gap-1.5 sm:text-[14px] sm:leading-tight">
              {t.recurrence_rule && <Repeat size={13} className="mt-0.5 shrink-0 text-ink-tertiary" />}
              <span className="min-w-0">{block.title}</span>
            </h3>

            {(t.postponed_count ?? 0) > 0 && (
              <div className="mt-1">
                <span title={`${t.postponed_count}x adiada`} className="inline-flex text-[11px] font-bold bg-surface-sunken text-ink-tertiary px-1.5 py-0.5 rounded">
                  Adiada {t.postponed_count}x
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          className="hidden sm:block sm:mt-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <AgendaQuickActions
            onComplete={() => handleComplete(t.id)}
            onPostponeTomorrow={() => handlePostponeTomorrow(t.id)}
            onPostponeDate={(d) => handlePostponeDate(t.id, d)}
            onEdit={() => openEdit(t)}
            onDelete={() => requestDelete(t)}
            onResolve={(type) => handleResolve(t.id, type)}
          />
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── Slot ───────────────────────────────────────────────────────

interface TimelineSlotProps {
  slot: { timeString: string; dateObj: Date };
  isCurrentSlot: boolean;
  topPercent: number;
  now: Date;
  slotBlocks: TimelineBlock[];
  children: React.ReactNode;
  anchorRef?: React.Ref<HTMLDivElement>;
}

function TimelineSlot({
  slot, isCurrentSlot, topPercent, now,
  slotBlocks, children, anchorRef,
}: TimelineSlotProps) {
  // half-hour vs hour boundary
  const onHourBoundary = slot.dateObj.getMinutes() === 0;
  const slotBlocksCount = slotBlocks.length;
  const slotMinHeight = slotBlocksCount === 0 ? 28 : undefined;

  return (
    <div
      ref={anchorRef}
      className={[
        'flex relative border-b',
        onHourBoundary ? 'border-line' : 'border-line2',
      ].join(' ')}
      style={{
        touchAction: 'pan-y',
        minHeight: slotMinHeight,
      }}
    >
      {/* Now line */}
      {isCurrentSlot && (
        <div
          className="absolute left-0 right-0 z-10 flex items-center pointer-events-none w-full"
          style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
        >
          <span className="w-12 pr-1.5 text-right text-[12px] font-bold text-danger bg-paper z-20 tnum select-none">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex-1 h-[1.5px] bg-danger" />
        </div>
      )}

      {/* Hour column */}
      <div className={`w-12 flex-shrink-0 text-right pr-2 flex items-start justify-end ${slotBlocksCount === 0 ? 'py-1' : 'pt-2'}`}>
        <span className={[
          'leading-none tnum select-none',
          onHourBoundary ? 'text-[12px] font-bold text-ink-2' : 'text-[12px] text-ink-2',
        ].join(' ')}>
          {slot.timeString}
        </span>
      </div>

      {/* Slot column */}
      <div className={`flex-1 min-w-0 flex flex-col gap-2 relative ${slotBlocksCount === 0 ? 'py-1 pr-2' : 'px-2 pt-2 pb-3'}`}>
        {children}
      </div>
    </div>
  );
}

// ─── Main view ──────────────────────────────────────────────────

export function TimelineView({ tasks }: TimelineViewProps) {
  const { currentEnergy, activeContext } = useContextStore();
  const { updateTask, deleteTask, recordTaskEvent } = useTaskStore();
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dismissedBreaks, setDismissedBreaks] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    due_at: string;
    estimated_minutes: number;
    context: ContextType;
    priority: number;
    energy: number;
    recurrence_rule: string | null;
    blocker_type: BlockerType | '';
  }>({
    title: '', due_at: '', estimated_minutes: 30,
    context: 'Pessoal' as ContextType, priority: 0, energy: 0,
    recurrence_rule: null,
    blocker_type: '',
  });

  const anchorRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const container = timelineScrollRef.current;
        const anchor = anchorRef.current;
        if (!container || !anchor) return;

        const containerTop = container.getBoundingClientRect().top;
        const anchorTop = anchor.getBoundingClientRect().top;
        container.scrollTo({
          top: Math.max(0, container.scrollTop + anchorTop - containerTop - 12),
          behavior: 'smooth',
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
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
      recurrence_rule: typeof task.recurrence_rule === 'string' ? task.recurrence_rule : null,
      blocker_type: task.blocker_type ?? '',
    });
  };

  const saveEdit = () => {
    if (!editingTask) return;

    // Reagendamento automático: se a regra mudou e a tarefa ainda não foi
    // concluída, recalcula due_at para a próxima ocorrência válida a partir
    // de agora, evitando que ela fique presa em um dia inválido (ex: sábado
    // com regra de dias úteis).
    const ruleChanged = editForm.recurrence_rule !== (editingTask.recurrence_rule ?? null);
    let newDueAt = editForm.due_at ? new Date(editForm.due_at).toISOString() : null;
    if (ruleChanged && editForm.recurrence_rule && editingTask.status !== 'done') {
      const candidate = getNextOccurrenceFromNow(
        newDueAt ?? editingTask.due_at,
        editForm.recurrence_rule,
      );
      if (candidate) newDueAt = candidate;
    }

    const updates: Partial<Task> = {
      title: editForm.title,
      due_at: newDueAt,
      context: editForm.context,
      priority: editForm.priority,
      energy: editForm.energy,
      recurrence_rule: editForm.recurrence_rule,
      blocker_type: editForm.blocker_type || null,
    };

    if (editForm.estimated_minutes !== (editingTask.estimated_minutes ?? 30)) {
      updates.estimated_minutes = editForm.estimated_minutes;
      updates.estimated_minutes_source = 'manual';
    }

    updateTask(editingTask.id, updates);
    setEditingTask(null);
  };

  const handleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updates: Partial<Task> = { status: 'done' };
    if (task && task.status !== 'done') {
      const completedAt = new Date().toISOString();
      updates.completed_at = completedAt;
      updates.completed_at_confidence = 'confirmed';
      updates.resolution_type = 'completed';
      updates.resolved_at = completedAt;
    }
    if (task && task.status !== 'done' && task.started_at) {
      Object.assign(updates, buildActualMinutesFromStartedAt(task.started_at));
    }
    updateTask(taskId, updates);
    recordTaskEvent(taskId, 'completed', {
      completed_at: task && task.status !== 'done' ? updates.completed_at ?? null : task?.completed_at ?? null,
      source: 'timeline',
    });
    toast('Tarefa concluída.', 'success');
  };

  const handleResolve = (taskId: string, resolutionType: Exclude<ResolutionType, 'completed'>) => {
    updateTask(taskId, buildResolutionUpdates(resolutionType));
    recordTaskEvent(taskId, 'resolved', {
      resolution_type: resolutionType,
      source: 'timeline',
    });
    toast('Tarefa encerrada.', 'success');
  };

  const handleReopen = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, buildReopenUpdates('todo'));
    recordTaskEvent(taskId, 'reopened', {
      from_status: task?.status ?? null,
      to_status: 'todo',
      from_resolution_type: task?.resolution_type ?? null,
      source: 'timeline',
    });
    toast('Tarefa reaberta.', 'success');
  };

  const handlePostponeTomorrow = (taskId: string, blockerType?: BlockerType | null) => {
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, {
      due_at: postponeToTomorrow(task?.due_at ?? null),
      postponed_count: (task?.postponed_count || 0) + 1,
      blocker_type: blockerType ?? null,
    });
    recordTaskEvent(taskId, 'postponed', {
      mode: 'tomorrow',
      blocker_type: blockerType ?? null,
      source: 'timeline',
    });
    toast('Adiada para amanhã.', 'success');
  };

  const handlePostponeDate = (taskId: string, dateString: string, blockerType?: BlockerType | null) => {
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, {
      due_at: rescheduleToDate(dateString, task?.due_at ?? null),
      postponed_count: (task?.postponed_count || 0) + 1,
      blocker_type: blockerType ?? null,
    });
    recordTaskEvent(taskId, 'postponed', {
      mode: 'date',
      date: dateString,
      blocker_type: blockerType ?? null,
      source: 'timeline',
    });
    toast('Tarefa adiada.', 'success');
  };

  const requestDelete = (task: Task) => {
    setPendingDeleteTask(task);
  };

  const confirmDelete = () => {
    if (!pendingDeleteTask) return;
    deleteTask(pendingDeleteTask.id);
    setPendingDeleteTask(null);
    toast('Tarefa excluída.', 'success');
  };

  const { blocks, now } = useAgendaPositions(tasks, selectedDate, currentEnergy, activeContext);

  // Régua dinâmica: 08:30–21:30 por padrão, estendida para incluir
  // qualquer tarefa do dia que caia fora dessa janela (ex.: noturnas).
  const DEFAULT_START_MIN = 8 * 60 + 30; // 08:30
  const DEFAULT_END_MIN = 21 * 60 + 30;  // 21:30
  const floorTo30 = (min: number) => Math.floor(min / 30) * 30;

  let gridStartMin = DEFAULT_START_MIN;
  let gridEndMin = DEFAULT_END_MIN;
  for (const b of blocks) {
    const bm = b.startTime.getHours() * 60 + b.startTime.getMinutes();
    if (bm < gridStartMin) gridStartMin = floorTo30(bm);
    if (bm > gridEndMin) gridEndMin = floorTo30(bm);
  }

  const timeGrid: { timeString: string; dateObj: Date }[] = [];
  for (let min = gridStartMin; min <= gridEndMin; min += 30) {
    const gh = Math.floor(min / 60);
    const gm = min % 60;
    const d = new Date(selectedDate); d.setHours(gh, gm, 0, 0);
    timeGrid.push({
      timeString: `${gh.toString().padStart(2, '0')}:${gm.toString().padStart(2, '0')}`,
      dateObj: d,
    });
  }

  const isToday = selectedDate.getDate() === now.getDate() &&
                  selectedDate.getMonth() === now.getMonth() &&
                  selectedDate.getFullYear() === now.getFullYear();

  let anchorIndex = 0;
  if (isToday) {
    const nextSlotIndex = timeGrid.findIndex(
      s => s.dateObj.getHours() > now.getHours() ||
          (s.dateObj.getHours() === now.getHours() && s.dateObj.getMinutes() >= now.getMinutes())
    );
    if (nextSlotIndex === -1) {
      anchorIndex = timeGrid.length - 1;
    } else {
      anchorIndex = nextSlotIndex > 0 ? nextSlotIndex - 1 : nextSlotIndex;
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
          className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-paper2 text-ink text-[12px] font-bold shrink-0"
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
      <div
        ref={timelineScrollRef}
        className="bg-paper rounded-2xl border border-line overflow-y-auto overflow-x-hidden flex flex-col max-h-[calc(100dvh-220px)] py-2 scroll-py-3"
      >
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

          const nowTime = now.getTime();
          const slotTime = slot.dateObj.getTime();
          const slotEndTime = slotTime + 30 * 60 * 1000;
          const isCurrentSlot = isToday && nowTime >= slotTime && nowTime < slotEndTime;
          const minutesOffset = Math.floor((nowTime - slotTime) / 60000);
          const topPercent = (minutesOffset / 30) * 100;
          return (
            <TimelineSlot
              key={slot.timeString}
              slot={slot}
              isCurrentSlot={isCurrentSlot}
              topPercent={topPercent}
              now={now}
              slotBlocks={slotBlocks}
              anchorRef={idx === anchorIndex ? anchorRef : undefined}
            >
              {slotBlocks.map((block) => {
                if (block.type === 'break') {
                  return (
                    <div
                      key={`${block.id}-${slot.timeString}`}
                      className="px-3 py-2.5 rounded-xl border border-warning-light bg-warning-light/50 w-full min-w-0 overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[12px] font-bold tnum text-warning tracking-wide">
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
                  <TimelineTaskCard
                    key={`${block.id}-${slot.timeString}`}
                    block={block}
                    now={now}
                    requestDelete={requestDelete}
                    openEdit={openEdit}
                    handleComplete={handleComplete}
                    handlePostponeTomorrow={handlePostponeTomorrow}
                    handlePostponeDate={handlePostponeDate}
                    handleResolve={handleResolve}
                    formatTime={formatTime}
                  />
                );
              })}
            </TimelineSlot>
          );
        })}
      </div>

      {/* Edit modal */}
      {editingTask && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[rgba(26,24,20,0.45)] animate-fade-in"
          onClick={() => setEditingTask(null)}
        >
          <div
            className="bg-paper w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-soft flex flex-col animate-sheet-up max-h-[90dvh]"
            style={{
              paddingTop: 'calc(12px + env(safe-area-inset-top))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center sm:hidden px-5">
              <div className="w-10 h-1 rounded-full bg-paper3 mb-2" />
            </div>

            <div className="flex items-start justify-between px-5">
              <div>
                <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-2">
                  Editar tarefa
                </div>
                <div className="font-display text-[22px] tracking-[-0.02em] text-ink mt-0.5">
                  {editingTask.title}
                </div>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pt-3 grid grid-cols-3 gap-2">
              {editingTask.status === 'done' ? (
                <button
                  type="button"
                  onClick={() => {
                    handleReopen(editingTask.id);
                    setEditingTask(null);
                  }}
                  className="h-10 rounded-xl bg-accent text-white text-[12px] font-bold inline-flex items-center justify-center gap-1"
                  title="Reabrir tarefa"
                >
                  <RotateCcw size={13} /> Reabrir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleComplete(editingTask.id);
                    setEditingTask(null);
                  }}
                  className="h-10 rounded-xl bg-accent text-white text-[12px] font-bold"
                >
                  Concluir
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handlePostponeTomorrow(editingTask.id, editForm.blocker_type || null);
                  setEditingTask(null);
                }}
                className="h-10 rounded-xl border border-border-strong bg-surface text-ink text-[12px] font-bold"
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => {
                  requestDelete(editingTask);
                  setEditingTask(null);
                }}
                className="h-10 rounded-xl border border-border-strong bg-surface text-danger text-[12px] font-bold"
              >
                Excluir
              </button>
            </div>

            <div className="px-5 pt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  handleResolve(editingTask.id, 'cancelled');
                  setEditingTask(null);
                }}
                className="h-11 rounded-xl border border-border-strong bg-surface text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1"
                title="Cancelar sem concluir"
              >
                <XCircle size={13} /> Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResolve(editingTask.id, 'delegated');
                  setEditingTask(null);
                }}
                className="h-11 rounded-xl border border-border-strong bg-surface text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1"
                title="Delegar sem concluir"
              >
                <Send size={13} /> Delegar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResolve(editingTask.id, 'obsolete');
                  setEditingTask(null);
                }}
                className="h-11 rounded-xl border border-border-strong bg-surface text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1"
                title="Marcar como obsoleta"
              >
                <Archive size={13} /> Obsoleta
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3 pb-3">

            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Título</span>
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
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Data e hora</span>
                <input
                  type="datetime-local"
                  value={editForm.due_at}
                  onChange={(e) => setEditForm((f) => ({ ...f, due_at: e.target.value }))}
                  className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 tnum"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Duração (min)</span>
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
              <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Contexto</span>
              <select
                value={editForm.context}
                onChange={(e) => setEditForm((f) => ({ ...f, context: e.target.value as ContextType }))}
                className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink outline-none border-0"
              >
                {CONTEXTS_LIST.map((ctx) => (<option key={ctx} value={ctx}>{ctx}</option>))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Motivo do adiamento</span>
              <select
                value={editForm.blocker_type}
                onChange={(e) => setEditForm((f) => ({ ...f, blocker_type: e.target.value as BlockerType | '' }))}
                className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink outline-none border-0"
              >
                <option value="">Sem motivo</option>
                {BLOCKER_TYPES.map((type) => (
                  <option key={type} value={type}>{blockerTypeLabel(type)}</option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Recorrência</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecurrenceModal(true)}
                  className="flex-1 h-11 bg-paper2 rounded-xl px-3 text-left text-[12px] font-semibold text-ink truncate"
                >
                  {describeRecurrenceRule(editForm.recurrence_rule)}
                </button>
                {editForm.recurrence_rule && (
                  <button
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f, recurrence_rule: null }))}
                    className="w-11 h-11 shrink-0 flex items-center justify-center bg-paper2 rounded-xl text-ink-2 text-[14px] font-bold hover:text-danger"
                    aria-label="Remover recorrência"
                  >
                    ×
                  </button>
                )}
              </div>
              {showRecurrenceModal && (
                <RecurrenceModal
                  dueAt={editForm.due_at ? new Date(editForm.due_at).toISOString() : null}
                  currentRule={editForm.recurrence_rule}
                  onSave={(rule, newDueAt) => {
                    setEditForm((f) => ({
                      ...f,
                      recurrence_rule: rule,
                      ...(newDueAt ? { due_at: new Date(newDueAt).toLocaleString('sv').replace(' ', 'T').slice(0, 16) } : {}),
                    }));
                    setShowRecurrenceModal(false);
                  }}
                  onClose={() => setShowRecurrenceModal(false)}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Prioridade · 0-10</span>
                <input
                  type="number"
                  value={editForm.priority}
                  min={0} max={10}
                  onChange={(e) => setEditForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                  className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 tnum"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Energia · 0-10</span>
                <input
                  type="number"
                  value={editForm.energy}
                  min={0} max={10}
                  onChange={(e) => setEditForm((f) => ({ ...f, energy: Number(e.target.value) }))}
                  className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 tnum"
                />
              </label>
            </div>

            {editingTask.created_at && (
              <div className="mt-3 space-y-0.5 text-xs text-gray-400">
                <p>Criada em {formatDateTime(editingTask.created_at)}</p>
                {editingTask.updated_at && wasEdited(editingTask.created_at, editingTask.updated_at) && (
                  <p>Editada em {formatDateTime(editingTask.updated_at)}</p>
                )}
              </div>
            )}

            </div>{/* end scrollable body */}

            <div
              className="px-5 pt-3 flex gap-2 border-t border-line2"
              style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 py-2.5 rounded-xl border border-border-strong bg-surface text-[13px] font-bold text-ink"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-2.5 rounded-xl bg-accent text-[13px] font-bold text-white"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {pendingDeleteTask && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[rgba(26,24,20,0.45)] animate-fade-in"
          onClick={() => setPendingDeleteTask(null)}
        >
          <div
            className="bg-paper w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-soft p-5"
            style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center sm:hidden">
              <div className="w-10 h-1 rounded-full bg-paper3 mb-4" />
            </div>
            <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-danger">
              Excluir tarefa
            </div>
            <h2 className="mt-1 text-[18px] font-bold text-ink leading-snug">
              {pendingDeleteTask.title}
            </h2>
            <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">
              Esta tarefa será removida da agenda. A ação será sincronizada nos seus dispositivos.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteTask(null)}
                className="h-11 rounded-xl border border-border-strong bg-surface text-[13px] font-bold text-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-11 rounded-xl bg-danger text-[13px] font-bold text-white"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
