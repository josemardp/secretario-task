import { useState, useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';

import { supabase } from '../lib/supabase';
import { parseMultipleTasks } from '../lib/smartParser';
import { generateEmbedding, generateSmartBriefing, estimateTaskTime, transcribeAudio } from '../lib/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { Kanban, CalendarDays, BarChart2 } from 'lucide-react';
import { BuildBadge } from '../components/BuildBadge';
import { TaskBoard } from '../components/TaskBoard';
import { TimelineView } from '../components/TimelineView';
import { DashboardView } from '../components/DashboardView';
import { BehavioralSuggestion } from '../components/BehavioralSuggestion';
import { MultiTaskConfirmModal } from '../components/MultiTaskConfirmModal';
import { SettingsModal } from '../components/SettingsModal';
import { InstallPWA } from '../components/InstallPWA';
import { NotificationEngine } from '../components/NotificationEngine';
import { getDailyBriefing } from '../lib/briefing';
import type { ContextType, Task } from '../types';

export default function Home() {
  const [taskText, setTaskText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'dashboard'>('kanban');
  const [semanticResults, setSemanticResults] = useState<{id: string, similarity: number}[] | null>(null);
  
  const [pendingSmartTasks, setPendingSmartTasks] = useState<Partial<Task>[] | null>(null);

  const [smartBriefingText, setSmartBriefingText] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  const { tasks, addTask } = useTaskStore();
  const { activeContext, setActiveContext, currentEnergy, setCurrentEnergy, aiApiKey } = useContextStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleContextCycle = () => {
    const CONTEXTS: ContextType[] = ['PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', 'Saude'];
    const nextIdx = (CONTEXTS.indexOf(activeContext) + 1) % CONTEXTS.length;
    setActiveContext(CONTEXTS[nextIdx]);
  };

  const getHeaderFormattedDate = () => {
    const now = new Date();
    const weekday = now.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const day = now.getDate();
    const month = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return `${weekday}, ${day} ${month}`;
  };
  
  // Audio Recording State
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Trigger transcription when audio blob is ready
  useEffect(() => {
    async function handleTranscription() {
      if (audioBlob && aiApiKey) {
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob, aiApiKey);
          setTaskText((prev) => (prev ? `${prev} ${text}` : text));
        } catch (error) {
          alert('Erro ao transcrever áudio. Tente novamente.');
        } finally {
          setIsTranscribing(false);
          clearAudio();
        }
      } else if (audioBlob && !aiApiKey) {
        alert('Você precisa configurar a chave da OpenAI nas Configurações (⚙️) para usar a digitação por voz Inteligente.');
        clearAudio();
      }
    }
    handleTranscription();
  }, [audioBlob, aiApiKey, clearAudio]);

  const briefingTasks = getDailyBriefing(tasks, currentEnergy, activeContext, 3);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim() || isAddingTask) return;

    setIsAddingTask(true);
    try {
      const parsedTasks = await parseMultipleTasks(taskText, activeContext, aiApiKey);
      setPendingSmartTasks(parsedTasks);
    } catch (error) {
      console.error('Erro ao interpretar tarefa:', error);
      alert('Erro ao processar a tarefa. Tente novamente.');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleConfirmMultiTasks = async (finalTasks: Partial<Task>[]) => {
    try {
      setIsAddingTask(true);
      for (const t of finalTasks) {
        let estimatedTime = 30; // default
        if (aiApiKey) {
          const recentTasks = tasks.filter(x => x.status === 'done' && !x.deleted_at);
          estimatedTime = await estimateTaskTime(t.title || 'Nova Tarefa', recentTasks, aiApiKey);
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
          estimated_minutes: estimatedTime,
          recurrence_rule: t.recurrence_rule || null
        });
      }
      setTaskText('');
      setPendingSmartTasks(null);
    } catch (error) {
      console.error('Erro ao adicionar tarefas:', error);
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
      if (!sessionData.session) throw new Error("Não autenticado");

      const embedding = await generateEmbedding(searchText, aiApiKey);
      const { data, error } = await supabase.rpc('match_tasks', {
        query_embedding: embedding,
        match_threshold: 0.2, // 20% similarity (mais permissivo)
        match_count: 5,
        user_id_param: sessionData.session.user.id
      });

      if (error) throw error;
      setSemanticResults(data || []);
    } catch (err) {
      console.error('Erro na busca semântica:', err);
      alert('Falha na busca semântica. Verifique sua chave da API ou conexão.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchText('');
    setSemanticResults(null);
  };

  const handleGenerateBriefing = async () => {
    if (!aiApiKey) {
      alert("Configure a chave da API (OpenAI) nas configurações primeiro.");
      return;
    }
    
    setIsGeneratingBriefing(true);
    try {
      const text = await generateSmartBriefing(briefingTasks, currentEnergy, aiApiKey);
      setSmartBriefingText(text);
    } catch (err) {
      console.error('Falha ao gerar briefing:', err);
      alert('Falha ao gerar o briefing. Tente novamente mais tarde.');
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  // Filter tasks based on semantic results or normal text
  const displayedTasks = semanticResults 
    ? tasks.filter(t => semanticResults.some(r => r.id === t.id))
    : tasks.filter(t => searchText ? t.title.toLowerCase().includes(searchText.toLowerCase()) : true);

  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ width: '100%', maxWidth: '100vw', overflowX: 'clip' }}>
      <BuildBadge />
      {pendingSmartTasks && (
        <MultiTaskConfirmModal 
          initialTasks={pendingSmartTasks}
          onConfirm={handleConfirmMultiTasks}
          onCancel={() => setPendingSmartTasks(null)}
        />
      )}
      
      <NotificationEngine />
      <header 
        className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-30" 
        style={{ 
          height: 'calc(44px + env(safe-area-inset-top))', 
          paddingTop: 'env(safe-area-inset-top)',
          width: '100%', 
          maxWidth: '100%', 
          boxSizing: 'border-box' 
        }}
      >
        <div className="flex justify-between items-center h-11 px-4 gap-2 w-full max-w-full box-sizing-border-box">
          {/* Esquerda: Chip do contexto ativo */}
          <button 
            onClick={handleContextCycle}
            className="bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-wider min-h-[32px] px-3.5 flex items-center justify-center transition-colors shadow-sm"
            title="Clique para alternar o contexto"
            style={{ minWidth: '44px', minHeight: '44px', margin: '-6px 0' }} // Estende tap target via padding/margin
          >
            {activeContext}
          </button>
          
          {/* Centro: Data formatada */}
          <span className="text-xs text-gray-500 font-semibold capitalize tracking-wide select-none">
            {getHeaderFormattedDate()}
          </span>
          
          {/* Direita: Configurações */}
          <div className="flex items-center gap-1">
            <InstallPWA />
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="text-gray-600 text-lg flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
              title="Configurações"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <main 
        style={{ 
          width: '100%', 
          maxWidth: '100%', 
          overflowX: 'hidden', 
          boxSizing: 'border-box', 
          padding: '24px 16px calc(56px + env(safe-area-inset-bottom) + 52px) 16px' 
        }}
      >
        <div>
          
          <div className="mb-6 flex flex-col gap-3 border-b border-gray-200 pb-4">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {['PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', 'Saude'].map(ctx => (
                <button
                  key={ctx}
                  onClick={() => setActiveContext(ctx as ContextType)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                    activeContext === ctx
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {ctx}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm w-full min-w-0">
              <label htmlFor="energy" className="text-sm font-medium text-gray-700 whitespace-nowrap shrink-0">
                Energia: <span className={currentEnergy >= 7 ? 'text-green-600 font-bold' : currentEnergy <= 3 ? 'text-red-600 font-bold' : 'text-yellow-600 font-bold'}>{currentEnergy}/10</span>
              </label>
              <input
                type="range"
                id="energy"
                min="0"
                max="10"
                value={currentEnergy}
                onChange={(e) => setCurrentEnergy(parseInt(e.target.value, 10))}
                className="flex-1 min-w-0 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          <BehavioralSuggestion tasks={tasks} />

          {briefingTasks.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 shrink-0">
                  <span>🎯</span> Foco do Dia
                </h2>
                <button
                  onClick={handleGenerateBriefing}
                  disabled={isGeneratingBriefing || !aiApiKey}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors shrink-0 ${
                    !aiApiKey
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                  title={!aiApiKey ? "Configure sua API Key primeiro" : "Briefing gerado por IA"}
                >
                  {isGeneratingBriefing ? 'Pensando...' : '✨ Briefing'}
                </button>
              </div>

              {smartBriefingText && (
                <div className="mb-4 bg-purple-50 border border-purple-100 rounded-xl p-4 text-purple-900 text-sm leading-relaxed shadow-sm">
                  <p><strong>Assistente:</strong> {smartBriefingText}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {briefingTasks.map((task, idx) => {
                  const isTop1 = idx === 0;
                  const durationText = task.estimated_minutes ? `${task.estimated_minutes}min` : '30min';
                  const timeText = task.due_at 
                    ? `${new Date(task.due_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${durationText}` 
                    : `Sem horário · ${durationText}`;

                  return (
                    <div 
                      key={task.id} 
                      className={`flex flex-col justify-center w-full shadow-sm rounded-xl overflow-hidden min-w-0 transition-all ${
                        isTop1 
                          ? 'p-4 bg-[#eef2ff] border-l-4 border-l-[#6366f1] min-h-[64px]' 
                          : 'py-[10px] px-4 bg-white border border-[#e5e7eb] min-h-[48px]'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 
                            className={`text-gray-900 truncate tracking-tight ${
                              isTop1 ? 'text-lg font-bold' : 'text-sm font-medium'
                            }`}
                            title={task.title}
                          >
                            <span className="text-indigo-600 font-bold mr-1.5">Top {idx + 1}</span>
                            {task.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 leading-none">
                            {timeText}
                          </p>
                        </div>
                        
                        {task.priority > 0 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 select-none ${
                            task.priority >= 8 
                              ? 'bg-red-50 text-red-600 border border-red-100' 
                              : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                          }`}>
                            P{task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Controle de Abas (Tab Bar Inferior Fixo) */}
          <div 
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 flex select-none" 
            style={{ 
              height: 'calc(56px + env(safe-area-inset-bottom))', 
              paddingBottom: 'env(safe-area-inset-bottom)',
              borderTopWidth: '0.5px'
            }}
          >
            <button
              onClick={() => setViewMode('kanban')}
              className="flex-1 flex flex-col items-center justify-center min-h-[44px] transition-colors gap-1 focus:outline-none"
            >
              <Kanban 
                size={20} 
                color={viewMode === 'kanban' ? '#6366f1' : '#9ca3af'} 
              />
              <span 
                className="text-[10px] font-bold tracking-wide"
                style={{ color: viewMode === 'kanban' ? '#6366f1' : '#9ca3af' }}
              >
                Kanban
              </span>
            </button>
            
            <button
              onClick={() => setViewMode('timeline')}
              className="flex-1 flex flex-col items-center justify-center min-h-[44px] transition-colors gap-1 focus:outline-none"
            >
              <CalendarDays 
                size={20} 
                color={viewMode === 'timeline' ? '#6366f1' : '#9ca3af'} 
              />
              <span 
                className="text-[10px] font-bold tracking-wide"
                style={{ color: viewMode === 'timeline' ? '#6366f1' : '#9ca3af' }}
              >
                Agenda
              </span>
            </button>
            
            <button
              onClick={() => setViewMode('dashboard')}
              className="flex-1 flex flex-col items-center justify-center min-h-[44px] transition-colors gap-1 focus:outline-none"
            >
              <BarChart2 
                size={20} 
                color={viewMode === 'dashboard' ? '#6366f1' : '#9ca3af'} 
              />
              <span 
                className="text-[10px] font-bold tracking-wide"
                style={{ color: viewMode === 'dashboard' ? '#6366f1' : '#9ca3af' }}
              >
                Stats
              </span>
            </button>
          </div>

          {/* Barra de Busca (Apenas Kanban) */}
          {viewMode === 'kanban' && (
            <div className="mb-8 flex flex-col sm:flex-row gap-2">
              <div className="flex flex-1 gap-2 relative">
                <input
                  type="text"
                  className="block w-full rounded-md border-0 py-2.5 px-4 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="Buscar tarefas..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                />
                {searchText && (
                  <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">✕</button>
                )}
              </div>
              <button
                onClick={handleSemanticSearch}
                disabled={isSearching || !searchText.trim() || !aiApiKey}
                title={!aiApiKey ? "Configure sua API Key primeiro na engrenagem" : "Buscar usando IA"}
                className={`rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${
                  !aiApiKey ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500'
                }`}
              >
                {isSearching ? 'Buscando...' : '✨ Busca Inteligente'}
              </button>
            </div>
          )}

          {viewMode === 'kanban' ? (
            <TaskBoard tasks={displayedTasks} />
          ) : viewMode === 'timeline' ? (
            <TimelineView tasks={displayedTasks} />
          ) : (
            <DashboardView tasks={tasks} />
          )}

          {/* Barra de Captura Sticky */}
          <form 
            onSubmit={handleTaskSubmit} 
            className="sticky bg-white border-t border-gray-200 p-3 z-10 flex items-center gap-2 select-none"
            style={{ 
              bottom: 'calc(56px + env(safe-area-inset-bottom))',
              borderTopWidth: '0.5px',
              padding: '8px 16px'
            }}
          >
            {/* Input de Texto */}
            <textarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Nova tarefa..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTaskSubmit(e);
                }
              }}
              disabled={isAddingTask || isTranscribing}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 py-1.5 px-3 text-gray-900 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 text-base resize-none focus:outline-none h-9"
              style={{ fontSize: '16px', height: '36px' }}
              autoFocus
            />

            {/* Digitação por Voz (Microfone) com Wrapper Tap Target */}
            <div className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
              <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isAddingTask || isTranscribing}
                className={`p-2 shrink-0 rounded-lg transition-colors flex items-center justify-center ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-2 ring-red-500 ring-offset-2'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600 ring-1 ring-inset ring-gray-300'
                } disabled:opacity-50 focus:outline-none`}
                style={{ width: '36px', height: '36px' }}
                title="Segure para falar"
              >
                {isRecording ? '🎙️' : '🎤'}
              </button>
            </div>

            {/* Botão Adicionar */}
            <button
              type="submit"
              disabled={isAddingTask || !taskText.trim() || isTranscribing}
              className={`bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center shrink-0 focus:outline-none`}
              style={{ minHeight: '36px', minWidth: '56px', height: '36px' }}
            >
              {isAddingTask ? '...' : 'Add'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
