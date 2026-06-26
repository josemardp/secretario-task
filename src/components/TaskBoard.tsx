import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateTime, rescheduleToDate, postponeToTomorrow, wasEdited } from '../lib/datetime';
import { describeRecurrenceRule } from '../lib/recurrence';
import type { Task, TaskStatus, ContextType } from '../types';
import { CONTEXTS_LIST } from '../types';
import { RecurrenceModal } from './RecurrenceModal';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { calculateTaskScore } from '../lib/ranking';
import { TaskActions } from './TaskActions';
import { EmptyState } from './EmptyState';
import {
  Check, Flag, Clock, Repeat, ChevronDown, Trash2, ArrowRight,
} from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  topTasks?: Task[];
}

const ACTIVE_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'A fazer' },
  { id: 'doing', title: 'Em andamento' },
];

const CTX_BAR: Record<ContextType, string> = {
  PM: 'border-l-ctxPM',
  Esdra: 'border-l-ctxEsdra',
  Pessoal: 'border-l-ctxPessoal',
  Familia: 'border-l-ctxFamilia',
  CCB: 'border-l-ctxCCB',
  Estudo: 'border-l-ctxEstudo',
  Saude: 'border-l-ctxSaude',
};

function ctxLabel(ctx: ContextType): string {
  return ctx === 'Saude' ? 'Saúde' : ctx === 'Familia' ? 'Família' : ctx;
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildCompleteUpdates(task: Task): Partial<Task> {
  const updates: Partial<Task> = { status: 'done' };
  if (task.started_at) {
    updates.actual_minutes = Math.round((Date.now() - new Date(task.started_at).getTime()) / 60_000);
  }
  return updates;
}

function NowCard({ task, onStart }: { task: Task | undefined; onStart: (task: Task) => void }) {
  if (!task) {
    return (
      <section>
        <div className="flex items-baseline justify-between px-1 mb-2">
          <h2 className="text-[16px] font-semibold tracking-tight text-ink">Agora</h2>
        </div>
        <EmptyState title="Nada urgente" hint="Capture uma tarefa ou consulte a Agenda." />
      </section>
    );
  }

  const timeText = formatTime(task.due_at) ?? 'Sem horário';
  const durText = `${task.estimated_minutes || 30}m`;

  return (
    <section>
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink">Agora</h2>
      </div>
      <div className={`bg-ink text-white rounded-2xl px-4 py-4 border-l-4 ${CTX_BAR[task.context]} shadow-soft`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-soft">
            Prioridade atual
          </span>
          {task.priority > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-amber-soft text-[12px] font-semibold">
              <Flag size={11} strokeWidth={2.4} /> P{task.priority}
            </span>
          )}
        </div>
        <div className="font-display text-[26px] leading-[1.05]">{task.title}</div>
        <div className="flex items-center gap-2 mt-2 text-[12px] text-white/80 tnum">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} strokeWidth={1.8} /> {timeText}
          </span>
          <span>·</span>
          <span>{durText}</span>
          <span>·</span>
          <span>{ctxLabel(task.context)}</span>
        </div>
        <button
          onClick={() => onStart(task)}
          className="mt-3 w-full h-11 rounded-xl bg-white text-ink text-[13px] font-bold inline-flex items-center justify-center gap-1.5 active:bg-paper2"
        >
          <ArrowRight size={15} strokeWidth={2.4} /> Iniciar agora
        </button>
      </div>
    </section>
  );
}

interface TaskRowProps {
  task: Task;
  expanded: boolean;
  onToggleExpand: () => void;
  onComplete: () => void;
  onStart: () => void;
  onRevert: () => void;
  onPostponeTomorrow: () => void;
  onPostponeDate: (d: string) => void;
  isDone: boolean;
}

