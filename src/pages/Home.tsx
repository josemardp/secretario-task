import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';

import { supabase } from '../lib/supabase';
import { parseMultipleTasks } from '../lib/smartParser';
import { generateEmbedding, estimateTaskTime, transcribeAudio } from '../lib/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  CheckCircle, CalendarDays, BarChart2, Target, Plus, Mic, Search,
  Settings as SettingsIcon, ArrowRight, X, Zap,
} from 'lucide-react';
import { BuildBadge } from '../components/BuildBadge';
import { TaskBoard } from '../components/TaskBoard';
import { TimelineView } from '../components/TimelineView';
import { DashboardView } from '../components/DashboardView';
import { MultiTaskConfirmModal } from '../components/MultiTaskConfirmModal';
import { SettingsModal } from '../components/SettingsModal';
import { InstallPWA } from '../components/InstallPWA';
import { NotificationEngine } from '../components/NotificationEngine';
import { FocoSheet } from '../components/FocoSheet';
import { useToast } from '../components/toastContext';
import { generateBriefingFromTopTasks, getDailyBriefing } from '../lib/briefing';
import { isOpenTask } from '../lib/taskFilters';
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
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'dashboard'>('kanban');
  const [semanticResults, setSemanticResults] = useState<{ id: string; similarity: number }[] | null>(null);
  const [pendingSmartTasks, setPendingSmartTasks] = useState<Partial<Task>[] | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focoOpen, setFocoOpen] = useState(false);
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const taskInputRef = useRef<HTMLTextAreaElement | null>(null);
  const captureBarRef = useRef<HTMLFormElement | null>(null);
  const [captureBarHeight, setCaptureBarHeight] = useState(56);
  const toast = useToast();

  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
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
    const input = taskInputRef.current;
    if (!input) return;

    const maxHeight = Math.min(window.innerHeight * 0.45, 260);
    input.style.height = 'auto';
    input.style.height = `${Math.max(36, Math.min(input.scrollHeight, maxHeight))}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';

    const captureBar = captureBarRef.current;
    if (captureBar) {
      setCaptureBarHeight(Math.ceil(captureBar.getBoundingClientRect().height));
    }
  }, [taskText]);

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
      if (parsed.length === 1) {
        await handleConfirmMultiTasks(parsed, { closeModal: false });
      } else {
        setPendingSmartTasks(parsed);
      }
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
    if (!searchText.trim() || !aiApiKey) {
      setSemanticResults(null);
      return;
    }
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

  const baseVisibleTasks = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.deleted_at);
    if (semanticResults) {
      return activeTasks.filter((t) => semanticResults.some((r) => r.id === t.id));
    }
    if (!searchText) return activeTasks;
    return activeTasks.filter((t) => t.title.toLowerCase().includes(searchText.toLowerCase()));
  }, [tasks, semanticResults, searchText]);

  const tasksForTodayView = useMemo(
    () => baseVisibleTasks.filter((t) => isTaskForToday(t.due_at)),
    [baseVisibleTasks]
  );
  const captureBarVisible = viewMode === 'kanban' || viewMode === 'timeline';
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
        <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[22px] leading-[1.1] text-ink truncate">
              {getGreeting()}.
            </h1>
            <p className="mt-1 text-[12px] text-ink-2 truncate tnum">
              {formatLongDate()} · {todayCount} para hoje
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <InstallPWA />
            <button
              onClick={() => setFocoOpen(true)}
              className="relative w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink active:bg-paper3"
              aria-label="Abrir Foco do Dia"
              title="Foco do Dia"
            >
              <Target size={16} strokeWidth={2.2} />
              {briefingTasks.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent border border-paper2" />
              )}
            </button>
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink-2 active:bg-paper3"
              aria-label="Buscar"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink-2 active:bg-paper3"
              aria-label="Configurações"
            >
              <SettingsIcon size={16} />
            </button>
          </div>
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
                disabled={isSearching || !searchText.trim() || !aiApiKey}
                title={!aiApiKey ? 'Configure sua API Key primeiro' : 'Busca avançada'}
                className="ml-1 px-3 py-1 rounded-lg bg-accent text-white text-[12px] font-bold disabled:opacity-50"
              >
                {isSearching ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
        )}

        {/* energy strip */}
        <div className="px-4 pb-3">
          <label className="flex items-center gap-3 bg-paper border border-line rounded-xl px-3 py-2">
            <Zap size={14} className="text-ink-secondary shrink-0" strokeWidth={2.2} />
            <span className="text-[12px] font-semibold text-ink shrink-0">Energia</span>
            <input
              type="range"
              min="0"
              max="10"
              value={currentEnergy}
              onChange={(e) => setCurrentEnergy(parseInt(e.target.value, 10))}
              className="energy-slider flex-1 h-1.5 rounded-full appearance-none"
              style={energySliderStyle}
            />
            <span className="text-[13px] font-bold tnum text-ink shrink-0">
              {currentEnergy}
              <span className="text-ink-2 font-semibold">/10</span>
            </span>
          </label>
        </div>
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
        {viewMode === 'kanban' ? (
          <TaskBoard tasks={tasksForTodayView} topTasks={briefingTasks} />
        ) : viewMode === 'timeline' ? (
          <TimelineView tasks={baseVisibleTasks} />
        ) : (
          <DashboardView tasks={tasks} />
        )}
      </main>

      {/* ── Capture bar ──────────────────────────────────────────── */}
      {captureBarVisible && (
        <form
          ref={captureBarRef}
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
          { id: 'kanban',    label: 'Hoje',   icon: CheckCircle },
          { id: 'timeline',  label: 'Agenda', icon: CalendarDays },
          { id: 'dashboard', label: 'Painel',  icon: BarChart2 },
        ] as const).map((it) => {
          const on = viewMode === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setViewMode(it.id)}
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
