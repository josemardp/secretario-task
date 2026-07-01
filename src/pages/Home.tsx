import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';

import { supabase } from '../lib/supabase';
import { parseMultipleTasks } from '../lib/smartParser';
import { generateEmbedding, estimateTaskTime, transcribeAudio } from '../lib/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  CalendarDays, BarChart2, Plus, Mic, Search,
  ArrowRight, X, Zap, ClipboardCheck,
} from 'lucide-react';
import { BuildBadge } from '../components/BuildBadge';
import { TimelineView } from '../components/TimelineView';
import { TaskEditModal } from '../components/TaskEditModal';
import { DashboardView } from '../components/DashboardView';
import { WeeklyReview } from '../components/WeeklyReview';
import { MultiTaskConfirmModal } from '../components/MultiTaskConfirmModal';
import { SettingsModal } from '../components/SettingsModal';
import { InstallPWA } from '../components/InstallPWA';
import { HeaderActionButtons } from '../components/HeaderActionButtons';
import { NotificationEngine } from '../components/NotificationEngine';
import { FocoSheet } from '../components/FocoSheet';
import { useToast } from '../components/toastContext';
import { generateBriefingFromTopTasks, getDailyBriefing } from '../lib/briefing';
import { isOpenTask, filterTasksByText, getReviewEligibleTasks } from '../lib/taskFilters';
import type { EstimatedMinutesSource, Task } from '../types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatLongDate(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const day = now.getDate();
  const month = now.toLocaleDateString('pt-BR', { month: 'long' });
  return `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${day} de ${month[0].toUpperCase()}${month.slice(1)}`;
}

