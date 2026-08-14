import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import {
  addChecklistItem,
  CHECKLIST_MAX_ITEMS,
  checklistForPersist,
  countChecklist,
  isChecklistComplete,
  normalizeChecklist,
  removeChecklistItem,
  toggleChecklistItem,
} from '../lib/checklist';
import { useTaskStore } from '../stores/taskStore';
import type { ChecklistItem, Task } from '../types';

interface TaskChecklistProps {
  task: Task;
  /** `modal` edita (adicionar/remover); `card` só marca item na Agenda. */
  variant: 'modal' | 'card';
  /** Chamado pelo botão da faixa que aparece com todos os itens marcados.
   * Ausente = a faixa não oferece concluir. */
  onCompleteTask?: () => void;
}

export function TaskChecklist({ task, variant, onCompleteTask }: TaskChecklistProps) {
  const updateTask = useTaskStore((s) => s.updateTask);
  // A gravação é imediata nas duas telas, então a fonte tem que ser a tarefa
  // viva do store — a `task` recebida por prop é um retrato do momento em que
  // o modal/card foi montado e ficaria desatualizada ao primeiro clique.
  const liveTask = useTaskStore((s) => s.tasks.find((t) => t.id === task.id)) ?? task;
  const [draft, setDraft] = useState('');

  const items = normalizeChecklist(liveTask.checklist);
  const { done, total } = countChecklist(items);
  const complete = isChecklistComplete(items);
  const isEditable = variant === 'modal';

  const persist = (next: ChecklistItem[]) => {
    updateTask(task.id, { checklist: checklistForPersist(next) });
  };

  const handleAdd = () => {
    const next = addChecklistItem(items, draft);
    if (next === items) return;
    persist(next);
    setDraft('');
  };

  if (!isEditable && total === 0) return null;

  return (
    <div
      className="flex flex-col gap-1.5"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {isEditable && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Checklist</span>
          {total > 0 && (
            <span className="text-[12px] font-bold tnum text-ink-2">{done}/{total}</span>
          )}
        </div>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => persist(toggleChecklistItem(items, item.id))}
                className="flex min-h-11 flex-1 items-center gap-2.5 text-left"
                aria-pressed={item.done}
              >
                <span
                  className={[
                    'w-[22px] h-[22px] shrink-0 rounded-md inline-flex items-center justify-center border-2 transition-colors',
                    item.done
                      ? 'bg-accent border-accent text-white'
                      : 'bg-surface border-border-strong text-transparent',
                  ].join(' ')}
                >
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                </span>
                <span
                  className={[
                    'min-w-0 break-words text-[13px] leading-snug',
                    item.done ? 'line-through text-ink-tertiary' : 'text-ink',
                  ].join(' ')}
                >
                  {item.text}
                </span>
              </button>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => persist(removeChecklistItem(items, item.id))}
                  className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-xl text-ink-tertiary hover:text-danger"
                  aria-label={`Remover item ${item.text}`}
                  title="Remover item"
                >
                  <X size={15} strokeWidth={2.4} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isEditable && (
        items.length >= CHECKLIST_MAX_ITEMS ? (
          <span className="text-[11px] text-ink-2">
            Limite de {CHECKLIST_MAX_ITEMS} itens atingido.
          </span>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Adicionar item…"
              enterKeyHint="done"
              className="min-h-11 flex-1 min-w-0 rounded-xl border-0 bg-paper2 px-3 text-base text-ink outline-none"
            />
            <button
              type="submit"
              disabled={draft.trim() === ''}
              className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-paper2 text-ink disabled:text-ink-tertiary"
              aria-label="Adicionar item à checklist"
              title="Adicionar item"
            >
              <Plus size={17} strokeWidth={2.4} />
            </button>
          </form>
        )
      )}

      {complete && onCompleteTask && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-soft px-3 py-2">
          <span className="min-w-0 text-[12px] font-semibold text-ink">
            Todos os itens feitos.
          </span>
          <button
            type="button"
            onClick={onCompleteTask}
            className="min-h-9 shrink-0 rounded-lg bg-accent px-3 text-[12px] font-bold text-white"
          >
            Concluir tarefa
          </button>
        </div>
      )}
    </div>
  );
}
