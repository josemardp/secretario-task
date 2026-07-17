import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import type {
  ContextType,
  DecisionLocation,
  Task,
} from '../types';
import { CONTEXTS_LIST } from '../types';
import type { DailyReview, DecisionPlan } from '../lib/decisionEngine';
import { getDecisionLocationLabel } from '../lib/decisionEngine';

interface FocoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  plan: DecisionPlan;
  dailyReview: DailyReview;
  activeContext: ContextType;
  currentLocation: DecisionLocation;
  decisionEnergy: number;
  availableMinutes: number;
  dailyCapacityMinutes: number;
  briefingText: string | null;
  isGeneratingBriefing: boolean;
  onGenerateBriefing: () => void;
  onSetActiveContext: (context: ContextType) => void;
  onSetLocation: (location: DecisionLocation) => void;
  onSetEnergy: (energy: number) => void;
  onSetAvailableMinutes: (minutes: number) => void;
  onSetDailyCapacityMinutes: (minutes: number) => void;
  onCompleteTask: (task: Task) => void;
  onPostponeTask: (task: Task) => void;
  onSkipTask: (task: Task) => void;
  onResetSkipped: () => void;
  onOpenTask: (task: Task) => void;
}

const LOCATIONS: DecisionLocation[] = [
  'anywhere',
  'home',
  'company',
  'center',
  'car',
  'forum',
  'church',
  'remote',
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

function contextLabel(context: ContextType): string {
  return context === 'Saude' ? 'Saúde' : context === 'Familia' ? 'Família' : context;
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function FocoSheet({
  isOpen,
  onClose,
  plan,
  dailyReview,
  activeContext,
  currentLocation,
  decisionEnergy,
  availableMinutes,
  dailyCapacityMinutes,
  briefingText,
  isGeneratingBriefing,
  onGenerateBriefing,
  onSetActiveContext,
  onSetLocation,
  onSetEnergy,
  onSetAvailableMinutes,
  onSetDailyCapacityMinutes,
  onCompleteTask,
  onPostponeTask,
  onSkipTask,
  onResetSkipped,
  onOpenTask,
}: FocoSheetProps) {
  const [contextOpen, setContextOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [focusRunning, setFocusRunning] = useState(false);
  const nextAction = plan.nextAction;

  useEffect(() => {
    if (!focusRunning) return undefined;
    const interval = window.setInterval(() => {
      setRemainingSeconds((remaining) => {
        if (remaining <= 1) {
          setFocusRunning(false);
          return 0;
        }
        return remaining - 1;
      });
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [focusRunning]);

  const focusedTask = useMemo(
    () => plan.candidates.find((candidate) => candidate.task.id === focusTaskId)?.task ?? null,
    [focusTaskId, plan.candidates],
  );

  if (!isOpen) return null;

  const startFocus = (task: Task) => {
    const minutes = Math.max(5, Math.min(task.estimated_minutes ?? 25, availableMinutes, 60));
    setFocusTaskId(task.id);
    setRemainingSeconds(minutes * 60);
    setFocusRunning(true);
  };

  const completeFocusedTask = (task: Task) => {
    setFocusTaskId(null);
    setRemainingSeconds(0);
    setFocusRunning(false);
    onCompleteTask(task);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(26,24,20,0.45)]" />
      <div
        className="absolute left-0 right-0 bottom-0 bg-paper rounded-t-3xl shadow-soft animate-sheet-up flex flex-col max-h-[94dvh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-paper3" />
        </div>

        <div className="px-5 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="text-[12px] font-bold tracking-[0.06em] uppercase text-ink-2">
              Decision Engine · V5
            </div>
            <div className="font-display text-[26px] leading-[1.08] text-ink mt-1">
              Sua próxima melhor ação.
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 shrink-0 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-3 space-y-3" style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={() => setContextOpen((open) => !open)}
            className="w-full min-h-11 rounded-xl border border-line bg-paper2 px-3 py-2 flex items-center justify-between gap-3 text-left"
          >
            <span className="min-w-0 text-[12px] text-ink-2 truncate">
              <strong className="text-ink">{availableMinutes} min</strong> · energia {decisionEnergy}/10 · {getDecisionLocationLabel(currentLocation)} · {contextLabel(activeContext)}
            </span>
            <ChevronRight size={15} className={`shrink-0 transition-transform ${contextOpen ? 'rotate-90' : ''}`} />
          </button>

          {contextOpen && (
            <div className="rounded-2xl border border-line bg-paper px-3.5 py-3 space-y-3 animate-fade-in">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2 mb-1.5">Tempo livre agora</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 15, 30, 60].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => onSetAvailableMinutes(minutes)}
                      className={`min-h-10 rounded-xl text-[12px] font-bold ${availableMinutes === minutes ? 'bg-accent text-white' : 'bg-paper2 text-ink'}`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2 mb-1.5">Energia disponível</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: 2, label: 'Baixa' },
                    { value: 5, label: 'Média' },
                    { value: 8, label: 'Alta' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => onSetEnergy(item.value)}
                      className={`min-h-10 rounded-xl text-[12px] font-bold inline-flex items-center justify-center gap-1 ${decisionEnergy === item.value ? 'bg-accent text-white' : 'bg-paper2 text-ink'}`}
                    >
                      <Zap size={12} /> {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">Local</span>
                  <select
                    value={currentLocation}
                    onChange={(event) => onSetLocation(event.target.value as DecisionLocation)}
                    className="min-h-11 rounded-xl bg-paper2 px-3 text-[13px] font-semibold text-ink outline-none"
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>{getDecisionLocationLabel(location)}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">Modo</span>
                  <select
                    value={activeContext}
                    onChange={(event) => onSetActiveContext(event.target.value as ContextType)}
                    className="min-h-11 rounded-xl bg-paper2 px-3 text-[13px] font-semibold text-ink outline-none"
                  >
                    {CONTEXTS_LIST.map((context) => (
                      <option key={context} value={context}>{contextLabel(context)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">Capacidade da missão do dia</span>
                <select
                  value={dailyCapacityMinutes}
                  onChange={(event) => onSetDailyCapacityMinutes(Number(event.target.value))}
                  className="min-h-11 rounded-xl bg-paper2 px-3 text-[13px] font-semibold text-ink outline-none"
                >
                  <option value={60}>1 hora</option>
                  <option value={120}>2 horas</option>
                  <option value={180}>3 horas</option>
                  <option value={240}>4 horas</option>
                  <option value={360}>6 horas</option>
                </select>
              </label>
              <p className="text-[11px] leading-snug text-ink-2">A missão e a próxima ação são recalculadas imediatamente quando este contexto muda.</p>
            </div>
          )}

          {focusedTask && remainingSeconds > 0 && (
            <div className="rounded-2xl bg-accent-subtle border border-accent px-4 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-accent">Sessão de foco</div>
                <div className="text-[13px] font-bold text-ink truncate mt-0.5">{focusedTask.title}</div>
              </div>
              <div className="font-display not-italic text-[24px] text-ink tnum">{formatCountdown(remainingSeconds)}</div>
              <button
                type="button"
                onClick={() => setFocusRunning((running) => !running)}
                className="w-11 h-11 rounded-xl bg-paper flex items-center justify-center text-accent"
                aria-label={focusRunning ? 'Pausar foco' : 'Continuar foco'}
              >
                {focusRunning ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
          )}

          {nextAction ? (
            <div className="bg-ink text-canvas rounded-2xl px-4 py-4 relative overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-canvas/75">Faça agora</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold tnum">
                  prioridade {nextAction.score}/100
                </span>
              </div>
              <button type="button" onClick={() => onOpenTask(nextAction.task)} className="w-full text-left">
                <div className="font-display text-[28px] leading-[1.04] mt-2">{nextAction.task.title}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-canvas/75 tnum">
                  <span className="inline-flex items-center gap-1"><Clock size={11} /> ~{nextAction.estimatedMinutes} min</span>
                  <span>·</span>
                  <span>{contextLabel(nextAction.task.context)}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={11} /> {getDecisionLocationLabel(nextAction.inferredLocation)}</span>
                  {nextAction.task.priority > 0 && <><span>·</span><span className="inline-flex items-center gap-1"><Flag size={10} /> impacto {nextAction.task.priority}/10</span></>}
                </div>
              </button>

              <div className="mt-3 rounded-xl bg-white/10 px-3 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-canvas/60">Por que esta tarefa</div>
                <ul className="mt-1 space-y-1 text-[12px] text-canvas/90">
                  {nextAction.reasons.slice(0, 4).map((reason) => <li key={reason}>• {reason}</li>)}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => focusTaskId === nextAction.task.id && remainingSeconds > 0
                    ? setFocusRunning((running) => !running)
                    : startFocus(nextAction.task)}
                  className="min-h-11 rounded-xl bg-canvas text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1.5"
                >
                  {focusTaskId === nextAction.task.id && focusRunning ? <Pause size={14} /> : <Play size={14} />}
                  {focusTaskId === nextAction.task.id && remainingSeconds > 0 ? (focusRunning ? 'Pausar' : 'Continuar') : 'Iniciar foco'}
                </button>
                <button
                  type="button"
                  onClick={() => completeFocusedTask(nextAction.task)}
                  className="min-h-11 rounded-xl bg-success text-white text-[12px] font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <Check size={14} /> Concluir
                </button>
                <button
                  type="button"
                  onClick={() => onSkipTask(nextAction.task)}
                  className="min-h-11 rounded-xl border border-white/20 bg-white/10 text-canvas text-[12px] font-bold"
                >
                  Agora não
                </button>
                <button
                  type="button"
                  onClick={() => onPostponeTask(nextAction.task)}
                  className="min-h-11 rounded-xl border border-white/20 bg-white/10 text-canvas text-[12px] font-bold"
                >
                  Amanhã
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-paper2 px-4 py-5 text-center">
              <div className="font-display text-[22px] text-ink">Nenhuma tarefa cabe agora.</div>
              <p className="mt-1 text-[12px] text-ink-2">Aumente o tempo disponível, altere o local ou revise dependências.</p>
              {plan.candidates.length > 0 && (
                <button type="button" onClick={onResetSkipped} className="mt-3 min-h-11 rounded-xl bg-paper px-4 text-[12px] font-bold text-accent inline-flex items-center gap-1.5">
                  <RotateCcw size={13} /> Recalcular todas
                </button>
              )}
            </div>
          )}

          <section className="rounded-2xl border border-line bg-paper px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-2">Missão de hoje</div>
                <div className="font-display text-[20px] text-ink mt-0.5">{plan.mission.length} ações · ~{plan.totalMissionMinutes} min</div>
              </div>
              {(plan.deferredCount > 0 || plan.blockedCount > 0) && (
                <span className="text-[11px] text-ink-2 text-right">{plan.deferredCount} fora do contexto<br />{plan.blockedCount} bloqueadas</span>
              )}
            </div>
            <div className="mt-2 space-y-1.5">
              {plan.mission.length === 0 ? (
                <p className="text-[12px] text-ink-2 py-2">Sem missão disponível neste contexto.</p>
              ) : plan.mission.map((candidate, index) => (
                <button
                  type="button"
                  key={candidate.task.id}
                  onClick={() => onOpenTask(candidate.task)}
                  className={`w-full min-h-12 px-3 py-2 bg-paper2 border border-line rounded-xl border-l-4 ${CTX_BAR[candidate.task.context]} flex items-center gap-2.5 text-left`}
                >
                  <span className="w-6 h-6 rounded-full bg-paper flex items-center justify-center text-[11px] font-bold text-ink-2 shrink-0">{index + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-ink truncate">{candidate.task.title}</span>
                    <span className="block text-[11px] text-ink-2 tnum mt-0.5">~{candidate.estimatedMinutes} min · prioridade operacional {candidate.score}</span>
                  </span>
                  <ChevronRight size={14} className="text-ink-2 shrink-0" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onResetSkipped}
              className="mt-2 min-h-10 px-2 text-[11px] font-bold text-accent inline-flex items-center gap-1"
            >
              <RotateCcw size={12} /> Replanejar incluindo ações puladas
            </button>
          </section>

          <section className="rounded-2xl border border-line bg-paper px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-2">Briefing opcional</div>
                <div className="text-[12px] text-ink mt-0.5">A IA apenas narra a ordem determinística.</div>
              </div>
              <button
                type="button"
                onClick={onGenerateBriefing}
                disabled={isGeneratingBriefing || plan.mission.length === 0}
                className="min-h-11 px-3 rounded-xl bg-paper2 text-ink text-[12px] font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Sparkles size={13} /> {isGeneratingBriefing ? 'Gerando…' : 'Gerar'}
              </button>
            </div>
            {briefingText && <p className="mt-2 rounded-xl bg-amber-soft px-3 py-2.5 text-[12px] leading-snug text-ink">“{briefingText}”</p>}
          </section>

          <section className="rounded-2xl border border-line bg-paper px-3.5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-2">Revisão diária</div>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[
                { value: dailyReview.completedToday, label: 'feitas' },
                { value: dailyReview.pendingFromToday, label: 'abertas' },
                { value: dailyReview.closedWithoutExecutionToday, label: 'encerradas' },
                { value: dailyReview.postponedOpen, label: 'adiadas' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-paper2 px-2 py-2 text-center">
                  <div className="font-display not-italic text-[20px] text-ink tnum">{item.value}</div>
                  <div className="text-[10px] text-ink-2">{item.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-ink-2">{dailyReview.summary}</p>
            {dailyReview.tomorrowPreview.length > 0 && (
              <div className="mt-2 rounded-xl bg-paper2 px-3 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">Primeiras ações de amanhã</div>
                {dailyReview.tomorrowPreview.map((candidate, index) => (
                  <div key={candidate.task.id} className="mt-1 text-[12px] text-ink truncate">{index + 1}. {candidate.task.title}</div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
