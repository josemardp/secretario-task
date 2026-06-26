import { useRef, useState } from 'react';
import { Archive, Check, Send, Sun, Calendar, XCircle } from 'lucide-react';
import { BLOCKER_TYPES } from '../types';
import type { BlockerType, ResolutionType } from '../types';

interface TaskActionsProps {
  onComplete: () => void;
  onPostponeTomorrow: (blockerType?: BlockerType | null) => void;
  onPostponeDate: (dateString: string, blockerType?: BlockerType | null) => void;
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
  const [blockerType, setBlockerType] = useState<BlockerType | ''>('');
  const selectedBlockerType = blockerType || null;

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
        onClick={() => onPostponeTomorrow(selectedBlockerType)}
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
            if (e.target.value) onPostponeDate(e.target.value, selectedBlockerType);
          }}
        />
      </div>

      <select
        value={blockerType}
        onChange={(e) => setBlockerType(e.target.value as BlockerType | '')}
        className="min-h-11 max-w-[180px] rounded-lg bg-paper2 px-2 text-[12px] font-semibold text-ink outline-none"
        title="Motivo opcional do adiamento"
        aria-label="Motivo opcional do adiamento"
      >
        <option value="">Sem motivo</option>
        {BLOCKER_TYPES.map((type) => (
          <option key={type} value={type}>{blockerTypeLabel(type)}</option>
        ))}
      </select>

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

function blockerTypeLabel(type: BlockerType): string {
  if (type === 'waiting_third_party') return 'Aguardando terceiro';
  if (type === 'no_time') return 'Sem tempo';
  if (type === 'priority_changed') return 'Prioridade mudou';
  if (type === 'needs_split') return 'Precisa dividir';
  return 'Dependência';
}
