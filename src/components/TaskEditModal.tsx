import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, RotateCcw, Send, X, XCircle } from 'lucide-react';
import { formatDateTime, postponeToTomorrow, wasEdited } from '../lib/datetime';
import { describeRecurrenceRule, getNextOccurrenceFromNow } from '../lib/recurrence';
import { buildCompleteUpdates, buildResolutionUpdates } from '../lib/taskLifecycle';
import { buildReopenUpdates } from '../lib/timeTracking';
import { useContextStore } from '../stores/contextStore';
import { useTaskStore } from '../stores/taskStore';
import { BLOCKER_TYPES, CONTEXTS_LIST } from '../types';
import type {
  BlockerType,
  ContextType,
  DecisionLocation,
  PreferredPeriod,
  ResolutionType,
  Task,
  TaskDecisionMetadata,
} from '../types';
import { RecurrenceModal } from './RecurrenceModal';
import { TaskChecklist } from './TaskChecklist';
import { useToast } from './toastContext';

interface TaskEditModalProps {
  task: Task | null;
  onClose: () => void;
}

type EditFormState = {
  title: string;
  description: string;
  due_at: string;
  estimated_minutes: number;
  context: ContextType;
  priority: number;
  energy: number;
  recurrence_rule: string | null;
  blocker_type: BlockerType | '';
  decision_location: DecisionLocation | '';
  preferred_period: PreferredPeriod;
  dependency_ids: string[];
  dependency_titles: string[];
};

const DECISION_LOCATIONS: Array<{ value: DecisionLocation; label: string }> = [
  { value: 'anywhere', label: 'Qualquer local' },
  { value: 'home', label: 'Casa' },
  { value: 'company', label: 'Companhia' },
  { value: 'center', label: 'Centro' },
  { value: 'car', label: 'Carro' },
  { value: 'forum', label: 'Fórum' },
  { value: 'church', label: 'Igreja' },
  { value: 'remote', label: 'Remoto / online' },
];

const PREFERRED_PERIODS: Array<{ value: PreferredPeriod; label: string }> = [
  { value: 'any', label: 'Qualquer horário' },
  { value: 'morning', label: 'Manhã' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'evening', label: 'Noite' },
];

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blockerTypeLabel(type: BlockerType): string {
  if (type === 'waiting_third_party') return 'Aguardando terceiro';
  if (type === 'no_time') return 'Sem tempo';
  if (type === 'priority_changed') return 'Prioridade mudou';
  if (type === 'needs_split') return 'Precisa dividir';
  return 'Dependência';
}

function buildInitialEditForm(
  task: Task | null,
  storedMetadata?: TaskDecisionMetadata,
): EditFormState {
  if (!task) {
    return {
      title: '',
      description: '',
      due_at: '',
      estimated_minutes: 30,
      context: 'Pessoal' as ContextType,
      priority: 0,
      energy: 0,
      recurrence_rule: null,
      blocker_type: '',
      decision_location: '',
      preferred_period: 'any',
      dependency_ids: [],
      dependency_titles: [],
    };
  }

  const decisionMetadata = storedMetadata ?? task.decision_metadata;

  return {
    title: task.title,
    description: task.description ?? '',
    due_at: toLocalDatetimeInput(task.due_at),
    estimated_minutes: task.estimated_minutes || 30,
    context: task.context,
    priority: task.priority,
    energy: task.energy,
    recurrence_rule: typeof task.recurrence_rule === 'string' ? task.recurrence_rule : null,
    blocker_type: task.blocker_type ?? '',
    decision_location: decisionMetadata?.location ?? '',
    preferred_period: decisionMetadata?.preferred_period ?? 'any',
    dependency_ids: decisionMetadata?.dependency_ids ?? [],
    dependency_titles: decisionMetadata?.dependency_titles ?? [],
  };
}

