import { useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { supabase } from '../lib/supabase';
import type { ContextType } from '../types';

export default function Home() {
  const [taskText, setTaskText] = useState('');
  const { tasks, addTask } = useTaskStore();
  const { activeContext } = useContextStore();

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;

    // A simple parsing logic can be added later. For MVP, we use default values.
    addTask({
      user_id: '', // Will be updated on sync or handled via Supabase defaults if possible, but better to get from authStore later.
      title: taskText,
      description: null,
      context: activeContext,
      priority: 0,
      energy: 0,
      status: 'todo',
      due_at: null,
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

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Tarefas ({tasks.filter(t => !t.deleted_at).length})</h2>
            <ul className="divide-y divide-gray-200">
              {tasks.filter(t => !t.deleted_at).map(task => (
                <li key={task.id} className="py-4">
                  <div className="flex space-x-3">
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-500">Contexto: {task.context}</p>
                    </div>
                  </div>
                </li>
              ))}
              {tasks.filter(t => !t.deleted_at).length === 0 && (
                <p className="text-sm text-gray-500">Nenhuma tarefa encontrada.</p>
              )}
            </ul>
          </div>
          
        </div>
      </main>
    </div>
  );
}
