import { useEffect } from 'react';
import type { Task, TaskStatus } from '../types';
import { CONTEXTS_LIST } from '../types';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { calculateTaskScore } from '../lib/ranking';
import { TaskActions } from './TaskActions';

interface TaskBoardProps {
  tasks: Task[];
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'A Fazer' },
  { id: 'doing', title: 'Em Andamento' },
  { id: 'done', title: 'Concluído' },
];

export function TaskBoard({ tasks }: TaskBoardProps) {
  const { updateTask, deleteTask, recordViewEvent } = useTaskStore();
  const { currentEnergy, activeContext } = useContextStore();

  useEffect(() => {
    // Record view events for all active tasks
    tasks.filter(t => !t.deleted_at).forEach(task => {
      recordViewEvent(task.id);
    });
  }, [tasks, recordViewEvent]);

  const handleStatusChange = (taskId: string, currentStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    const currentIndex = COLUMNS.findIndex(c => c.id === currentStatus);
    const nextStatus = COLUMNS[currentIndex + 1]?.id;
    if (nextStatus) {
      const updates: Partial<Task> = { status: nextStatus };
      
      if (nextStatus === 'doing') {
        updates.started_at = new Date().toISOString();
      } else if (nextStatus === 'done' && task?.started_at) {
        const start = new Date(task.started_at).getTime();
        const end = new Date().getTime();
        const diffMinutes = Math.round((end - start) / 60000);
        updates.actual_minutes = diffMinutes;
      }
      
      updateTask(taskId, updates);
    }
  };

  const handleStatusRevert = (taskId: string, currentStatus: TaskStatus) => {
    const currentIndex = COLUMNS.findIndex(c => c.id === currentStatus);
    const prevStatus = COLUMNS[currentIndex - 1]?.id;
    if (prevStatus) {
      updateTask(taskId, { status: prevStatus });
    }
  };

  const handlePostponeTomorrow = (taskId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    updateTask(taskId, { due_at: tomorrow.toISOString() });
  };

  const handlePostponeDate = (taskId: string, dateString: string) => {
    // dateString vem no formato "YYYY-MM-DD"
    const selected = new Date(dateString + 'T23:59:59');
    updateTask(taskId, { due_at: selected.toISOString() });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(column => {
        // Obter as tarefas não excluídas desta coluna
        const columnTasks = tasks.filter(t => t.status === column.id && !t.deleted_at);
        
        // Calcular o score e anexar temporariamente para ordenação e exibição
        const tasksWithScore = columnTasks.map(task => ({
          ...task,
          score: calculateTaskScore(task, currentEnergy, activeContext)
        }));

        // Ordenar pela maior nota
        tasksWithScore.sort((a, b) => b.score - a.score);
        
        return (
          <div key={column.id} className="flex-1 min-w-[300px] bg-gray-50 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{column.title} ({columnTasks.length})</h2>
            <div className="space-y-3">
              {tasksWithScore.map(task => (
                <div key={task.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      {task.recurrence_rule && <span title="Tarefa Recorrente" className="text-indigo-500 text-xs">🔁</span>}
                      {task.title}
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-800" title="Score do Ranking">
                      ★ {task.score.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                    <select
                      value={task.context}
                      onChange={(e) => updateTask(task.id, { context: e.target.value as any })}
                      className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 cursor-pointer outline-none border-0 focus:ring-2 focus:ring-indigo-600 appearance-none text-center min-w-[70px]"
                      title="Clique para alterar o contexto"
                    >
                      {CONTEXTS_LIST.map((ctx) => (
                        <option key={ctx} value={ctx}>{ctx}</option>
                      ))}
                    </select>
                    {task.priority > 0 && (
                      <span className={`inline-flex items-center rounded-md px-2 py-1 font-medium ring-1 ring-inset ${
                        task.priority >= 8 ? 'bg-red-50 text-red-700 ring-red-600/10' :
                        task.priority >= 5 ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                        'bg-green-50 text-green-700 ring-green-600/20'
                      }`}>
                        P{task.priority}
                      </span>
                    )}
                    <div className="inline-flex items-center text-indigo-600 text-xs mt-1 sm:mt-0">
                      🗓️ 
                      <input 
                        type="datetime-local" 
                        value={task.due_at ? new Date(new Date(task.due_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateTask(task.id, { due_at: val ? new Date(val).toISOString() : null });
                        }}
                        className="ml-1 bg-transparent border-none p-0 cursor-pointer text-indigo-600 focus:ring-0 w-32 sm:w-auto"
                        title="Alterar data/hora"
                      />
                    </div>
                  </div>

                  {/* Controle de Tempo (Sprint 9) */}
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">⏳ Tempo:</span>
                      <span className="font-bold text-gray-700">
                        {task.actual_minutes !== undefined && task.actual_minutes !== null 
                          ? `${task.actual_minutes}m (real)` 
                          : `${task.estimated_minutes || '?'}m (est)`}
                      </span>
                    </div>
                    {task.status !== 'done' && (
                      <div className="flex gap-1">
                        <button 
                          onClick={() => updateTask(task.id, { estimated_minutes: Math.max(5, (task.estimated_minutes || 30) - 15) })}
                          className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-100"
                        >
                          -15m
                        </button>
                        <button 
                          onClick={() => updateTask(task.id, { estimated_minutes: (task.estimated_minutes || 30) + 15 })}
                          className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-100"
                        >
                          +15m
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {column.id !== 'done' && (
                    <div className="mb-3 pt-2 border-t border-gray-100">
                      <TaskActions 
                        showComplete={true}
                        onComplete={() => handleStatusChange(task.id, 'done')}
                        onPostponeTomorrow={() => handlePostponeTomorrow(task.id)}
                        onPostponeDate={(dateString) => handlePostponeDate(task.id, dateString)}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
                    <div className="flex gap-2">
                      {column.id !== 'todo' && (
                        <button 
                          onClick={() => handleStatusRevert(task.id, task.status)}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          ← Voltar
                        </button>
                      )}
                      {column.id !== 'done' && (
                        <button 
                          onClick={() => handleStatusChange(task.id, task.status)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Avançar →
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
              
              {columnTasks.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-md">
                  Vazio
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
