import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CircleSlash, Send, Split, TimerOff, X, XCircle, Archive, Handshake, Link2 } from 'lucide-react';
import { buildCompleteUpdates, buildResolutionUpdates } from '../lib/taskLifecycle';
import { BLOCKER_TYPES } from '../types';
import type { BlockerType, ResolutionType, Task } from '../types';

type WeeklyReviewProps = {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onClose: () => void;
};

const blockerLabels: Record<BlockerType, string> = {
  waiting_third_party: 'Aguardando terceiro',
  no_time: 'Sem tempo agora',
  priority_changed: 'Prioridade mudou',
  needs_split: 'Precisa ser dividida',
  dependency: 'Tem dependência',
};

const blockerIcons: Record<BlockerType, typeof Handshake> = {
  waiting_third_party: Handshake,
  no_time: TimerOff,
  priority_changed: CircleSlash,
  needs_split: Split,
  dependency: Link2,
};

const resolutionLabels: Record<Exclude<ResolutionType, 'completed'>, string> = {
  cancelled: 'Cancelar',
  delegated: 'Delegar',
  obsolete: 'Obsoleta',
};

function formatTaskMeta(task: Task): string {
  const parts: string[] = [task.context];
  if (task.due_at) {
    const due = new Date(task.due_at);
    if (Number.isFinite(due.getTime())) {
      parts.push(due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }
  }
  if ((task.postponed_count ?? 0) > 0) {
    const count = task.postponed_count ?? 0;
    parts.push(`adiada ${count} ${count === 1 ? 'vez' : 'vezes'}`);
  }
  return parts.join(' · ');
}

export function WeeklyReview({ tasks, onUpdateTask, onClose }: WeeklyReviewProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const remainingTasks = useMemo(
    () => tasks.filter((task) => !dismissedIds.has(task.id)),
    [dismissedIds, tasks],
  );

  const markBlocker = (task: Task, blockerType: BlockerType) => {
    onUpdateTask(task.id, { blocker_type: blockerType });
  };

  const completeTask = (task: Task) => {
    onUpdateTask(task.id, buildCompleteUpdates(task));
  };

  const resolveTask = (task: Task, resolutionType: Exclude<ResolutionType, 'completed'>) => {
    onUpdateTask(task.id, buildResolutionUpdates(resolutionType));
  };

  const keepOpen = (task: Task) => {
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(task.id);
      return next;
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[rgba(26,24,20,0.45)] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-paper w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-soft flex flex-col animate-sheet-up max-h-[92dvh]"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center sm:hidden px-5">
          <div className="w-10 h-1 rounded-full bg-paper3 mb-2" />
        </div>

        <div className="flex items-start justify-between gap-4 px-5 pb-3 border-b border-line2">
          <div className="min-w-0">
            <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-2">
              Revisão semanal
            </div>
            <h2 className="font-display text-[22px] leading-tight text-ink mt-0.5">
              {remainingTasks.length} tarefas sem motivo
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink-2 shrink-0"
            aria-label="Fechar revisão"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {remainingTasks.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface px-4 py-5">
              <div className="text-[15px] font-bold text-ink">Revisão concluída.</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                Não há tarefas abertas sem motivo nesta sessão.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {remainingTasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-line bg-surface px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold leading-snug text-ink break-words">{task.title}</h3>
                      <p className="mt-1 text-[12px] text-ink-2 tnum">{formatTaskMeta(task)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => keepOpen(task)}
                      className="min-h-11 px-3 rounded-xl border border-border-strong bg-paper text-[12px] font-bold text-ink shrink-0"
                    >
                      Manter aberta
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">
                      Motivo
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {BLOCKER_TYPES.map((type) => {
                        const Icon = blockerIcons[type];
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => markBlocker(task, type)}
                            className="min-h-11 rounded-xl bg-paper2 text-ink text-[12px] font-bold inline-flex items-center justify-center gap-2 px-3"
                          >
                            <Icon size={14} />
                            <span>{blockerLabels[type]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">
                      Resolver agora
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => completeTask(task)}
                        className="min-h-11 rounded-xl bg-accent text-white text-[12px] font-bold inline-flex items-center justify-center gap-1.5 px-2"
                      >
                        <Check size={14} />
                        Concluir
                      </button>
                      {(Object.keys(resolutionLabels) as Exclude<ResolutionType, 'completed'>[]).map((type) => {
                        const Icon = type === 'delegated' ? Send : type === 'obsolete' ? Archive : XCircle;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => resolveTask(task, type)}
                            className="min-h-11 rounded-xl border border-border-strong bg-paper text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1.5 px-2"
                          >
                            <Icon size={13} />
                            {resolutionLabels[type]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div
          className="px-5 pt-3 border-t border-line2"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-11 rounded-xl bg-accent text-white text-[13px] font-bold"
          >
            Encerrar revisão
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
