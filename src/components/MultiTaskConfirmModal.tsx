import { useState } from 'react';
import type { Task } from '../types';

interface MultiTaskConfirmModalProps {
  initialTasks: Partial<Task>[];
  onConfirm: (finalTasks: Partial<Task>[]) => void;
  onCancel: () => void;
}

export function MultiTaskConfirmModal({ initialTasks, onConfirm, onCancel }: MultiTaskConfirmModalProps) {
  const [tasks, setTasks] = useState<Partial<Task>[]>(initialTasks);

  const updateTask = (index: number, updates: Partial<Task>) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], ...updates };
    setTasks(newTasks);
  };

  const removeTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  // Ajuda na formatação para datetime-local input (YYYY-MM-DDThh:mm)
  const formatForInput = (isoString?: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    
    // Convert to local time format for the input
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const parseFromInput = (localString: string) => {
    if (!localString) return undefined;
    const d = new Date(localString);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-full flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-indigo-900">✨ Confirmação Inteligente</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-6">
            A Inteligência Artificial destrinchou seu texto e encontrou {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}. Revise os detalhes antes de salvar:
          </p>

          <div className="space-y-4">
            {tasks.map((task, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative group">
                <button 
                  onClick={() => removeTask(idx)}
                  className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remover esta tarefa"
                >
                  ✕
                </button>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex justify-between items-center">
                      <span>Título da Tarefa</span>
                      {task.recurrence_rule && (
                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1" title={`Regra: ${task.recurrence_rule}`}>
                          🔁 <span className="hidden sm:inline">Recorrente</span>
                        </span>
                      )}
                    </label>
                    <input 
                      type="text" 
                      value={task.title} 
                      onChange={(e) => updateTask(idx, { title: e.target.value })}
                      className="w-full rounded border-gray-300 text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Data e Hora Sugerida</label>
                    <input 
                      type="datetime-local" 
                      value={formatForInput(task.due_at)} 
                      onChange={(e) => updateTask(idx, { due_at: parseFromInput(e.target.value) })}
                      className="w-full rounded border-gray-300 text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
                      <select 
                        value={task.priority}
                        onChange={(e) => updateTask(idx, { priority: Number(e.target.value) })}
                        className="w-full rounded border-gray-300 text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value={0}>Normal (0)</option>
                        <option value={5}>Média (5)</option>
                        <option value={8}>Alta (8)</option>
                        <option value={10}>Urgente (10)</option>
                      </select>
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Contexto</label>
                      <select 
                        value={task.context}
                        onChange={(e) => updateTask(idx, { context: e.target.value as any })}
                        className="w-full rounded border-gray-300 text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="PM">PM</option>
                        <option value="Esdra">Esdra</option>
                        <option value="Pessoal">Pessoal</option>
                        <option value="Familia">Familia</option>
                        <option value="CCB">CCB</option>
                        <option value="Estudo">Estudo</option>
                        <option value="Saude">Saude</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {tasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Todas as tarefas foram removidas. Cancelar a operação?
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(tasks)}
            disabled={tasks.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            Salvar {tasks.length} {tasks.length === 1 ? 'Tarefa' : 'Tarefas'}
          </button>
        </div>
      </div>
    </div>
  );
}
