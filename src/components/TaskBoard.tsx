import { useEffect, useState } from 'react';
import { formatDateTime, rescheduleToDate, postponeToTomorrow, wasEdited } from '../lib/datetime';
import type { Task, TaskStatus, ContextType } from '../types';
import { CONTEXTS_LIST } from '../types';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { calculateTaskScore } from '../lib/ranking';
import { TaskActions } from './TaskActions';
import {
  Check, Flag, Clock, Repeat, ChevronDown, Trash2,
} from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo',  title: 'A fazer' },
  { id: 'doing', title: 'Em andamento' },
  { id: 'done',  title: 'Concluído' },
];

const CTX_BAR: Record<ContextType, string> = {
  PM:      'border-l-ctxPM',
  Esdra:   'border-l-ctxEsdra',
  Pessoal: 'border-l-ctxPessoal',
  Familia: 'border-l-ctxFamilia',
  CCB:     'border-l-ctxCCB',
  Estudo:  'border-l-ctxEstudo',
  Saude:   'border-l-ctxSaude',
};

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

// ─── Compact task row ────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  expanded: boolean;
  onToggleExpand: () => void;
  onAdvance: () => void;
  onRevert: () => void;
  onPostponeTomorrow: () => void;
  onPostponeDate: (d: string) => void;
  isDone: boolean;
  isFirstInColumn: boolean;
  isLastInColumn: boolean;
}

