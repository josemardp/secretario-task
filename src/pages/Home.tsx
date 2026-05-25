import { useState, useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';

import { supabase } from '../lib/supabase';
import { parseMultipleTasks } from '../lib/smartParser';
import { generateEmbedding, generateSmartBriefing, estimateTaskTime, transcribeAudio } from '../lib/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {pendingSmartTasks && (
        <MultiTaskConfirmModal 
          initialTasks={pendingSmartTasks}
          onConfirm={handleConfirmMultiTasks}
          onCancel={() => setPendingSmartTasks(null)}
        />
      )}
      
      <NotificationEngine />
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 truncate max-w-full">SecretárioTask</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <InstallPWA />
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="text-sm text-gray-600 hover:text-gray-900"
              title="Configurações"
            >
              ⚙️
            </button>
            <button 
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {['PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', 'Saude'].map(ctx => (
                <button
                  key={ctx}
                  onClick={() => setActiveContext(ctx as ContextType)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeContext === ctx 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {ctx}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
              <label htmlFor="energy" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Minha Energia: <span className={currentEnergy >= 7 ? 'text-green-600' : currentEnergy <= 3 ? 'text-red-600' : 'text-yellow-600'}>{currentEnergy}/10</span>
              </label>
              <input 
                type="range" 
                id="energy" 
                min="0" 
                max="10" 
                value={currentEnergy} 
                onChange={(e) => setCurrentEnergy(parseInt(e.target.value, 10))}
                className="w-24 sm:w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          <BehavioralSuggestion tasks={tasks} />

          {briefingTasks.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>🎯</span> Foco do Dia
                </h2>
                <button
                  onClick={handleGenerateBriefing}
                  disabled={isGeneratingBriefing || !aiApiKey}
                  className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                    !aiApiKey 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                  title={!aiApiKey ? "Configure sua API Key primeiro" : "Briefing gerado por IA"}
                >
                  {isGeneratingBriefing ? 'Pensando...' : '✨ Briefing Inteligente'}
                </button>
              </div>

              {smartBriefingText && (
                <div className="mb-4 bg-purple-50 border border-purple-100 rounded-xl p-4 text-purple-900 text-sm leading-relaxed shadow-sm">
                  <p><strong>Assistente:</strong> {smartBriefingText}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {briefingTasks.map((task, idx) => (
                  <div key={task.id} className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl shadow-sm border border-indigo-100 flex flex-col justify-between w-full min-w-0 overflow-hidden">
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2 py-1 rounded-full shrink-0">Top {idx + 1}</span>
                        {task.due_at && (
                          <span className="text-xs text-indigo-600 font-medium whitespace-nowrap">
                            {new Date(task.due_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 leading-snug break-words">{task.title}</h3>
                    </div>
                    {task.priority > 0 && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                          Prioridade Alta (P{task.priority})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleTaskSubmit} className="flex gap-2 mb-6">
            <textarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Despeje suas tarefas aqui... (use Enter para pular linha)"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTaskSubmit(e);
                }
              }}
              disabled={isAddingTask || isTranscribing}
              className="w-full rounded-md border-0 py-3 px-3 sm:px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 text-sm sm:leading-6 disabled:opacity-50 resize-none"
              autoFocus
            />
            
            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isAddingTask || isTranscribing}
              className={`p-3 shrink-0 rounded-md transition-colors flex items-center justify-center ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-2 ring-red-500 ring-offset-2' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 ring-1 ring-inset ring-gray-300'
              } disabled:opacity-50`}
              title="Segure para falar"
            >
              {isRecording ? '🎙️' : '🎤'}
            </button>

            <button
              type="submit"
              disabled={isAddingTask || !taskText.trim() || isTranscribing}
              className="bg-indigo-600 text-white px-4 sm:px-6 py-3 shrink-0 rounded-md font-semibold text-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingTask ? 'Add...' : 'Adicionar'}
            </button>
          </form>

          {/* Controle de Abas */}
          <div className="flex border-b border-gray-200 mb-6 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setViewMode('kanban')}
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'kanban' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Quadros (Kanban)
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'timeline' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⏳ Linha do Tempo
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'dashboard' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📈 Estatísticas
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
        </div>
      </main>
    </div>
  );
}
