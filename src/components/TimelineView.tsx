import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatDateTime, rescheduleToDate, postponeToTomorrow, wasEdited } from '../lib/datetime';
import { describeRecurrenceRule, getNextOccurrenceFromNow } from '../lib/recurrence';
import { Calendar as CalIcon, Flag, Repeat, X, Edit3, Trash2 } from 'lucide-react';
import type { Task, ContextType } from '../types';
import { CONTEXTS_LIST } from '../types';
import { useContextStore } from '../stores/contextStore';
import { useTaskStore } from '../stores/taskStore';
import { CalendarWidget } from './CalendarWidget';
import { RecurrenceModal } from './RecurrenceModal';
import { useAgendaPositions, type TimelineBlock } from '../hooks/useAgendaPositions';


interface TimelineViewProps {
  tasks: Task[];
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

// ─── Recurrence helpers (importados de src/lib/recurrence.ts) ───

function AgendaQuickActions({
  onComplete,
  onPostponeTomorrow,
  onPostponeDate,
  onEdit,
}: {
  onComplete: () => void;
  onPostponeTomorrow: () => void;
  onPostponeDate: (dateString: string) => void;
  onEdit: () => void;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className="h-8 px-2.5 rounded-lg bg-success text-white text-[12px] font-bold"
      >
        Concluir
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPostponeTomorrow();
        }}
        className="h-8 px-2.5 rounded-lg bg-paper2 text-ink text-[12px] font-bold"
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
          className="h-8 px-2.5 rounded-lg bg-paper2 text-ink text-[12px] font-bold"
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="h-8 px-2.5 rounded-lg bg-paper2 text-ink text-[12px] font-bold inline-flex items-center gap-1"
        title="Editar"
      >
        <Edit3 size={12} /> Editar
      </button>
    </div>
  );
}

// ─── Task card ──────────────────────────────────────────────────

interface TimelineTaskCardProps {
  block: TimelineBlock;
  now: Date;
  deleteTask: (id: string) => void;
  openEdit: (task: Task) => void;
  handleComplete: (id: string) => void;
  handlePostponeTomorrow: (id: string) => void;
  handlePostponeDate: (id: string, dateString: string) => void;
  formatTime: (date: Date) => string;
}

function TimelineTaskCard({
  block, now, deleteTask, openEdit,
  handleComplete, handlePostponeTomorrow, handlePostponeDate, formatTime,
}: TimelineTaskCardProps) {
  const t = block.task!;
  const isLate =
    (t.due_at && new Date(t.due_at) < now) ||
    (!t.due_at &&
      new Date(t.created_at).getTime() < now.getTime() - 3 * 60 * 60 * 1000 &&
      new Date(t.created_at).getDate() === now.getDate());

  const style: React.CSSProperties = {
    touchAction: 'pan-y',
  };

  return (
    <div
      style={style}
      className={[
        'relative z-20 w-full min-w-0 overflow-hidden flex flex-col bg-paper rounded-xl border border-line border-l-4',
        CTX_BAR[t.context],
        'shadow-card',
      ].join(' ')}
    >
      <div className="px-3 pt-2.5 pb-2.5">
        {/* time + duration controls */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[12px] font-bold tnum text-ink-2 tracking-wide">
            {formatTime(block.startTime)} – {formatTime(block.endTime)}
          </span>
          <div className="flex items-center gap-1.5">
            {isLate && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-danger-light text-danger tracking-[0.05em]">
                ATRASADA
              </span>
            )}
          </div>
        </div>

        {/* title row */}
        <h3 className="text-[14px] font-bold text-ink leading-snug tracking-tight break-words flex items-center gap-1.5">
          {t.recurrence_rule && <Repeat size={12} className="shrink-0 text-ink-2" />}
          {(t.postponed_count ?? 0) > 0 && (
            <span title={`${t.postponed_count}× adiada`} className="shrink-0 text-[11px] font-bold bg-warning-light text-warning px-1.5 py-0.5 rounded">
              Adiada {t.postponed_count}×
            </span>
          )}
          <span className="min-w-0">{block.title}</span>
        </h3>

        <div className="mt-2" onMouseDown={(e) => e.stopPropagation()}>
          <AgendaQuickActions
            onComplete={() => handleComplete(t.id)}
            onPostponeTomorrow={() => handlePostponeTomorrow(t.id)}
            onPostponeDate={(d) => handlePostponeDate(t.id, d)}
            onEdit={() => openEdit(t)}
          />
        </div>

        {/* priority chip */}
        {t.priority > 0 && (
          <div className="mt-1.5">
            <span
              className={
                'inline-flex items-center gap-1 text-[12px] font-bold tnum ' +
                (t.priority >= 8 ? 'text-danger' : t.priority >= 5 ? 'text-warning' : 'text-ink-2')
              }
            >
              <Flag size={10} strokeWidth={2.4} /> P{t.priority}
            </span>
          </div>
        )}

        {/* secondary actions */}
        <div
          className="mt-2 pt-2 border-t border-line2 flex items-center justify-end gap-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}
              className="text-danger w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-danger-light"
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
  isCurrentSlot: boolean;
  topPercent: number;
  now: Date;
  slotBlocksCount: number;
  children: React.ReactNode;
  anchorRef?: React.Ref<HTMLDivElement>;
}

function TimelineSlot({
  slot, isCurrentSlot, topPercent, now,
  slotBlocksCount, children, anchorRef,
}: TimelineSlotProps) {
  // half-hour vs hour boundary
  const onHourBoundary = slot.dateObj.getMinutes() === 0;
  const slotMinHeight = slotBlocksCount === 0
    ? 28
    : Math.max(112, slotBlocksCount * 156 + Math.max(0, slotBlocksCount - 1) * 8 + 16);

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
      <div className={`flex-1 min-w-0 flex flex-col gap-2 relative ${slotBlocksCount === 0 ? 'py-1 pr-2' : 'p-2'}`}>
        {children}
      </div>
    </div>
  );
}

// ─── Main view ──────────────────────────────────────────────────

export function TimelineView({ tasks }: TimelineViewProps) {
  const { currentEnergy, activeContext } = useContextStore();
  const { updateTask, deleteTask } = useTaskStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dismissedBreaks, setDismissedBreaks] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    due_at: string;
    estimated_minutes: number;
    context: ContextType;
    priority: number;
    energy: number;
    recurrence_rule: string | null;
  }>({
    title: '', due_at: '', estimated_minutes: 30,
    context: 'Pessoal' as ContextType, priority: 0, energy: 0,
    recurrence_rule: null,
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
          top: container.scrollTop + anchorTop - containerTop,
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

    updateTask(editingTask.id, {
      title: editForm.title,
      due_at: newDueAt,
      estimated_minutes: editForm.estimated_minutes,
      context: editForm.context,
      priority: editForm.priority,
      energy: editForm.energy,
      recurrence_rule: editForm.recurrence_rule,
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
        className="bg-paper rounded-2xl border border-line overflow-y-auto overflow-x-hidden flex flex-col max-h-[calc(100dvh-220px)]"
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
              slotBlocksCount={slotBlocks.length}
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
                className="flex-1 py-2.5 rounded-xl bg-paper2 text-[13px] font-bold text-ink-2"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-2.5 rounded-xl bg-ink text-[13px] font-bold text-white"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