export default function Home() {
  const [taskText, setTaskText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'dashboard'>('timeline');
  const [semanticResults, setSemanticResults] = useState<{ id: string; similarity: number }[] | null>(null);
  const [pendingSmartTasks, setPendingSmartTasks] = useState<Partial<Task>[] | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
  const [focoOpen, setFocoOpen] = useState(false);
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [captureBarExpanded, setCaptureBarExpanded] = useState(false);
  const taskInputRef = useRef<HTMLTextAreaElement | null>(null);
  const captureBarRef = useRef<HTMLElement | null>(null);
  const [captureBarHeight, setCaptureBarHeight] = useState(48);
  const toast = useToast();

  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const recordTaskEvent = useTaskStore((s) => s.recordTaskEvent);
  const { activeContext, currentEnergy, setCurrentEnergy, aiApiKey } = useContextStore();

  const isTaskForToday = (dueAt: string | null) => {
    if (!dueAt) return false;
    const due = new Date(dueAt);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return due >= start && due <= end;
  };

  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', `${overlap}px`);
    };

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();

    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
      document.documentElement.style.removeProperty('--kb');
    };
  }, []);

  useEffect(() => {
    if (!captureBarExpanded) return;
    const input = taskInputRef.current;
    if (!input) return;

    const maxHeight = Math.min(window.innerHeight * 0.45, 260);
    input.style.height = 'auto';
    input.style.height = `${Math.max(36, Math.min(input.scrollHeight, maxHeight))}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [taskText, captureBarExpanded]);

  useEffect(() => {
    const captureBar = captureBarRef.current;
    if (!captureBar) return;

    const measure = () => {
      setCaptureBarHeight(Math.ceil(captureBar.getBoundingClientRect().height));
    };

    measure();

    if (!('ResizeObserver' in window)) return;

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(captureBar);

    return () => {
      resizeObserver.disconnect();
    };
  }, [taskText, captureBarExpanded]);

  useEffect(() => {
    if (!captureBarExpanded) return;

    const frame = window.requestAnimationFrame(() => {
      taskInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [captureBarExpanded]);

  useEffect(() => {
    async function handle() {
      if (audioBlob && aiApiKey) {
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob, aiApiKey);
          if (text) {
            setTaskText((prev) => (prev ? `${prev} ${text}` : text));
          } else {
            toast('Não foi possível transcrever o áudio agora.', 'error');
          }
        } finally {
          setIsTranscribing(false);
          clearAudio();
        }
      } else if (audioBlob && !aiApiKey) {
        toast('Configure a chave da OpenAI nas Configurações para usar a voz.', 'error');
        clearAudio();
      }
    }
    handle();
  }, [audioBlob, aiApiKey, clearAudio, toast]);

  const briefingTasks = useMemo(() => {
    return getDailyBriefing(tasks, currentEnergy, activeContext, 3);
  }, [tasks, currentEnergy, activeContext]);

  const todayCount = useMemo(() => {
    return tasks.filter((t) => isOpenTask(t) && isTaskForToday(t.due_at)).length;
  }, [tasks]);

  const reviewEligibleTasks = useMemo(() => {
    return getReviewEligibleTasks(tasks);
  }, [tasks]);

  const handleGenerateBriefing = async () => {
    if (!aiApiKey) {
      toast('Configure a chave da OpenAI nas configurações primeiro.', 'error');
      return;
    }

    setIsGeneratingBriefing(true);
    try {
      const text = await generateBriefingFromTopTasks(briefingTasks, tasks, currentEnergy, aiApiKey);
      setBriefingText(text);
    } catch (err) {
      console.error(err);
      toast('Não foi possível gerar o briefing agora.', 'error');
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim() || isAddingTask) return;
    setIsAddingTask(true);
    try {
      const parsed = await parseMultipleTasks(taskText, activeContext, aiApiKey);
      setPendingSmartTasks(parsed);
    } catch (err) {
      console.error(err);
      toast('Erro ao processar a tarefa. Tente novamente.', 'error');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleConfirmMultiTasks = async (
    finalTasks: Partial<Task>[],
    options: { closeModal?: boolean } = {}
  ) => {
    try {
      setIsAddingTask(true);
      const recent = tasks.filter(x => x.status === 'done' && !x.deleted_at);
      const tasksWithEstimates = await Promise.all(finalTasks.map(async (t) => {
        let estimated = t.estimated_minutes ?? 30;
        let estimatedSource: EstimatedMinutesSource =
          t.estimated_minutes != null
            ? t.estimated_minutes_source ?? 'parser'
            : 'default_30';

        if (aiApiKey && t.estimated_minutes == null) {
          const estimate = await estimateTaskTime(t.title || 'Nova Tarefa', recent, aiApiKey);
          estimated = estimate.minutes;
          estimatedSource = estimate.source;
        }
        return { task: t, estimated, estimatedSource };
      }));

      for (const { task: t, estimated, estimatedSource } of tasksWithEstimates) {
        addTask({
          user_id: '',
          title: t.title || 'Nova Tarefa',
          description: null,
          context: t.context || activeContext,
          priority: t.priority || 0,
          energy: t.energy || 0,
          status: 'todo',
          due_at: t.due_at || null,
          deleted_at: null,
          estimated_minutes: estimated,
          estimated_minutes_source: estimatedSource,
          recurrence_rule: t.recurrence_rule || null,
        });
      }
      setTaskText('');
      setCaptureBarExpanded(false);
      if (options.closeModal !== false) setPendingSmartTasks(null);
      toast(finalTasks.length === 1 ? 'Tarefa adicionada.' : 'Tarefas adicionadas.', 'success');
    } catch (err) {
      console.error(err);
      toast('Erro ao adicionar. Verifique sua conexão.', 'error');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchText.trim()) {
      setSemanticResults(null);
      return;
    }
    if (!aiApiKey) return; // busca local já ativa via useMemo
    setIsSearching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Não autenticado');
      const embedding = await generateEmbedding(searchText, aiApiKey);
      const { data, error } = await supabase.rpc('match_tasks', {
        query_embedding: embedding,
        match_threshold: 0.2,
        match_count: 5,
        user_id_param: sessionData.session.user.id,
      });
      if (error) throw error;
      setSemanticResults(data || []);
    } catch (err) {
      console.error(err);
      toast('Falha na busca. Verifique sua chave da API ou conexão.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => { setSearchText(''); setSemanticResults(null); };

  const handleReviewUpdateTask = (id: string, updates: Partial<Task>) => {
    updateTask(id, updates);

    if (updates.status === 'done') {
      recordTaskEvent(id, 'completed', {
        completed_at: updates.completed_at ?? null,
        source: 'weekly_review',
      });
    } else if (updates.resolution_type && updates.resolution_type !== 'completed') {
      recordTaskEvent(id, 'resolved', {
        resolution_type: updates.resolution_type,
        source: 'weekly_review',
      });
    }
  };

  const baseVisibleTasks = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.deleted_at);
    if (semanticResults) {
      return activeTasks.filter((t) => semanticResults.some((r) => r.id === t.id));
    }
    return filterTasksByText(activeTasks, searchText);
  }, [tasks, semanticResults, searchText]);

  const captureBarVisible = viewMode === 'timeline';
  const setCaptureElementRef = (node: HTMLElement | null) => {
    captureBarRef.current = node;
  };

  const handleCollapseCaptureBar = () => {
    if (isRecording) return;
    setCaptureBarExpanded(false);
  };

  const handleEnergyChange = (value: string) => {
    setCurrentEnergy(parseInt(value, 10));
  };

  const energySliderStyle: CSSProperties & { '--energy-percent': string } = {
    '--energy-percent': `${currentEnergy * 10}%`,
  };

  return (
    <div
      className="min-h-screen bg-canvas font-sans text-ink"
      style={{ width: '100%', maxWidth: '100vw', overflowX: 'clip' }}
    >
      <BuildBadge />
      {pendingSmartTasks && (
        <MultiTaskConfirmModal
          initialTasks={pendingSmartTasks}
          onConfirm={handleConfirmMultiTasks}
          onCancel={() => setPendingSmartTasks(null)}
        />
      )}

      <NotificationEngine />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {isWeeklyReviewOpen && (
        <WeeklyReview
          tasks={reviewEligibleTasks}
          onUpdateTask={handleReviewUpdateTask}
          onClose={() => setIsWeeklyReviewOpen(false)}
        />
      )}
      <FocoSheet
        isOpen={focoOpen}
        onClose={() => setFocoOpen(false)}
        topTasks={briefingTasks}
        briefingText={briefingText}
        isGeneratingBriefing={isGeneratingBriefing}
        onGenerateBriefing={handleGenerateBriefing}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header
        className="bg-paper border-b border-line sticky top-0 z-30 safe-top"
        style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-3 pb-3">
          <div className="min-w-0 flex-1 basis-[130px]">
            <h1 className="font-display text-[22px] leading-[1.1] text-ink truncate">
              {getGreeting()}.
            </h1>
            <p className="mt-1 text-[12px] text-ink-2 tnum leading-snug">
              {formatLongDate()} · {todayCount} para hoje
            </p>
          </div>
          <div className="shrink-0">
            <InstallPWA />
          </div>
          <label className="order-3 flex w-full items-center gap-2 bg-paper border border-line rounded-xl px-2.5 py-2 sm:order-none sm:w-[280px] sm:shrink-0">
            <Zap size={14} className="text-ink-secondary shrink-0" strokeWidth={2.2} />
            <span className="text-[12px] font-semibold text-ink shrink-0">Energia</span>
            <input
              type="range"
              min="0"
              max="10"
              value={currentEnergy}
              onInput={(e) => handleEnergyChange(e.currentTarget.value)}
              onChange={(e) => handleEnergyChange(e.currentTarget.value)}
              className="energy-slider flex-1 min-w-[120px] h-2 rounded-full appearance-none"
              style={energySliderStyle}
            />
            <span className="text-[13px] font-bold tnum text-ink shrink-0">
              {currentEnergy}
              <span className="text-ink-2 font-semibold">/10</span>
            </span>
          </label>
        </div>

        {/* search drawer */}
        {searchOpen && (
          <div className="px-4 pb-3 border-t border-line2 pt-3 animate-fade-in">
            <div className="flex items-center gap-2 bg-paper2 rounded-xl px-3 py-2">
              <Search size={15} className="text-ink-2" />
              <input
                type="text"
                className="flex-1 bg-transparent outline-none text-[14px] text-ink placeholder:text-ink-2"
                placeholder="Buscar tarefas…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                autoFocus
              />
              {searchText && (
                <button onClick={clearSearch} className="text-ink-2 p-1">
                  <X size={14} />
                </button>
              )}
              <button
                onClick={handleSemanticSearch}
                disabled={isSearching || !searchText.trim()}
                title={!aiApiKey ? 'Busca local ativa · configure API Key para busca semântica' : 'Busca semântica'}
                className="ml-1 px-3 py-1 rounded-lg bg-accent text-white text-[12px] font-bold disabled:opacity-50"
              >
                {isSearching ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
        )}

      </header>

      <main
        className="px-4 pt-4"
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          paddingBottom: captureBarVisible
            ? `calc(64px + ${captureBarHeight}px + env(safe-area-inset-bottom))`
            : 'calc(72px + env(safe-area-inset-bottom))',
        }}
      >
        {searchOpen && searchText.trim() ? (
          <div className="flex flex-col gap-2 pb-4">
            {isSearching ? (
              <p className="text-center py-8 text-ink-2 text-[14px]">Buscando…</p>
            ) : baseVisibleTasks.length === 0 ? (
              <p className="text-center py-8 text-ink-2 text-[14px]">
                Nenhum resultado para{' '}
                <span className="text-ink font-semibold">«{searchText}»</span>
              </p>
            ) : (
              <>
                <p className="text-[12px] text-ink-2 font-semibold pb-1">
                  {baseVisibleTasks.length} resultado{baseVisibleTasks.length !== 1 ? 's' : ''}
                  {semanticResults ? ' · busca semântica' : ' · busca local'}
                </p>
                {baseVisibleTasks.map((t) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditingTask(t)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingTask(t);
                      }
                    }}
                    className="bg-paper rounded-xl px-4 py-3 border border-line cursor-pointer hover:bg-paper2 transition-colors"
                  >
                    <div className="text-[14px] font-semibold text-ink leading-tight">{t.title}</div>
                    {t.description && (
                      <div className="text-[12px] text-ink-2 mt-0.5 line-clamp-2">{t.description}</div>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-ink-2 mt-1 tnum">
                      <span>
                        {t.context === 'Saude' ? 'Saúde' : t.context === 'Familia' ? 'Família' : t.context}
                      </span>
                      {t.due_at && (
                        <>
                          <span>·</span>
                          <span>
                            {new Date(t.due_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            {' '}
                            {new Date(t.due_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                      {t.status === 'done' && (
                        <><span>·</span><span className="text-success font-medium">Concluída</span></>
                      )}
                      {t.resolution_type && t.resolution_type !== 'completed' && (
                        <><span>·</span><span className="font-medium">{
                          t.resolution_type === 'cancelled' ? 'Cancelada' :
                          t.resolution_type === 'delegated' ? 'Delegada' : 'Obsoleta'
                        }</span></>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : viewMode === 'timeline' ? (
          <TimelineView
            tasks={baseVisibleTasks}
            onOpenFoco={() => setFocoOpen(true)}
            onToggleSearch={() => setSearchOpen((v) => !v)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            hasBriefingTasks={briefingTasks.length > 0}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-paper border border-line rounded-2xl p-3">
              <HeaderActionButtons
                onOpenFoco={() => setFocoOpen(true)}
                onToggleSearch={() => setSearchOpen((v) => !v)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                hasBriefingTasks={briefingTasks.length > 0}
              />
            </div>
            {reviewEligibleTasks.length > 0 && (
              <button
                type="button"
                onClick={() => setIsWeeklyReviewOpen(true)}
                className="min-h-11 rounded-xl border border-line bg-paper px-4 py-2.5 flex items-center justify-between gap-3 text-left active:bg-paper2"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-paper2 flex items-center justify-center text-accent shrink-0">
                    <ClipboardCheck size={16} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-ink">Revisão semanal</span>
                    <span className="block text-[12px] text-ink-2 truncate">
                      {reviewEligibleTasks.length} tarefas sem motivo
                    </span>
                  </span>
                </span>
                <ArrowRight size={15} className="text-ink-2 shrink-0" />
              </button>
            )}
            <DashboardView tasks={tasks} />
          </div>
        )}
      </main>
      {editingTask && (
        <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}

      {/* ── Capture bar ──────────────────────────────────────────── */}
      {captureBarVisible && !captureBarExpanded && (
        <button
          ref={setCaptureElementRef}
          type="button"
          onClick={() => setCaptureBarExpanded(true)}
          className="fixed right-4 z-40 w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg select-none active:scale-95 transition-transform"
          style={{
            bottom: 'calc(var(--kb, 0px) + 72px + env(safe-area-inset-bottom))',
          }}
          aria-label="Abrir captura de tarefa"
          title="Nova tarefa"
        >
          <Plus size={22} strokeWidth={2.4} />
        </button>
      )}
      {captureBarVisible && captureBarExpanded && (
        <form
          ref={setCaptureElementRef}
          onSubmit={handleTaskSubmit}
          className="fixed left-0 right-0 z-40 bg-paper border-t border-line px-3 flex items-end gap-2 select-none"
          style={{
            bottom: 'calc(var(--kb, 0px) + 64px + env(safe-area-inset-bottom))',
            paddingTop: 8, paddingBottom: 8,
          }}
        >
          <Plus size={18} className="text-ink-2 shrink-0 ml-1 mb-3" />
          <textarea
            ref={taskInputRef}
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="Nova tarefa..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={isAddingTask || isTranscribing}
            className="flex-1 min-w-0 bg-transparent text-[14px] leading-5 text-ink placeholder:text-ink-2 outline-none resize-none min-h-11 py-2.5"
            style={{ fontSize: 16 }}
          />
          <button
            type="button"
            onClick={handleCollapseCaptureBar}
            disabled={isRecording || isAddingTask || isTranscribing}
            className="w-11 h-11 rounded-xl bg-paper2 text-ink flex items-center justify-center transition-colors shrink-0 disabled:opacity-40"
            aria-label="Fechar captura"
            title="Fechar"
          >
            <X size={16} />
          </button>
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isAddingTask || isTranscribing}
            className={
              'w-11 h-11 rounded-xl flex items-center justify-center transition-colors shrink-0 ' +
              (isRecording ? 'bg-danger text-white animate-pulse' : 'bg-paper2 text-ink')
            }
            title="Segure para falar"
          >
            <Mic size={16} />
          </button>
          <button
            type="submit"
            disabled={isAddingTask || !taskText.trim() || isTranscribing}
            className="w-11 h-11 rounded-xl bg-accent text-white text-[12px] font-bold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 shrink-0"
            aria-label="Adicionar tarefa"
          >
            {isAddingTask ? '...' : (<ArrowRight size={14} strokeWidth={2.4} />)}
          </button>
        </form>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-paper border-t border-line z-50 flex select-none safe-bottom"
        style={{ height: 'calc(56px + env(safe-area-inset-bottom))' }}
      >
        {([
          { id: 'timeline',  label: 'Agenda', icon: CalendarDays },
          { id: 'dashboard', label: 'Painel',  icon: BarChart2 },
        ] as const).map((it) => {
          const on = viewMode === it.id;
          return (
            <button
              key={it.id}
              onClick={() => {
                setViewMode(it.id);
                if (it.id !== 'timeline') setCaptureBarExpanded(false);
              }}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative focus:outline-none"
            >
              <it.icon size={20} strokeWidth={on ? 2.2 : 1.7} className={on ? 'text-accent' : 'text-ink-tertiary'} />
              <span className={(on ? 'text-accent font-bold' : 'text-ink-tertiary font-semibold') + ' text-[12px] tracking-wide'}>
                {it.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
