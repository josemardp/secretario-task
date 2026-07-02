import { useState, useEffect, useMemo, useRef } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';

import { supabase } from '../lib/supabase';
import { parseMultipleTasks } from '../lib/smartParser';
import { generateEmbedding, estimateTaskTime, transcribeAudio } from '../lib/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  Plus, Mic, Search,
  ArrowRight, X, ClipboardCheck, Target,
} from 'lucide-react';
import { TimelineView } from '../components/TimelineView';
import { TaskEditModal } from '../components/TaskEditModal';
import { DashboardView } from '../components/DashboardView';
import { WeeklyReview } from '../components/WeeklyReview';
import { MultiTaskConfirmModal } from '../components/MultiTaskConfirmModal';
import { SettingsModal } from '../components/SettingsModal';
import { InstallPWA } from '../components/InstallPWA';
import { CalendarWidget } from '../components/CalendarWidget';
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
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
  const monthButtonRef = useRef<HTMLButtonElement | null>(null);
  const [captureBarHeight, setCaptureBarHeight] = useState(0);
  const toast = useToast();

  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const recordTaskEvent = useTaskStore((s) => s.recordTaskEvent);
  const { activeContext, aiApiKey } = useContextStore();

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
    return getDailyBriefing(tasks, activeContext, 3);
  }, [tasks, activeContext]);

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
      const text = await generateBriefingFromTopTasks(briefingTasks, tasks, aiApiKey);
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

  const captureBarVisible = true;
  const setCaptureElementRef = (node: HTMLElement | null) => {
    captureBarRef.current = node;
  };

  return (
    <div
      className="min-h-screen bg-canvas font-sans text-ink"
      style={{ width: '100%', maxWidth: '100vw', overflowX: 'clip' }}
    >
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
        className="bg-canvas sticky top-0 z-30 safe-top"
        style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
      >
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1 flex flex-col gap-2">
              <h1 className="truncate text-center font-display text-[29px] leading-[1.05] text-ink">
                {getGreeting()}
              </h1>
              <p className="min-w-0 truncate text-center text-[13px] text-ink-2 tnum leading-snug">
                {formatLongDate()}
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                <InstallPWA />
                <button
                  ref={monthButtonRef}
                  type="button"
                  onClick={() => setIsCalendarOpen((v) => !v)}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[13px] border border-line bg-paper px-3.5 text-[13px] font-bold text-ink active:bg-paper2"
                >
                  <span className="text-[15px] leading-none">📅</span> M{'\u00EA'}s
                </button>
              </div>
              <span className="text-[13px] font-bold text-accent tnum">
                {todayCount} para hoje
              </span>
            </div>
          </div>

          {searchOpen && (
            <div className="mt-3 animate-fade-in">
              <div className="flex h-10 items-center gap-2 rounded-[13px] border border-line bg-paper px-3">
                <Search size={15} className="text-ink-2 shrink-0" />
                <input
                  type="text"
                  className="min-w-0 flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-ink-2"
                  placeholder="Buscar tarefas..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                  autoFocus
                />
                {searchText && (
                  <button type="button" onClick={clearSearch} className="text-ink-2 p-1">
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSemanticSearch}
                  disabled={isSearching || !searchText.trim()}
                  title={!aiApiKey ? 'Busca local ativa - configure API Key para busca semantica' : 'Busca semantica'}
                  className="h-7 rounded-[9px] bg-accent px-2.5 text-[12px] font-bold text-white disabled:opacity-50"
                >
                  {isSearching ? '...' : 'Buscar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {isCalendarOpen && (
          <CalendarWidget
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onClose={() => setIsCalendarOpen(false)}
            tasks={baseVisibleTasks}
            anchorRef={monthButtonRef}
          />
        )}
      </header>

      <main
        className="px-4 pt-3"
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          paddingBottom: captureBarExpanded
            ? `calc(70px + ${captureBarHeight}px + env(safe-area-inset-bottom))`
            : 'calc(86px + env(safe-area-inset-bottom))',
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
            selectedDate={selectedDate}
          />
        ) : (
          <div className="flex flex-col gap-3">
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
            <DashboardView tasks={tasks} onOpenSettings={() => setIsSettingsOpen(true)} />
          </div>
        )}
      </main>
      {editingTask && (
        <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}

      {/* ── Capture bar ──────────────────────────────────────────── */}
      {captureBarVisible && captureBarExpanded && (
        <form
          ref={setCaptureElementRef}
          onSubmit={handleTaskSubmit}
          className="fixed left-0 right-0 z-40 bg-paper border-t border-line rounded-t-[22px] px-4 py-3 flex items-end gap-2.5 select-none shadow-[0_-16px_32px_-8px_rgba(0,0,0,0.28)]"
          style={{
            bottom: 'calc(var(--kb, 0px) + 70px + env(safe-area-inset-bottom))',
          }}
        >
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
            className="flex-1 min-w-0 rounded-[14px] border border-line bg-canvas px-3.5 text-[14px] leading-5 text-ink placeholder:text-ink-2 outline-none resize-none min-h-11 py-2.5"
            style={{ fontSize: 16 }}
          />
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isAddingTask || isTranscribing}
            className={
              'w-11 h-11 rounded-[14px] border border-line flex items-center justify-center transition-colors shrink-0 ' +
              (isRecording ? 'bg-danger text-white animate-pulse border-danger' : 'bg-canvas text-ink')
            }
            title="Segure para falar"
          >
            <Mic size={16} />
          </button>
          <button
            type="submit"
            disabled={isAddingTask || !taskText.trim() || isTranscribing}
            className="w-11 h-11 rounded-[14px] bg-accent text-white text-[12px] font-bold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 shrink-0"
            aria-label="Adicionar tarefa"
          >
            {isAddingTask ? '...' : (<ArrowRight size={14} strokeWidth={2.4} />)}
          </button>
        </form>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-paper border-t border-line z-50 flex select-none safe-bottom"
        style={{ height: 'calc(70px + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => {
            setViewMode('timeline');
            setCaptureBarExpanded(false);
          }}
          className="flex-1 flex flex-col items-center justify-center gap-1 pb-1 relative focus:outline-none"
        >
          <span className="text-[19px] leading-none">📅</span>
          <span className={(viewMode === 'timeline' ? 'text-accent font-extrabold' : 'text-ink-tertiary font-bold') + ' text-[11px]'}>
            Agenda
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setFocoOpen(true);
            setCaptureBarExpanded(false);
          }}
          className="flex-1 flex flex-col items-center justify-center gap-1 pb-1 relative focus:outline-none"
          aria-label="Abrir Foco do Dia"
        >
          <Target size={19} strokeWidth={focoOpen ? 2.2 : 1.8} className={focoOpen ? 'text-accent' : 'text-ink-tertiary'} />
          {briefingTasks.length > 0 && (
            <span className="absolute left-1/2 top-[15px] h-2 w-2 translate-x-[12px] rounded-full border border-paper bg-accent" />
          )}
          <span className={(focoOpen ? 'text-accent font-extrabold' : 'text-ink-tertiary font-bold') + ' text-[11px]'}>
            Foco
          </span>
        </button>
        <div className="w-[76px] shrink-0" />
        <button
          type="button"
          onClick={() => {
            setSearchOpen((v) => !v);
            setCaptureBarExpanded(false);
          }}
          className="flex-1 flex flex-col items-center justify-center gap-1 pb-1 relative focus:outline-none"
          aria-label="Buscar tarefas"
        >
          <span className="text-[19px] leading-none">🔍</span>
          <span className={(searchOpen ? 'text-accent font-extrabold' : 'text-ink-tertiary font-bold') + ' text-[11px]'}>
            Busca
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode('dashboard');
            setCaptureBarExpanded(false);
          }}
          className="flex-1 flex flex-col items-center justify-center gap-1 pb-1 relative focus:outline-none"
        >
          <span className="text-[19px] leading-none">📊</span>
          <span className={(viewMode === 'dashboard' ? 'text-accent font-extrabold' : 'text-ink-tertiary font-bold') + ' text-[11px]'}>
            Painel
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (isRecording) return;
            setCaptureBarExpanded((v) => !v);
          }}
          className="absolute left-1/2 top-[-26px] flex h-[58px] w-[58px] -translate-x-1/2 items-center justify-center rounded-full border-[5px] border-canvas bg-accent text-white shadow-[0_10px_22px_-4px_rgba(0,0,0,0.4)] active:scale-95 transition-transform"
          aria-label={captureBarExpanded ? 'Fechar captura de tarefa' : 'Abrir captura de tarefa'}
          title="Nova tarefa"
        >
          <Plus size={24} strokeWidth={2.4} />
        </button>
      </nav>
    </div>
  );
}
