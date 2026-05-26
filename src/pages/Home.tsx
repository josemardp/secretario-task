import { useState, useEffect, useMemo } from 'react';
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
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { BuildBadge } from '../components/BuildBadge';
import { TaskBoard } from '../components/TaskBoard';
import { TimelineView } from '../components/TimelineView';
import { DashboardView } from '../components/DashboardView';
import { BehavioralSuggestion } from '../components/BehavioralSuggestion';
import { MultiTaskConfirmModal } from '../components/MultiTaskConfirmModal';
import { SettingsModal } from '../components/SettingsModal';
import { InstallPWA } from '../components/InstallPWA';
import { NotificationEngine } from '../components/NotificationEngine';
import { FocoSheet } from '../components/FocoSheet';
import { getDailyBriefing } from '../lib/briefing';
import type { Task } from '../types';

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
  const [overSlotId, setOverSlotId] = useState<string | null>(null);
  const [dragStartTime, setDragStartTime] = useState<Date | null>(null);
  const [focoOpen, setFocoOpen] = useState(false);

  const { tasks, addTask, updateTask } = useTaskStore();
  const { activeContext, currentEnergy, setCurrentEnergy, aiApiKey } = useContextStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);
    if (overId.startsWith('slot-')) {
      const slotIso = overId.replace('slot-', '');
      updateTask(taskId, { due_at: slotIso });
    }
  };

  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    async function handle() {
      if (audioBlob && aiApiKey) {
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob, aiApiKey);
          setTaskText((prev) => (prev ? `${prev} ${text}` : text));
        } catch {
          alert('Erro ao transcrever áudio. Tente novamente.');
        } finally {
          setIsTranscribing(false);
          clearAudio();
        }
      } else if (audioBlob && !aiApiKey) {
        alert('Configure a chave da OpenAI nas Configurações (⚙️) para usar a voz.');
        clearAudio();
      }
    }
    handle();
  }, [audioBlob, aiApiKey, clearAudio]);

  const briefingTasks = useMemo(
    () => getDailyBriefing(tasks, currentEnergy, activeContext, 3),
    [tasks, currentEnergy, activeContext]
  );

  const todayCount = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    return tasks.filter(t =>
      !t.deleted_at &&
      t.status !== 'done' &&
      t.due_at && new Date(t.due_at) >= start && new Date(t.due_at) <= end
    ).length;
  }, [tasks]);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim() || isAddingTask) return;
    setIsAddingTask(true);
    try {
      const parsed = await parseMultipleTasks(taskText, activeContext, aiApiKey);
      setPendingSmartTasks(parsed);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar a tarefa. Tente novamente.');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleConfirmMultiTasks = async (finalTasks: Partial<Task>[]) => {
    try {
      setIsAddingTask(true);
      for (const t of finalTasks) {
        let estimated = 30;
        if (aiApiKey) {
          const recent = tasks.filter(x => x.status === 'done' && !x.deleted_at);
          estimated = await estimateTaskTime(t.title || 'Nova Tarefa', recent, aiApiKey);
        }
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
          recurrence_rule: t.recurrence_rule || null,
        });
      }
      setTaskText('');
      setPendingSmartTasks(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao adicionar. Verifique sua conexão.');
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
      alert('Falha na busca. Verifique sua chave da API ou conexão.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => { setSearchText(''); setSemanticResults(null); };

  const displayedTasks = semanticResults
    ? tasks.filter(t => semanticResults.some(r => r.id === t.id))
    : tasks.filter(t => searchText ? t.title.toLowerCase().includes(searchText.toLowerCase()) : true);

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
        onStartTop1={(t) => {
          updateTask(t.id, { status: 'doing', started_at: new Date().toISOString() });
          setFocoOpen(false);
        }}
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
            <p className="mt-1 text-[11px] text-ink-2 truncate tnum">
              {formatLongDate()} · {todayCount} para hoje
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <InstallPWA />
            <button
              onClick={() => setFocoOpen(true)}
              className="relative w-9 h-9 rounded-xl bg-paper2 flex items-center justify-center text-ink active:bg-paper3"
              aria-label="Abrir Foco do Dia"
              title="Foco do Dia"
            >
              <Target size={16} strokeWidth={2.2} />
              {briefingTasks.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-warning border border-paper2" />
              )}
            </button>
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="w-9 h-9 rounded-xl bg-paper2 flex items-center justify-center text-ink-2 active:bg-paper3"
              aria-label="Buscar"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-9 h-9 rounded-xl bg-paper2 flex items-center justify-center text-ink-2 active:bg-paper3"
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
              <Search size={15} className="text-ink-3" />
              <input
                type="text"
                className="flex-1 bg-transparent outline-none text-[14px] text-ink placeholder:text-ink-3"
                placeholder="Buscar tarefas…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                autoFocus
              />
              {searchText && (
                <button onClick={clearSearch} className="text-ink-3 p-1">
                  <X size={14} />
                </button>
              )}
              <button
                onClick={handleSemanticSearch}
                disabled={isSearching || !searchText.trim() || !aiApiKey}
                title={!aiApiKey ? 'Configure sua API Key primeiro' : 'Buscar com IA'}
                className="ml-1 px-3 py-1 rounded-lg bg-ink text-white text-[11px] font-extrabold disabled:opacity-50"
              >
                {isSearching ? '…' : '✨ IA'}
              </button>
            </div>
          </div>
        )}

        {/* energy strip */}
        <div className="px-4 pb-3">
          <label className="flex items-center gap-3 bg-paper border border-line rounded-xl px-3 py-2">
            <Zap size={14} className="text-warning shrink-0" strokeWidth={2.2} />
            <span className="text-[12px] font-bold text-ink shrink-0">Energia</span>
            <input
              type="range"
              min="0"
              max="10"
              value={currentEnergy}
              onChange={(e) => setCurrentEnergy(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-paper2 rounded-full appearance-none accent-ink"
            />
            <span className="text-[13px] font-extrabold tnum text-ink shrink-0">
              {currentEnergy}
              <span className="text-ink-3 font-semibold">/10</span>
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
          paddingBottom: 'calc(56px + 56px + env(safe-area-inset-bottom))',
        }}
      >
        <BehavioralSuggestion tasks={tasks} />

        {viewMode === 'kanban' ? (
          <TaskBoard tasks={displayedTasks} />
        ) : viewMode === 'timeline' ? (
          <DndContext
            sensors={sensors}
            onDragStart={() => setDragStartTime(new Date())}
            onDragOver={({ over }) => setOverSlotId(over?.id ? String(over.id) : null)}
            onDragEnd={(event) => {
              handleDragEnd(event);
              setOverSlotId(null);
              setDragStartTime(null);
            }}
            onDragCancel={() => {
              setOverSlotId(null);
              setDragStartTime(null);
            }}
          >
            <TimelineView tasks={displayedTasks} overSlotId={overSlotId} dragStartTime={dragStartTime} />
          </DndContext>
        ) : (
          <DashboardView tasks={tasks} />
        )}
      </main>

      {/* ── Capture bar ──────────────────────────────────────────── */}
      <form
        onSubmit={handleTaskSubmit}
        className="fixed left-0 right-0 z-10 bg-paper border-t border-line px-3 flex items-center gap-2 select-none"
        style={{
          bottom: 'calc(64px + env(safe-area-inset-bottom))',
          paddingTop: 8, paddingBottom: 8,
        }}
      >
        <Plus size={18} className="text-ink-3 shrink-0 ml-1" />
        <textarea
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="Nova tarefa…"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleTaskSubmit(e as any);
            }
          }}
          disabled={isAddingTask || isTranscribing}
          className="flex-1 min-w-0 bg-transparent text-[14px] text-ink placeholder:text-ink-3 outline-none resize-none h-9 py-1.5"
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
            'w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ' +
            (isRecording ? 'bg-danger text-white animate-pulse' : 'bg-paper2 text-ink')
          }
          title="Segure para falar"
        >
          <Mic size={16} />
        </button>
        <button
          type="submit"
          disabled={isAddingTask || !taskText.trim() || isTranscribing}
          className="h-9 px-4 rounded-xl bg-ink text-white text-[12px] font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          {isAddingTask ? '…' : (<><ArrowRight size={14} strokeWidth={2.4} /></>)}
        </button>
      </form>

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-paper border-t border-line z-20 flex select-none safe-bottom"
        style={{ height: 'calc(56px + env(safe-area-inset-bottom))' }}
      >
        {([
          { id: 'kanban',    label: 'Hoje',   icon: CheckCircle },
          { id: 'timeline',  label: 'Agenda', icon: CalendarDays },
          { id: 'dashboard', label: 'Stats',  icon: BarChart2 },
        ] as const).map((it) => {
          const on = viewMode === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setViewMode(it.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative focus:outline-none"
            >
              <it.icon size={20} strokeWidth={on ? 2.2 : 1.7} className={on ? 'text-ink' : 'text-ink-3'} />
              <span className={(on ? 'text-ink font-extrabold' : 'text-ink-3 font-semibold') + ' text-[10px] tracking-wide'}>
                {it.label}
              </span>
              {on && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-ink rounded-full" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
