import { useState, useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { supabase } from '../lib/supabase';
import { parseTaskInput } from '../lib/parser';
import { generateEmbedding, generateSmartBriefing, estimateTaskTime, transcribeAudio } from '../lib/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { TaskBoard } from '../components/TaskBoard';
import { TimelineView } from '../components/TimelineView';
import { DashboardView } from '../components/DashboardView';
import { SettingsModal } from '../components/SettingsModal';
import { InstallPWA } from '../components/InstallPWA';
import { NotificationEngine } from '../components/NotificationEngine';
import { getDailyBriefing } from '../lib/briefing';
import type { ContextType } from '../types';

export default function Home() {
  const [taskText, setTaskText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'dashboard'>('kanban');
  const [semanticResults, setSemanticResults] = useState<{id: string, similarity: number}[] | null>(null);

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
    if (!taskText.trim()) return;

    setIsAddingTask(true);
    
    try {
      const parsed = parseTaskInput(taskText, activeContext);
      let estimatedTime = 30; // default
      
      if (aiApiKey) {
        // Estima o tempo baseado na IA e no histórico
        const recentTasks = tasks.filter(t => t.status === 'done' && !t.deleted_at);
        estimatedTime = await estimateTaskTime(parsed.title || 'Nova Tarefa', recentTasks, aiApiKey);
      }
      
      addTask({
        user_id: '',
        title: parsed.title || 'Nova Tarefa',
        description: null,
        context: parsed.context || activeContext,
        priority: parsed.priority || 0,
        energy: parsed.energy || 0,
        status: 'todo',
        due_at: parsed.due_at || null,
        deleted_at: null,
        estimated_minutes: estimatedTime
      });
      
      setTaskText('');
    } catch (err) {
      console.error("Erro ao adicionar tarefa:", err);
      alert("Falha ao adicionar a tarefa.");
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
    <div className="min-h-screen bg-gray-100">
      <NotificationEngine />
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">SecretárioTask</h1>
          <div className="flex items-center gap-4">
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

          {briefingTasks.length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
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
                  <div key={task.id} className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl shadow-sm border border-indigo-100 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2 py-1 rounded-full">Top {idx + 1}</span>
                        {task.due_at && (
                          <span className="text-xs text-indigo-600 font-medium">
                            {new Date(task.due_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 leading-snug">{task.title}</h3>
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
            <input
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder={isTranscribing ? "Transcrevendo voz..." : "ex: Amanhã apresentação pro Esdra urgência alta"}
              disabled={isAddingTask || isTranscribing}
              className="flex-1 rounded-md border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50"
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
              className={`p-3 rounded-md transition-colors flex items-center justify-center ${
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
              className="bg-indigo-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingTask ? 'Adicionando...' : 'Adicionar'}
            </button>
          </form>

          {/* Controle de Abas */}
          <div className="flex border-b border-gray-200 mb-6">
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
            <div className="mb-8 flex gap-2">
              <input
                type="text"
                className="block w-full rounded-md border-0 py-2.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Buscar tarefas (texto ou semântica)..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
              />
              {searchText && (
                <button onClick={clearSearch} className="px-3 py-2 text-gray-500 hover:text-gray-700">✕</button>
              )}
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
