import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { buildDecisionInsights } from '../lib/decisionEngine';
import type { Task } from '../types';

const TONE_CLASS = {
  neutral: 'border-line bg-paper2',
  positive: 'border-success/30 bg-paper2',
  attention: 'border-warning/40 bg-amber-soft',
} as const;

export function DecisionInsightsCard({ tasks }: { tasks: Task[] }) {
  const insights = useMemo(() => buildDecisionInsights(tasks, new Date()), [tasks]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
          <Lightbulb size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-secondary">Insights acionáveis</div>
          <div className="text-[11px] text-ink-secondary mt-0.5">Leituras determinísticas; sem diagnóstico ou nota de produtividade.</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {insights.map((insight) => (
          <div key={insight.id} className={`rounded-xl border px-3 py-2.5 ${TONE_CLASS[insight.tone]}`}>
            <div className="text-[13px] font-bold text-ink">{insight.title}</div>
            <div className="text-[11px] leading-snug text-ink-secondary mt-1">{insight.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
