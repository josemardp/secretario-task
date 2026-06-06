import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatDateTime, rescheduleToDate, postponeToTomorrow, wasEdited } from '../lib/datetime';
import { WEEKDAY_PILLS, RECURRENCE_PRESETS, getNextOccurrenceFromNow, toggleWeekday, togglePreset } from '../lib/recurrence';
import { Calendar as CalIcon, Flag, Repeat, X, Edit3, Trash2 } from 'lucide-react';
import type { Task, ContextType, RecurrenceRule } from '../types';
import { CONTEXTS_LIST } from '../types';
import { useContextStore } from '../stores/contextStore';
import { useTaskStore } from '../stores/taskStore';
import { TaskActions } from './TaskActions';
import { CalendarWidget } from './CalendarWidget';
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

// ─── Task card ──────────────────────────────────────────────────

interface TimelineTaskCardProps {
  block: TimelineBlock;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  openEdit: (task: Task) => void;
  handleComplete: (id: string) => void;
  handlePostponeTomorrow: (id: string) => void;
  handlePostponeDate: (id: string, dateString: string) => void;
  formatTime: (date: Date) => string;
}

function TimelineTaskCard({
  block, updateTask, deleteTask, openEdit,
  handleComplete, handlePostponeTomorrow, handlePostponeDate, formatTime,
}: TimelineTaskCardProps) {
  const t = block.task!;
  const isLate =
    (t.due_at && new Date(t.due_at) < new Date()) ||
    (!t.due_at &&
      new Date(t.created_at).getTime() < Date.now() - 3 * 60 * 60 * 1000 &&
      new Date(t.created_at).getDate() === new Date().getDate());

  const style: React.CSSProperties = {
    touchAction: 'pan-y',
  };

  const durText = t.actual_minutes != null ? `${t.actual_minutes}m real` : `${t.estimated_minutes || 30}m`;

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

  return (
    <div
      ref={anchorRef}
      className={[
        'flex relative border-b',
        onHourBoundary ? 'border-line' : 'border-line2',
        slotBlocksCount === 0 ? 'min-h-[28px]' : 'min-h-[76px]',
      ].join(' ')}
      style={{
        touchAction: 'pan-y',
      }}
    >
      {/* Now line */}
      {isCurrentSlot && (
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

export function TimelineView({ tasks }: TimelineViewProps) {
  const { currentEnergy, activeContext } = useContextStore();
  const { updateTask, deleteTask } = useTaskStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dismissedBreaks, setDismissedBreaks] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    due_at: string;
    estimated_minutes: number;
    context: ContextType;
    priority: number;
    energy: number;
    recurrence_rule: RecurrenceRule;
  }>({
    title: '', due_at: '', estimated_minutes: 30,
    context: 'Pessoal' as ContextType, priority: 0, energy: 0,
    recurrence_rule: null,
  });

  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf1: number, raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      recurrence_rule: (task.recurrence_rule ?? null) as RecurrenceRule | null,
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
                  <TimelineTaskCard
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

            <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3 pb-3">

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

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Recorrência</span>

              {/* Linha 1: quadradinhos dos dias da semana */}
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_PILLS.map(({ label, key }) => {
                  const active = editForm.recurrence_rule === 'daily'
                    ? true
                    : typeof editForm.recurrence_rule === 'string'
                      ? editForm.recurrence_rule.split(',').includes(key)
                      : false;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setEditForm((f) => ({
                          ...f,
                          recurrence_rule: toggleWeekday(f.recurrence_rule, key),
                        }));
                      }}
                      className={`h-9 rounded-xl text-[11px] font-extrabold transition-colors ${
                        active
                          ? 'bg-ink text-white'
                          : 'bg-paper2 text-ink-2'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Linha 2: atalhos rápidos */}
              <div className="flex flex-wrap gap-1.5">
                {RECURRENCE_PRESETS.map(({ label, value }) => {
                  const active = editForm.recurrence_rule === value;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setEditForm((f) => ({
                          ...f,
                          recurrence_rule: togglePreset(f.recurrence_rule, value),
                        }))
                      }
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-colors ${
                        active
                          ? 'bg-ink text-white'
                          : 'bg-paper2 text-ink-2'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

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
      , document.body)}
    </div>
  );
}
