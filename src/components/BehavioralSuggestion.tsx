import { useEffect, useState } from 'react';
import { Zap, Battery } from 'lucide-react';
import type { Task } from '../types';
import { getSuggestion } from '../lib/behaviorEngine';

interface BehavioralSuggestionProps {
  tasks: Task[];
}

export function BehavioralSuggestion({ tasks }: BehavioralSuggestionProps) {
  const [suggestion, setSuggestion] = useState<{
    message: string;
    suggestedTaskId: string | null;
    type: 'high' | 'low';
  } | null>(null);

  useEffect(() => {
    setSuggestion(getSuggestion(tasks));
    const interval = setInterval(() => setSuggestion(getSuggestion(tasks)), 60 * 1000 * 60);
    return () => clearInterval(interval);
  }, [tasks]);

  if (!suggestion || !suggestion.suggestedTaskId) return null;

  const isHigh = suggestion.type === 'high';

  return (
    <div className="mb-4 bg-paper border border-line rounded-2xl px-3.5 py-3 flex items-start gap-3">
      <div
        className={
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ' +
          (isHigh ? 'bg-warning-light text-warning' : 'bg-success-light text-success')
        }
      >
        {isHigh ? <Zap size={16} strokeWidth={2.2} /> : <Battery size={16} strokeWidth={2.2} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink-3">
          Análise comportamental
        </div>
        <p className="font-display text-[15px] text-ink leading-snug mt-0.5">
          {suggestion.message}
        </p>
      </div>
    </div>
  );
}
