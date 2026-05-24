import { useState, useMemo } from 'react';
import type { Task } from '../types';

interface CalendarWidgetProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  tasks: Task[];
}

export function CalendarWidget({ selectedDate, onSelectDate, onClose, tasks }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = currentMonth.getDay(); // 0 = Sunday, 1 = Monday, ...

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Identificar quais dias do mês atual possuem tarefas agendadas (due_at)
  const daysWithTasks = useMemo(() => {
    const activeTasks = tasks.filter(t => t.status === 'todo' && !t.deleted_at && t.due_at);
    const daySet = new Set<number>();
    
    activeTasks.forEach(task => {
      const due = new Date(task.due_at!);
      if (
        due.getFullYear() === currentMonth.getFullYear() &&
        due.getMonth() === currentMonth.getMonth()
      ) {
        daySet.add(due.getDate());
      }
    });
    
    return daySet;
  }, [tasks, currentMonth]);

  const renderDays = () => {
    const days = [];
    const today = new Date();

    // Empty slots for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const isSelected = 
        i === selectedDate.getDate() && 
        currentMonth.getMonth() === selectedDate.getMonth() && 
        currentMonth.getFullYear() === selectedDate.getFullYear();
        
      const isToday = 
        i === today.getDate() && 
        currentMonth.getMonth() === today.getMonth() && 
        currentMonth.getFullYear() === today.getFullYear();
        
      const hasTask = daysWithTasks.has(i);

      days.push(
        <button
          key={i}
          onClick={() => {
            onSelectDate(dateStr);
            onClose();
          }}
          className={`h-10 w-10 rounded-full flex flex-col items-center justify-center relative transition-colors ${
            isSelected 
              ? 'bg-indigo-600 text-white font-bold' 
              : isToday
                ? 'bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100'
                : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span>{i}</span>
          {hasTask && !isSelected && (
            <span className="absolute bottom-1 w-1 h-1 bg-pink-500 rounded-full"></span>
          )}
          {hasTask && isSelected && (
            <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></span>
          )}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
            &larr;
          </button>
          <h2 className="text-lg font-bold text-gray-800">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
            &rarr;
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 p-4 pb-2 text-center text-xs font-semibold text-gray-400">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 p-4 pt-0 justify-items-center">
          {renderDays()}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
          <button 
            onClick={() => {
              onSelectDate(new Date());
              onClose();
            }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Ir para Hoje
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
