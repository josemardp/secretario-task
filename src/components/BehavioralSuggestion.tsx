import { useEffect, useState } from 'react';
import type { Task } from '../types';
import { getSuggestion } from '../lib/behaviorEngine';

interface BehavioralSuggestionProps {
  tasks: Task[];
}

export function BehavioralSuggestion({ tasks }: BehavioralSuggestionProps) {
  const [suggestion, setSuggestion] = useState<{ message: string; suggestedTaskId: string | null; type: 'high' | 'low' } | null>(null);

  useEffect(() => {
    // Calcula a sugestão baseada na hora atual
    const currentSuggestion = getSuggestion(tasks);
    setSuggestion(currentSuggestion);
    
    // Atualiza a sugestão a cada hora cheia para ver se o pico mudou
    const interval = setInterval(() => {
      setSuggestion(getSuggestion(tasks));
    }, 60 * 1000 * 60); // A cada hora
    
    return () => clearInterval(interval);
  }, [tasks]);

  if (!suggestion || !suggestion.suggestedTaskId) return null;

  return (
    <div className={`mb-6 rounded-xl p-4 shadow-sm border ${
      suggestion.type === 'high' 
        ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100' 
        : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="text-2xl mt-1">
            {suggestion.type === 'high' ? '⚡' : '🔋'}
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${
              suggestion.type === 'high' ? 'text-orange-900' : 'text-emerald-900'
            }`}>
              Análise Comportamental
            </h3>
            <p className={`text-sm mt-1 leading-relaxed ${
              suggestion.type === 'high' ? 'text-orange-800' : 'text-emerald-800'
            }`}>
              {suggestion.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
