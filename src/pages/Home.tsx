import { useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { supabase } from '../lib/supabase';
import { parseTaskInput } from '../lib/parser';
import { TaskBoard } from '../components/TaskBoard';
import { getDailyBriefing } from '../lib/briefing';
import type { ContextType } from '../types';

export default function Home() {
  const [taskText, setTaskText] = useState('');
  const { tasks, addTask, deleteTask } = useTaskStore();
  const { activeContext, setActiveContext, currentEnergy, setCurrentEnergy } = useContextStore();

  const briefingTasks = getDailyBriefing(tasks, currentEnergy, activeContext, 3);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;

    const parsedData = parseTaskInput(taskText, activeContext);

    addTask({
      user_id: '', // Set on sync or later
      title: parsedData.title || 'Nova Tarefa',
      description: null,
      context: parsedData.context || activeContext,
      priority: parsedData.priority || 0,
      energy: parsedData.energy || 0,
      status: 'todo',
      due_at: parsedData.due_at || null,
      deleted_at: null,
    });
    
    setTaskText('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">SecretárioTask</h1>
          <button 
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sair
          </button>
        </div>
      </header>
      
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
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>🎯</span> Foco do Dia
              </h2>
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

          <form onSubmit={handleAddTask} className="mb-8">
            <label htmlFor="task" className="sr-only">Nova Tarefa</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="task"
                id="task"
                className="block w-full rounded-md border-0 py-2.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Adicionar tarefa rápida..."
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
              />
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Adicionar
              </button>
            </div>
          </form>

            <TaskBoard tasks={tasks} />
        </div>
      </main>
    </div>
  );
}
