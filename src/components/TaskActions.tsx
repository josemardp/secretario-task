import { useRef } from 'react';
import { Archive, Check, Send, Sun, Calendar, XCircle } from 'lucide-react';
import type { ResolutionType } from '../types';

interface TaskActionsProps {
  onComplete: () => void;
  onPostponeTomorrow: () => void;
  onPostponeDate: (dateString: string) => void;
  onResolve?: (type: Exclude<ResolutionType, 'completed'>) => void;
  showComplete?: boolean;
}

export function TaskActions({
  onComplete,
  onPostponeTomorrow,
  onPostponeDate,
  onResolve,
  showComplete = true,
}: TaskActionsProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      {showComplete && (
        <button
          onClick={onComplete}
          className="min-h-11 inline-flex items-center gap-1 text-[12px] font-bold px-3 py-2 rounded-lg bg-success text-white hover:opacity-90 transition-colors"
          title="Marcar como concluído"
        >
          <Check size={12} strokeWidth={2.6} /> Concluir
        </button>
      )}

      <button
        onClick={onPostponeTomorrow}
        className="min-h-11 inline-flex items-center gap-1 text-[12px] font-bold px-3 py-2 rounded-lg bg-paper2 text-ink hover:bg-paper3 transition-colors"
        title="Adiar para amanhã"
      >
        <Sun size={12} strokeWidth={2.2} /> Amanhã
      </button>

      <div className="relative">
        <button
          onClick={() => dateInputRef.current?.showPicker?.()}
          className="min-h-11 inline-flex items-center gap-1 text-[12px] font-bold px-3 py-2 rounded-lg bg-paper2 text-ink hover:bg-paper3 transition-colors"
          title="Escolher outra data"
        >
          <Calendar size={12} strokeWidth={2.2} /> Adiar
        </button>
        <input
          ref={dateInputRef}
          type="date"
          className="absolute opacity-0 w-0 h-0 p-0 m-0 border-0"
          onChange={(e) => {
            if (e.target.value) onPostponeDate(e.target.value);
          }}
        />
      </div>

      {onResolve && (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onResolve('cancelled')}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg bg-paper2 text-ink-2 hover:text-danger hover:bg-danger-light transition-colors"
            title="Cancelar sem concluir"
            aria-label="Cancelar sem concluir"
          >
            <XCircle size={15} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => onResolve('delegated')}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg bg-paper2 text-ink-2 hover:text-accent transition-colors"
            title="Delegar sem concluir"
            aria-label="Delegar sem concluir"
          >
            <Send size={15} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => onResolve('obsolete')}
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg bg-paper2 text-ink-2 hover:text-warning transition-colors"
            title="Marcar como obsoleta"
            aria-label="Marcar como obsoleta"
          >
            <Archive size={15} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );
}