export function TaskEditModal({ task, onClose }: TaskEditModalProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const recordTaskEvent = useTaskStore((s) => s.recordTaskEvent);
  const taskDecisionMetadata = useContextStore((s) => s.taskDecisionMetadata);
  const setTaskDecisionMetadata = useContextStore((s) => s.setTaskDecisionMetadata);
  const removeTaskDecisionMetadata = useContextStore((s) => s.removeTaskDecisionMetadata);
  const toast = useToast();
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceDueAtFromModal, setRecurrenceDueAtFromModal] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(() => buildInitialEditForm(
    task,
    task ? taskDecisionMetadata[task.id] : undefined,
  ));

  const saveEdit = () => {
    if (!task) return;

    const ruleChanged = editForm.recurrence_rule !== (task.recurrence_rule ?? null);
    let newDueAt = editForm.due_at ? new Date(editForm.due_at).toISOString() : null;
    if (ruleChanged && editForm.recurrence_rule && task.status !== 'done' && !recurrenceDueAtFromModal) {
      const candidate = getNextOccurrenceFromNow(
        newDueAt ?? task.due_at,
        editForm.recurrence_rule,
      );
      if (candidate) newDueAt = candidate;
    }

    const updates: Partial<Task> = {
      title: editForm.title,
      description: editForm.description.trim() === '' ? null : editForm.description.trim(),
      due_at: newDueAt,
      context: editForm.context,
      priority: editForm.priority,
      energy: editForm.energy,
      recurrence_rule: editForm.recurrence_rule,
      blocker_type: editForm.blocker_type || null,
    };

    if (editForm.estimated_minutes !== (task.estimated_minutes ?? 30)) {
      updates.estimated_minutes = editForm.estimated_minutes;
      updates.estimated_minutes_source = 'manual';
    }

    updateTask(task.id, updates);
    setTaskDecisionMetadata(task.id, {
      ...(taskDecisionMetadata[task.id] ?? task.decision_metadata ?? {}),
      location: editForm.decision_location || null,
      preferred_period: editForm.preferred_period,
      dependency_ids: editForm.dependency_ids,
      dependency_titles: editForm.dependency_titles,
    });
    onClose();
  };

  const handleComplete = (taskId: string) => {
    const currentTask = tasks.find(t => t.id === taskId);
    const updates: Partial<Task> = currentTask ? buildCompleteUpdates(currentTask) : { status: 'done' };
    updateTask(taskId, updates);
    recordTaskEvent(taskId, 'completed', {
      completed_at: currentTask && currentTask.status !== 'done' ? updates.completed_at ?? null : currentTask?.completed_at ?? null,
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
    const currentTask = tasks.find(t => t.id === taskId);
    updateTask(taskId, buildReopenUpdates('todo'));
    recordTaskEvent(taskId, 'reopened', {
      from_status: currentTask?.status ?? null,
      to_status: 'todo',
      from_resolution_type: currentTask?.resolution_type ?? null,
      source: 'timeline',
    });
    toast('Tarefa reaberta.', 'success');
  };

  const handlePostponeTomorrow = (taskId: string, blockerType?: BlockerType | null) => {
    const currentTask = tasks.find(t => t.id === taskId);
    updateTask(taskId, {
      due_at: postponeToTomorrow(currentTask?.due_at ?? null),
      postponed_count: (currentTask?.postponed_count || 0) + 1,
      blocker_type: blockerType ?? null,
    });
    recordTaskEvent(taskId, 'postponed', {
      mode: 'tomorrow',
      blocker_type: blockerType ?? null,
      source: 'timeline',
    });
    toast('Adiada para amanhã.', 'success');
  };

  const requestDelete = (taskToDelete: Task) => {
    setPendingDeleteTask(taskToDelete);
  };

  const confirmDelete = (continueSeries: boolean) => {
    if (!pendingDeleteTask) return;
    deleteTask(pendingDeleteTask.id, { continueSeries });
    removeTaskDecisionMetadata(pendingDeleteTask.id);
    setPendingDeleteTask(null);
    onClose();
    toast(continueSeries ? 'Ocorrência excluída. A recorrência continua.' : 'Tarefa excluída.', 'success');
  };

  const taskIsResolved = task ? task.status === 'done' || !!task.resolution_type : false;
  const dependencyOptions = tasks.filter((candidate) =>
    candidate.id !== task?.id
    && !candidate.deleted_at
    && !editForm.dependency_ids.includes(candidate.id)
  );

  return (
    <>
      {task && !pendingDeleteTask && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-scrim backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        >
          <div
            className="bg-paper w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-soft flex flex-col animate-sheet-up max-h-[90dvh] lg:max-w-xl"
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
                  {task.title}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pt-3 grid grid-cols-3 gap-2">
              {taskIsResolved ? (
                <button
                  type="button"
                  onClick={() => {
                    handleReopen(task.id);
                    onClose();
                  }}
                  className="h-10 rounded-xl bg-accent text-on-accent text-[12px] font-bold inline-flex items-center justify-center gap-1"
                  title="Reabrir tarefa"
                >
                  <RotateCcw size={13} /> Reabrir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleComplete(task.id);
                    onClose();
                  }}
                  className="h-10 rounded-xl bg-accent text-on-accent text-[12px] font-bold"
                >
                  Concluir
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handlePostponeTomorrow(task.id, editForm.blocker_type || null);
                  onClose();
                }}
                className="h-10 rounded-xl border border-border-strong bg-surface text-ink text-[12px] font-bold"
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => {
                  requestDelete(task);
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
                  handleResolve(task.id, 'cancelled');
                  onClose();
                }}
                className="h-11 rounded-xl border border-border-strong bg-surface text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1"
                title="Cancelar sem concluir"
              >
                <XCircle size={13} /> Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResolve(task.id, 'delegated');
                  onClose();
                }}
                className="h-11 rounded-xl border border-border-strong bg-surface text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1"
                title="Delegar sem concluir"
              >
                <Send size={13} /> Delegar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResolve(task.id, 'obsolete');
                  onClose();
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

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Observações</span>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Detalhes, checklist, links, contexto..."
                  rows={4}
                  className="bg-paper2 rounded-xl px-3 py-2.5 text-base text-ink outline-none border-0 resize-y"
                />
              </label>

              {/* A checklist grava sozinha, sem esperar o Salvar: é o mesmo
                  comportamento do card da Agenda, onde não existe Salvar.
                  Ver DECISIONS.md (2026-08-14). */}
              <TaskChecklist
                task={task}
                variant="modal"
                onCompleteTask={taskIsResolved ? undefined : () => {
                  handleComplete(task.id);
                  onClose();
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Data e hora</span>
                  <input
                    type="datetime-local"
                    value={editForm.due_at}
                    onChange={(e) => {
                      setRecurrenceDueAtFromModal(false);
                      setEditForm((f) => ({ ...f, due_at: e.target.value }));
                    }}
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

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Local</span>
                  <select
                    value={editForm.decision_location}
                    onChange={(e) => setEditForm((f) => ({ ...f, decision_location: e.target.value as DecisionLocation | '' }))}
                    className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink outline-none border-0"
                  >
                    <option value="">Inferir pelo contexto</option>
                    {DECISION_LOCATIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Melhor período</span>
                  <select
                    value={editForm.preferred_period}
                    onChange={(e) => setEditForm((f) => ({ ...f, preferred_period: e.target.value as PreferredPeriod }))}
                    className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink outline-none border-0"
                  >
                    {PREFERRED_PERIODS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Dependências</span>
                {(editForm.dependency_ids.length > 0 || editForm.dependency_titles.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {editForm.dependency_ids.map((dependencyId) => {
                      const dependency = tasks.find((candidate) => candidate.id === dependencyId);
                      return (
                        <button
                          key={dependencyId}
                          type="button"
                          onClick={() => setEditForm((f) => ({
                            ...f,
                            dependency_ids: f.dependency_ids.filter((id) => id !== dependencyId),
                          }))}
                          className="min-h-9 rounded-full bg-paper2 px-3 text-[12px] font-semibold text-ink inline-flex items-center gap-1.5"
                          title="Remover dependência"
                        >
                          {dependency?.title ?? 'Tarefa removida'} <span aria-hidden="true">×</span>
                        </button>
                      );
                    })}
                    {editForm.dependency_titles.map((title) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => setEditForm((f) => ({
                          ...f,
                          dependency_titles: f.dependency_titles.filter((value) => value !== title),
                        }))}
                        className="min-h-9 rounded-full bg-amber-soft px-3 text-[12px] font-semibold text-ink inline-flex items-center gap-1.5"
                        title="Remover dependência capturada"
                      >
                        {title} <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                )}
                <select
                  value=""
                  onChange={(e) => {
                    const dependencyId = e.target.value;
                    if (!dependencyId) return;
                    setEditForm((f) => ({
                      ...f,
                      dependency_ids: [...f.dependency_ids, dependencyId],
                    }));
                  }}
                  className="min-h-11 bg-paper2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink outline-none border-0"
                >
                  <option value="">Adicionar tarefa necessária…</option>
                  {dependencyOptions.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
                  ))}
                </select>
                <span className="text-[11px] text-ink-2">A tarefa só entra como próxima ação quando as dependências forem concluídas.</span>
              </div>

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
                      onClick={() => {
                        setRecurrenceDueAtFromModal(false);
                        setEditForm((f) => ({ ...f, recurrence_rule: null }));
                      }}
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
                      setRecurrenceDueAtFromModal(Boolean(newDueAt));
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
                    min={0}
                    max={10}
                    onChange={(e) => setEditForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                    className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 tnum"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Energia · 0-10</span>
                  <input
                    type="number"
                    value={editForm.energy}
                    min={0}
                    max={10}
                    onChange={(e) => setEditForm((f) => ({ ...f, energy: Number(e.target.value) }))}
                    className="bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 tnum"
                  />
                </label>
              </div>

              {task.created_at && (
                <div className="mt-3 space-y-0.5 text-xs text-gray-400">
                  <p>Criada em {formatDateTime(task.created_at)}</p>
                  {task.updated_at && wasEdited(task.created_at, task.updated_at) && (
                    <p>Editada em {formatDateTime(task.updated_at)}</p>
                  )}
                </div>
              )}
            </div>

            <div
              className="px-5 pt-3 flex gap-2 border-t border-line2"
              style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border-strong bg-surface text-[13px] font-bold text-ink"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-2.5 rounded-xl bg-accent text-[13px] font-bold text-on-accent"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {pendingDeleteTask && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-scrim backdrop-blur-sm animate-fade-in"
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
            {pendingDeleteTask.recurrence_rule ? (
              <>
                <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">
                  Essa tarefa se repete ({describeRecurrenceRule(pendingDeleteTask.recurrence_rule)}). O que você quer excluir?
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => confirmDelete(true)}
                    className="h-11 rounded-xl bg-danger text-[13px] font-bold text-white"
                  >
                    Só esta ocorrência (recorrência continua)
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(false)}
                    className="h-11 rounded-xl border border-border-strong bg-surface text-danger text-[13px] font-bold"
                  >
                    Esta e encerrar a recorrência
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteTask(null)}
                    className="h-11 rounded-xl border border-border-strong bg-surface text-[13px] font-bold text-ink"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
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
                    onClick={() => confirmDelete(false)}
                    className="h-11 rounded-xl bg-danger text-[13px] font-bold text-white"
                  >
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      , document.body)}
    </>
  );
}
