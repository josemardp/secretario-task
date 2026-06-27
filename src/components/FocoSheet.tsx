import { createPortal } from 'react-dom';
import { Sparkles, Clock, Flag, X } from 'lucide-react';
import type { Task, ContextType } from '../types';

interface FocoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  topTasks: Task[];
  briefingText: string | null;
  isGeneratingBriefing: boolean;
  onGenerateBriefing: () => void;
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
}: FocoSheetProps) {
  if (!isOpen) return null;

  const top1 = topTasks[0];
  const rest = topTasks.slice(1, 3);

  return createPortal(
    <div className="fixed inset-0 z-[9999] animate-fade-in" onClick={onClose}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-[rgba(26,24,20,0.45)]" />

      {/* sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-paper rounded-t-3xl shadow-soft animate-sheet-up flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag handle — fora do scroll */}
        <div className="flex justify-center pt-2 pb-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-paper3" />
        </div>

        {/* header — fora do scroll */}
        <div className="px-5 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="text-[12px] font-bold tracking-[0.06em] uppercase text-ink-2">
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
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-ink text-white text-[12px] font-bold disabled:opacity-50"
            >
              <Sparkles size={12} strokeWidth={2.2} />
              {isGeneratingBriefing ? 'Gerando...' : 'Briefing'}
            </button>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* corpo rolável */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        >

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
              <div className="relative flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-bold tracking-[0.06em] text-amber-soft">TOP 1</span>
                {top1.priority > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-amber-soft text-[12px] font-bold">
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
          <div className="px-5 mt-2 flex flex-col gap-1.5 pb-2">
            {rest.map((t, i) => (
              <div
                key={t.id}
                className={`px-3 py-2.5 bg-paper border border-line rounded-xl border-l-4 ${CTX_BAR[t.context]} flex items-center gap-2.5`}
              >
                <span className="text-[12px] font-bold tracking-[0.05em] text-ink-2 w-10">
                  TOP {i + 2}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink truncate">{t.title}</div>
                  <div className="text-[12px] text-ink-2 mt-0.5 tnum">
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

        </div>{/* fim corpo rolável */}
      </div>
    </div>
  , document.body);
}