function TaskRow({
  task, expanded, onToggleExpand, onComplete, onStart, onRevert, onPostponeTomorrow, onPostponeDate, isDone,
}: TaskRowProps) {
  const { updateTask, deleteTask } = useTaskStore();
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const timeText = formatTime(task.due_at);
  const durText = task.actual_minutes != null
    ? `${task.actual_minutes}m`
    : task.estimated_minutes != null
      ? `${task.estimated_minutes}m`
      : '30m';

  const isLate = !!task.due_at && new Date(task.due_at) < new Date() && !isDone;

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || isDone) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 72 || Math.abs(dy) > 48) return;

    if (dx > 0) {
      navigator.vibrate?.(10);
      onComplete();
    } else {
      navigator.vibrate?.(8);
      onPostponeTomorrow();
    }
  };

  return (
    <div
      onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={handleTouchEnd}
      className={[
        'bg-paper border border-line border-l-4 rounded-2xl overflow-hidden shadow-card transition',
        CTX_BAR[task.context],
        expanded ? 'shadow-soft' : '',
        isDone ? 'opacity-65' : '',
      ].join(' ')}
    >
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 px-3 py-2 text-left active:bg-paper2 transition-colors"
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (!isDone) {
              navigator.vibrate?.(10);
              onComplete();
            }
          }}
          className="-my-2 -ml-2 w-11 h-11 shrink-0 flex items-center justify-center"
          aria-label="Concluir tarefa"
          role="button"
        >
          <span
            className={[
              'w-[22px] h-[22px] rounded-full border-[1.6px] flex items-center justify-center transition-all',
              isDone ? 'bg-success border-success scale-105' : 'bg-white border-line2 hover:border-ink-2',
            ].join(' ')}
          >
            {isDone && <Check size={12} strokeWidth={3} color="#fff" />}
          </span>
        </span>

        <span className="flex-1 min-w-0">
          <span className={`flex items-center gap-1.5 text-[14px] font-semibold text-ink tracking-tight ${isDone ? 'line-through' : ''}`}>
            <span className="truncate min-w-0">{task.title}</span>
            {task.recurrence_rule && <Repeat size={12} className="shrink-0 text-ink-2" />}
            {isLate && (
              <span className="shrink-0 inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded bg-danger-light text-danger tracking-wide">
                ATRASADA
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5 mt-1 text-[12px] text-ink-2 tnum">
            {timeText && <span className="inline-flex items-center gap-1"><Clock size={12} /> {timeText}</span>}
            {timeText && <span>·</span>}
            <span>{durText}</span>
            {(task.postponed_count ?? 0) > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5 text-warning">
                  Adiada {task.postponed_count}×
                </span>
              </>
            )}
          </span>
        </span>

        <span className="flex items-center gap-2 shrink-0">
          {task.priority > 0 && (
            <span
              className={
                'inline-flex items-center gap-0.5 text-[12px] font-bold tnum ' +
                (task.priority >= 8 ? 'text-danger' : task.priority >= 5 ? 'text-warning' : 'text-ink-2')
              }
            >
              <Flag size={12} strokeWidth={2.4} /> P{task.priority}
            </span>
          )}
          <ChevronDown
            size={16}
            className={'text-ink-2 transition-transform ' + (expanded ? 'rotate-180' : '')}
          />
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-line2 bg-paper">
          {!isDone && (
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              {task.status === 'todo' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStart(); }}
                  className="h-11 px-3 rounded-lg bg-ink text-white text-[12px] font-bold"
                >
                  Iniciar
                </button>
              )}
              <TaskActions
                showComplete={true}
                onComplete={onComplete}
                onPostponeTomorrow={onPostponeTomorrow}
                onPostponeDate={onPostponeDate}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-2 flex flex-col gap-1">
              Contexto
              <select
                value={task.context}
                onChange={(e) => updateTask(task.id, { context: e.target.value as ContextType })}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper2 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-ink border-0 outline-none"
              >
                {CONTEXTS_LIST.map((c) => <option key={c} value={c}>{ctxLabel(c)}</option>)}
              </select>
            </label>

            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-2 flex flex-col gap-1">
              Quando
              <input
                type="datetime-local"
                value={toLocalDatetimeInput(task.due_at)}
                onChange={(e) => {
                  const v = e.target.value;
                  updateTask(task.id, { due_at: v ? new Date(v).toISOString() : null });
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper2 rounded-lg px-2 py-1.5 text-[13px] text-ink border-0 outline-none tnum"
              />
            </label>

            <div className="col-span-2 flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Recorrência</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowRecurrenceModal(true); }}
                  className="flex-1 h-11 bg-paper2 rounded-xl px-3 text-left text-[13px] font-semibold text-ink truncate"
                >
                  {describeRecurrenceRule(typeof task.recurrence_rule === 'string' ? task.recurrence_rule : null)}
                </button>
                {task.recurrence_rule && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); updateTask(task.id, { recurrence_rule: null }); }}
                    className="w-11 h-11 shrink-0 flex items-center justify-center bg-paper2 rounded-xl text-ink-2 text-[16px] font-bold hover:text-danger"
                    aria-label="Remover recorrência"
                  >
                    ×
                  </button>
                )}
              </div>
              {showRecurrenceModal && (
                <RecurrenceModal
                  dueAt={task.due_at}
                  currentRule={typeof task.recurrence_rule === 'string' ? task.recurrence_rule : null}
                  onSave={(rule, newDueAt) => {
                    const updates: Partial<Task> = { recurrence_rule: rule };
                    if (newDueAt) updates.due_at = newDueAt;
                    updateTask(task.id, updates);
                    setShowRecurrenceModal(false);
                  }}
                  onClose={() => setShowRecurrenceModal(false)}
                />
              )}
            </div>

            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-2 flex flex-col gap-1 col-span-2">
              Tempo estimado
              <div className="flex items-center bg-paper2 rounded-lg overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTask(task.id, { estimated_minutes: Math.max(5, (task.estimated_minutes || 30) - 15) });
                  }}
                  className="px-3 py-2 text-ink-2 text-[14px] font-bold"
                >−15</button>
                <span className="flex-1 text-center text-[13px] font-semibold text-ink tnum">
                  {task.estimated_minutes ?? 30} min
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTask(task.id, { estimated_minutes: (task.estimated_minutes || 30) + 15 });
                  }}
                  className="px-3 py-2 text-ink-2 text-[14px] font-bold"
                >+15</button>
              </div>
            </label>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[12px] text-ink-2 tnum">
              {task.context} · {task.energy}/10 energia
            </span>
            <div className="flex items-center gap-1">
              {!isDone && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRevert(); }}
                  className="text-[12px] font-semibold text-ink-2 px-2 py-1.5 rounded-lg hover:bg-paper2"
                  disabled={task.status === 'todo'}
                >
                  Voltar
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                className="text-[12px] font-semibold text-danger px-2 py-1.5 rounded-lg hover:bg-danger-light inline-flex items-center gap-1"
              >
                <Trash2 size={13} /> Excluir
              </button>
            </div>
          </div>

          {task.created_at && (
            <div className="mt-3 space-y-0.5 text-[12px] text-ink-2">
              <p>Criada em {formatDateTime(task.created_at)}</p>
              {task.updated_at && wasEdited(task.created_at, task.updated_at) && (
                <p>Editada em {formatDateTime(task.updated_at)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskBoard({ tasks, topTasks = [] }: TaskBoardProps) {
  const { updateTask, recordViewEvent } = useTaskStore();
  const { currentEnergy, activeContext } = useContextStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);

  useEffect(() => {
    tasks.filter(t => !t.deleted_at).forEach(task => recordViewEvent(task.id));
  }, [tasks, recordViewEvent]);

  const completeTask = (task: Task) => {
    updateTask(task.id, buildCompleteUpdates(task));
  };

  const startTask = (task: Task) => {
    updateTask(task.id, { status: 'doing', started_at: new Date().toISOString() });
  };

  const handleStatusRevert = (task: Task) => {
    const prevStatus = task.status === 'done' ? 'doing' : task.status === 'doing' ? 'todo' : null;
    if (prevStatus) updateTask(task.id, { status: prevStatus });
  };

  const handlePostponeTomorrow = (task: Task) => {
    updateTask(task.id, {
      due_at: postponeToTomorrow(task.due_at ?? null),
      postponed_count: (task.postponed_count || 0) + 1,
    });
  };

  const handlePostponeDate = (task: Task, dateString: string) => {
    updateTask(task.id, {
      due_at: rescheduleToDate(dateString, task.due_at ?? null),
      postponed_count: (task.postponed_count || 0) + 1,
    });
  };

  const scoredTasks = useMemo(() => {
    const byStatus: Record<TaskStatus, (Task & { score: number })[]> = {
      todo: [],
      doing: [],
      done: [],
    };
    tasks
      .filter((task) => !task.deleted_at)
      .forEach((task) => {
        byStatus[task.status].push({
          ...task,
          score: calculateTaskScore(task, currentEnergy, activeContext),
        });
      });
    Object.values(byStatus).forEach((list) => list.sort((a, b) => b.score - a.score));
    return byStatus;
  }, [tasks, currentEnergy, activeContext]);

  const doneTasks = scoredTasks.done;

  return (
    <div className="flex flex-col gap-5">
      <NowCard task={topTasks[0]} onStart={startTask} />

      {ACTIVE_COLUMNS.map(column => {
        const columnTasks = scoredTasks[column.id];

        return (
          <section key={column.id}>
            <div className="flex items-baseline justify-between px-1 mb-2">
              <h2 className="text-[16px] font-semibold tracking-tight text-ink">
                {column.title}
                <span className="ml-1.5 text-[12px] font-semibold text-ink-2 tnum">{columnTasks.length}</span>
              </h2>
            </div>

            {columnTasks.length === 0 ? (
              <EmptyState title="Nada aqui" />
            ) : (
              <div className="flex flex-col gap-2">
                {columnTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    expanded={expandedId === task.id}
                    onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    onComplete={() => completeTask(task)}
                    onStart={() => startTask(task)}
                    onRevert={() => handleStatusRevert(task)}
                    onPostponeTomorrow={() => handlePostponeTomorrow(task)}
                    onPostponeDate={(date) => handlePostponeDate(task, date)}
                    isDone={false}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section>
        <button
          type="button"
          onClick={() => setDoneOpen((open) => !open)}
          className="w-full flex items-center justify-between px-1 mb-2 text-left"
        >
          <h2 className="text-[16px] font-semibold tracking-tight text-ink">
            Concluídas hoje
            <span className="ml-1.5 text-[12px] font-semibold text-ink-2 tnum">{doneTasks.length}</span>
          </h2>
          <ChevronDown size={16} className={'text-ink-2 transition-transform ' + (doneOpen ? 'rotate-180' : '')} />
        </button>

        {doneOpen && (
          doneTasks.length === 0 ? (
            <EmptyState title="Nada concluído" hint="As tarefas finalizadas aparecem aqui." />
          ) : (
            <div className="flex flex-col gap-2">
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  expanded={expandedId === task.id}
                  onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  onComplete={() => completeTask(task)}
                  onStart={() => startTask(task)}
                  onRevert={() => handleStatusRevert(task)}
                  onPostponeTomorrow={() => handlePostponeTomorrow(task)}
                  onPostponeDate={(date) => handlePostponeDate(task, date)}
                  isDone
                />
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}