function TaskRow({
  task, expanded, onToggleExpand,
  onAdvance, onRevert, onPostponeTomorrow, onPostponeDate,
  isDone, isFirstInColumn, isLastInColumn,
}: TaskRowProps) {
  const { updateTask, deleteTask } = useTaskStore();

  const timeText = formatTime(task.due_at);
  const durText  = task.actual_minutes != null
    ? `${task.actual_minutes}m`
    : task.estimated_minutes != null
      ? `${task.estimated_minutes}m`
      : '30m';

  const isLate = !!task.due_at && new Date(task.due_at) < new Date() && !isDone;

  return (
    <div
      className={[
        'bg-paper border border-line border-l-4',
        CTX_BAR[task.context],
        'overflow-hidden transition-shadow',
        isFirstInColumn ? 'rounded-t-2xl' : '',
        isLastInColumn  ? 'rounded-b-2xl' : '',
        !isFirstInColumn ? '-mt-px' : '',
        expanded ? 'shadow-soft' : '',
      ].join(' ')}
    >
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-paper2 transition-colors"
        style={{ opacity: isDone ? 0.55 : 1 }}
      >
        {/* checkbox */}
        <span
          onClick={(e) => { e.stopPropagation(); if (!isDone) onAdvance(); }}
          className={[
            'w-[22px] h-[22px] shrink-0 rounded-full border-[1.6px] flex items-center justify-center transition-colors',
            isDone ? 'bg-success border-success' : 'bg-white border-line2 hover:border-ink-3',
          ].join(' ')}
        >
          {isDone && <Check size={12} strokeWidth={3} color="#fff" />}
        </span>

        {/* body */}
        <span className="flex-1 min-w-0">
          <span className={`flex items-center gap-1.5 text-[14px] font-bold text-ink tracking-tight ${isDone ? 'line-through' : ''}`}>
            <span className="truncate min-w-0">{task.title}</span>
            {task.recurrence_rule && <Repeat size={11} className="shrink-0 text-ink-3" />}
            {isLate && (
              <span className="shrink-0 inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-danger-light text-danger tracking-wide">
                ATRASADA
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5 mt-1 text-[11px] text-ink-2 tnum">
            {timeText && <span className="inline-flex items-center gap-1"><Clock size={11} /> {timeText}</span>}
            {timeText && <span className="text-ink-3">·</span>}
            <span>{durText}</span>
            {(task.postponed_count ?? 0) > 0 && (
              <>
                <span className="text-ink-3">·</span>
                <span className="inline-flex items-center gap-0.5 text-warning">🐌 {task.postponed_count}×</span>
              </>
            )}
          </span>
        </span>

        {/* right side: priority + chevron */}
        <span className="flex items-center gap-2 shrink-0">
          {task.priority > 0 && (
            <span
              className={
                'inline-flex items-center gap-0.5 text-[11px] font-extrabold tnum ' +
                (task.priority >= 8 ? 'text-danger' : task.priority >= 5 ? 'text-warning' : 'text-ink-3')
              }
            >
              <Flag size={11} strokeWidth={2.4} /> P{task.priority}
            </span>
          )}
          <ChevronDown
            size={16}
            className={'text-ink-3 transition-transform ' + (expanded ? 'rotate-180' : '')}
          />
        </span>
      </button>

      {/* expanded actions */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-line2 bg-paper">
          {!isDone && (
            <div className="mb-2.5">
              <TaskActions
                showComplete={true}
                onComplete={onAdvance}
                onPostponeTomorrow={onPostponeTomorrow}
                onPostponeDate={onPostponeDate}
              />
            </div>
          )}

          {/* meta editors */}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wide text-ink-3 flex flex-col gap-1">
              Contexto
              <select
                value={task.context}
                onChange={(e) => updateTask(task.id, { context: e.target.value as ContextType })}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper2 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-ink border-0 outline-none"
              >
                {CONTEXTS_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="text-[10px] font-bold uppercase tracking-wide text-ink-3 flex flex-col gap-1">
              Quando
              <input
                type="datetime-local"
                value={toLocalDatetimeInput(task.due_at)}
                onChange={(e) => {
                  const v = e.target.value;
                  updateTask(task.id, { due_at: v ? new Date(v).toISOString() : null });
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper2 rounded-lg px-2 py-1.5 text-[12px] text-ink border-0 outline-none tnum"
              />
            </label>

            <label className="text-[10px] font-bold uppercase tracking-wide text-ink-3 flex flex-col gap-1 col-span-2">
              Tempo estimado
              <div className="flex items-center bg-paper2 rounded-lg overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTask(task.id, { estimated_minutes: Math.max(5, (task.estimated_minutes || 30) - 15) });
                  }}
                  className="px-3 py-1.5 text-ink-2 text-[14px] font-bold"
                >−15</button>
                <span className="flex-1 text-center text-[12px] font-bold text-ink tnum">
                  {task.estimated_minutes ?? 30} min
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTask(task.id, { estimated_minutes: (task.estimated_minutes || 30) + 15 });
                  }}
                  className="px-3 py-1.5 text-ink-2 text-[14px] font-bold"
                >+15</button>
              </div>
            </label>
          </div>

          {/* secondary actions */}
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[10px] text-ink-3 tnum">
              ★ {calculateTaskScore(task, 0, task.context).toFixed(2)} · #{task.id.slice(0, 6)}
            </span>
            <div className="flex items-center gap-1">
              {!isDone && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRevert(); }}
                  className="text-[11px] font-semibold text-ink-2 px-2 py-1 rounded-lg hover:bg-paper2"
                  disabled={task.status === 'todo'}
                >
                  ← Voltar
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                className="text-[11px] font-semibold text-danger px-2 py-1 rounded-lg hover:bg-danger-light inline-flex items-center gap-1"
              >
                <Trash2 size={12} /> Excluir
              </button>
            </div>
          </div>

          {task.created_at && (
            <div className="text-xs text-gray-400 mt-3 space-y-0.5">
              <p>Criada em {formatDateTime(task.created_at)}</p>
              {wasEdited(task.created_at, task.updated_at) && (
                <p>Editada em {formatDateTime(task.updated_at)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Board ───────────────────────────────────────────────────────

export function TaskBoard({ tasks }: TaskBoardProps) {
  const { updateTask, recordViewEvent } = useTaskStore();
  const { currentEnergy, activeContext } = useContextStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    tasks.filter(t => !t.deleted_at).forEach(task => recordViewEvent(task.id));
  }, [tasks, recordViewEvent]);

  const handleStatusChange = (taskId: string, currentStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    const currentIndex = COLUMNS.findIndex(c => c.id === currentStatus);
    const nextStatus = COLUMNS[currentIndex + 1]?.id;
    if (!nextStatus) return;
    const updates: Partial<Task> = { status: nextStatus };
    if (nextStatus === 'doing') updates.started_at = new Date().toISOString();
    else if (nextStatus === 'done' && task?.started_at) {
      const diff = Math.round((Date.now() - new Date(task.started_at).getTime()) / 60_000);
      updates.actual_minutes = diff;
    }
    updateTask(taskId, updates);
  };

  const handleStatusRevert = (taskId: string, currentStatus: TaskStatus) => {
    const currentIndex = COLUMNS.findIndex(c => c.id === currentStatus);
    const prevStatus = COLUMNS[currentIndex - 1]?.id;
    if (prevStatus) updateTask(taskId, { status: prevStatus });
  };

  const handlePostponeTomorrow = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, { due_at: postponeToTomorrow(task?.due_at ?? null), postponed_count: (task?.postponed_count || 0) + 1 });
  };

  const handlePostponeDate = (taskId: string, dateString: string) => {
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, { due_at: rescheduleToDate(dateString, task?.due_at ?? null), postponed_count: (task?.postponed_count || 0) + 1 });
  };

  return (
    <div className="flex flex-col gap-5">
      {COLUMNS.map(column => {
        const columnTasks = tasks.filter(t => t.status === column.id && !t.deleted_at);
        const tasksWithScore = columnTasks.map(t => ({
          ...t,
          score: calculateTaskScore(t, currentEnergy, activeContext),
        }));
        tasksWithScore.sort((a, b) => b.score - a.score);

        return (
          <section key={column.id}>
            {/* section header */}
            <div className="flex items-baseline justify-between px-1 mb-2">
              <h2 className="text-[14px] font-extrabold tracking-tight text-ink">
                {column.title}
                <span className="ml-1.5 text-[11px] font-bold text-ink-3 tnum">{columnTasks.length}</span>
              </h2>
            </div>

            {/* rows */}
            {tasksWithScore.length === 0 ? (
              <div className="border-2 border-dashed border-line rounded-2xl px-4 py-6 text-center text-[12px] text-ink-3">
                Vazio
              </div>
            ) : (
              <div className="flex flex-col">
                {tasksWithScore.map((task, idx) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    expanded={expandedId === task.id}
                    onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    onAdvance={() => handleStatusChange(task.id, task.status)}
                    onRevert={() => handleStatusRevert(task.id, task.status)}
                    onPostponeTomorrow={() => handlePostponeTomorrow(task.id)}
                    onPostponeDate={(d) => handlePostponeDate(task.id, d)}
                    isDone={column.id === 'done'}
                    isFirstInColumn={idx === 0}
                    isLastInColumn={idx === tasksWithScore.length - 1}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
