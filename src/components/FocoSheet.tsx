import { Sparkles, Clock, Flag, ArrowRight, X } from 'lucide-react';
import type { Task, ContextType } from '../types';

interface FocoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  topTasks: Task[];
  briefingText: string | null;
  isGeneratingBriefing: boolean;
  onGenerateBriefing: () => void;
  onStartTop1?: (task: Task) => void;
}

const CTX_BAR: Record<ContextType, string> = {
  PM: 'border-l-ctxPM',
  Esdra: 'border-l-ctxEsdra',
  Pessoal: 'border-l-ctxPessoal',
  Familia: 'border-l-ctxFamilia',
  CCB: 'border-l-ctxCCB',
  Estudo: 'border-l-ctxEstudo',
  Saude: 'border-l-ctxSaude',
};

function ctxLabel(ctx: ContextType): string {
  return ctx === 'Saude' ? 'Saúde' : ctx === 'Familia' ? 'Família' : ctx;
}

function formatTimeRange(task: Task): string {
  if (!task.due_at) return 'Sem horário';
  const start = new Date(task.due_at);
  const mins = task.estimated_minutes || 30;
  const end = new Date(start.getTime() + mins * 60_000);
  const fmt = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function FocoSheet({
  isOpen,
  onClose,
  topTasks,
  briefingText,
  isGeneratingBriefing,
  onGenerateBriefing,
  onStartTop1,
}: FocoSheetProps) {
  if (!isOpen) return null;

  const top1 = topTasks[0];
  const rest = topTasks.slice(1, 3);

  return (
    <div className="fixed inset-0 z-50 animate-fade-in" onClick={onClose}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-[rgba(26,24,20,0.45)]" />

      {/* sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-paper rounded-t-3xl shadow-soft animate-sheet-up safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-3">
          <div className="w-10 h-1 rounded-full bg-paper3" />
        </div>

        {/* header */}
        <div className="px-5 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-extrabold tracking-[0.06em] uppercase text-ink-3">
              Foco · Top 3
            </div>
            <div className="font-display text-[26px] leading-[1.1] text-ink mt-1">
              Suas três prioridades.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateBriefing}
              disabled={isGeneratingBriefing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink text-white text-[11px] font-extrabold disabled:opacity-50"
            >
              <Sparkles size={12} strokeWidth={2.2} />
              {isGeneratingBriefing ? 'Pensando…' : 'Briefing'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* briefing card */}
        {briefingText && (
          <div className="mx-5 mt-3 px-3.5 py-3 rounded-2xl bg-amber-soft text-ink text-[13px] leading-snug font-display">
            "{briefingText}"
          </div>
        )}

        {/* Top 1 — dark hero */}
        {top1 ? (
          <div className="px-5 mt-3">
            <div className="bg-ink text-white rounded-2xl px-3.5 pt-3.5 pb-3 relative overflow-hidden">
              <div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(200,142,42,.35), transparent 70%)' }}
              />
              <div className="relative flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold tracking-[0.06em] text-amber-soft">TOP 1</span>
                {top1.priority > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-amber-soft text-[10px] font-extrabold">
                    <Flag size={10} strokeWidth={2.4} /> P{top1.priority}
                  </span>
                )}
              </div>
              <div className="font-display text-[26px] leading-[1.05] relative">{top1.title}</div>
              <div className="relative flex items-center gap-2 mt-1.5 text-[11px] text-white/80 tnum">
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} strokeWidth={1.8} /> {formatTimeRange(top1)}
                </span>
                <span>·</span>
                <span>{ctxLabel(top1.context)}</span>
              </div>
              <button
                onClick={() => onStartTop1?.(top1)}
                className="relative mt-2.5 w-full h-9 rounded-xl bg-white text-ink text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5"
              >
                <ArrowRight size={14} strokeWidth={2.4} /> Iniciar agora
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 mt-3">
            <div className="bg-paper2 text-ink-2 rounded-2xl px-4 py-6 text-center text-[13px]">
              Nenhuma tarefa em foco para hoje.
            </div>
          </div>
        )}

        {/* Top 2/3 */}
        {rest.length > 0 && (
          <div className="px-5 mt-2 flex flex-col gap-1.5 pb-4">
            {rest.map((t, i) => (
              <div
                key={t.id}
                className={`px-3 py-2.5 bg-paper border border-line rounded-xl border-l-4 ${CTX_BAR[t.context]} flex items-center gap-2.5`}
              >
                <span className="text-[10px] font-extrabold tracking-[0.05em] text-ink-3 w-7">
                  TOP {i + 2}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-ink truncate">{t.title}</div>
                  <div className="text-[10px] text-ink-3 mt-0.5 tnum">
                    {t.due_at
                      ? new Date(t.due_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : 'sem horário'}{' '}
                    · {t.estimated_minutes || 30}m
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
