import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Repeat, Trash2, Flag } from 'lucide-react';
import type { Task, ContextType } from '../types';
import { CONTEXTS_LIST } from '../types';
import { describeRecurrenceRule } from '../lib/recurrence';

interface MultiTaskConfirmModalProps {
  initialTasks: Partial<Task>[];
  onConfirm: (finalTasks: Partial<Task>[]) => void;
  onCancel: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 0,  label: 'Normal',  swatch: '#A09B91' },
  { value: 5,  label: 'Média',   swatch: '#C16A2A' },
  { value: 8,  label: 'Alta',    swatch: '#B83838' },
  { value: 10, label: 'Urgente', swatch: '#1A1814' },
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

function formatForInput(isoString?: string | null) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}
function parseFromInput(local: string) {
  if (!local) return undefined;
  const d = new Date(local);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function MultiTaskConfirmModal({
  initialTasks, onConfirm, onCancel,
}: MultiTaskConfirmModalProps) {
  const [tasks, setTasks] = useState<Partial<Task>[]>(initialTasks);

  const updateTask = (idx: number, updates: Partial<Task>) => {
    const next = [...tasks];
    next[idx] = { ...next[idx], ...updates };
    setTasks(next);
  };

  const removeTask = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[rgba(26,24,20,0.45)] animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-paper w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl shadow-soft animate-sheet-up flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingTop:    'calc(8px + env(safe-area-inset-top))',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-paper3 mb-2 mt-1" />
        </div>

        {/* header */}
        <div className="px-5 pt-2 pb-3 flex items-start justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center shrink-0">
              <Sparkles size={16} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink-3">
                IA destrinchou
              </div>
              <div className="font-display text-[22px] tracking-[-0.02em] text-ink leading-tight mt-0.5">
                {tasks.length} {tasks.length === 1 ? 'tarefa encontrada' : 'tarefas encontradas'}.
              </div>
              <p className="text-[11px] text-ink-2 mt-1 leading-snug">
                Revise os detalhes antes de salvar.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* body */}
        <div className="px-5 pb-3 flex-1 overflow-y-auto flex flex-col gap-3">
          {tasks.map((task, idx) => {
            const ctx = (task.context as ContextType) || 'Pessoal';
            return (
              <div
                key={idx}
                className={[
                  'bg-paper2 border border-line rounded-2xl p-3.5',
                  'border-l-4',
                  CTX_BAR[ctx],
                ].join(' ')}
              >
                {/* row 1: title + delete */}
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={task.title || ''}
                    onChange={(e) => updateTask(idx, { title: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent text-[15px] font-bold text-ink outline-none border-0 placeholder:text-ink-3"
                    placeholder="Título da tarefa"
                  />
                  <button
                    onClick={() => removeTask(idx)}
                    className="w-8 h-8 rounded-xl bg-paper flex items-center justify-center text-danger hover:bg-danger-light shrink-0"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* tags row */}
                {task.recurrence_rule && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-soft text-ink">
                      <Repeat size={10} strokeWidth={2.4} /> {describeRecurrenceRule(task.recurrence_rule)}
                    </span>
                  </div>
                )}

                {/* row 2: date + context */}
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Data e hora</span>
                    <input
                      type="datetime-local"
                      value={formatForInput(task.due_at)}
                      onChange={(e) => updateTask(idx, { due_at: parseFromInput(e.target.value) })}
                      className="bg-paper rounded-xl px-2.5 py-2 text-[12px] text-ink outline-none border-0 tnum"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Contexto</span>
                    <select
                      value={task.context}
                      onChange={(e) => updateTask(idx, { context: e.target.value as ContextType })}
                      className="bg-paper rounded-xl px-2.5 py-2 text-[12px] font-semibold text-ink outline-none border-0"
                    >
                      {CONTEXTS_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>

                {/* row 3: priority segmented */}
                <div className="mt-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3 block mb-1">
                    Prioridade
                  </span>
                  <div className="flex bg-paper rounded-xl p-1 gap-1">
                    {PRIORITY_OPTIONS.map((p) => {
                      const on = (task.priority ?? 0) === p.value;
                      return (
                        <button
                          key={p.value}
                          onClick={() => updateTask(idx, { priority: p.value })}
                          className={[
                            'flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-extrabold transition-colors',
                            on ? 'bg-ink text-white' : 'text-ink-2',
                          ].join(' ')}
                        >
                          <Flag size={10} strokeWidth={2.4} style={{ color: on ? '#fff' : p.swatch }} />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="text-center py-10 text-[13px] text-ink-2">
              Todas as tarefas foram removidas.
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-5 pt-3 flex items-center gap-2 border-t border-line">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-paper2 text-[13px] font-extrabold text-ink-2"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(tasks)}
            disabled={tasks.length === 0}
            className="flex-[1.4] h-11 rounded-xl bg-ink text-[13px] font-extrabold text-white disabled:opacity-40"
          >
            Salvar {tasks.length > 0 ? tasks.length : ''} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
