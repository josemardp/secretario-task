import { useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { supabase } from '../lib/supabase';
import { parseTaskInput } from '../lib/parser';
import { TaskBoard } from '../components/TaskBoard';
import type { ContextType } from '../types';

export default function Home() {
  const [taskText, setTaskText] = useState('');
  const { tasks, addTask, deleteTask } = useTaskStore();
  const { activeContext, setActiveContext } = useContextStore();

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
      energy: 0,
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
          
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
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
