import React from 'react';
import type { Task, TaskStatus } from '../types';
import { useTaskStore } from '../stores/taskStore';

interface TaskBoardProps {
  tasks: Task[];
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'A Fazer' },
  { id: 'doing', title: 'Em Andamento' },
  { id: 'done', title: 'Concluído' },
];

export function TaskBoard({ tasks }: TaskBoardProps) {
  const { updateTask, deleteTask } = useTaskStore();

  const handleStatusChange = (taskId: string, currentStatus: TaskStatus) => {
    const currentIndex = COLUMNS.findIndex(c => c.id === currentStatus);
    const nextStatus = COLUMNS[currentIndex + 1]?.id;
    if (nextStatus) {
      updateTask(taskId, { status: nextStatus });
    }
  };

  const handleStatusRevert = (taskId: string, currentStatus: TaskStatus) => {
    const currentIndex = COLUMNS.findIndex(c => c.id === currentStatus);
    const prevStatus = COLUMNS[currentIndex - 1]?.id;
    if (prevStatus) {
      updateTask(taskId, { status: prevStatus });
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(column => {
        const columnTasks = tasks.filter(t => t.status === column.id && !t.deleted_at);
        
        return (
          <div key={column.id} className="flex-1 min-w-[300px] bg-gray-50 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{column.title} ({columnTasks.length})</h2>
            <div className="space-y-3">
              {columnTasks.map(task => (
                <div key={task.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                      {task.context}
                    </span>
                    {task.priority > 0 && (
                      <span className={`inline-flex items-center rounded-md px-2 py-1 font-medium ring-1 ring-inset ${
                        task.priority >= 8 ? 'bg-red-50 text-red-700 ring-red-600/10' :
                        task.priority >= 5 ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                        'bg-green-50 text-green-700 ring-green-600/20'
                      }`}>
                        P{task.priority}
                      </span>
                    )}
                    {task.due_at && (
                      <span className="inline-flex items-center text-indigo-600">
                        🗓️ {new Date(task.due_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                  
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
