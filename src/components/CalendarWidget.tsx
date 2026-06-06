import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Task } from '../types';

interface CalendarWidgetProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  tasks: Task[];
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function CalendarWidget({ selectedDate, onSelectDate, onClose, tasks }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = currentMonth.getDay();

  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const daysWithTasks = useMemo(() => {
    const set = new Set<number>();
    tasks
      .filter((t) => t.status === 'todo' && !t.deleted_at && t.due_at)
      .forEach((task) => {
        const due = new Date(task.due_at!);
        if (
          due.getFullYear() === currentMonth.getFullYear() &&
          due.getMonth() === currentMonth.getMonth()
        ) {
          set.add(due.getDate());
        }
      });
    return set;
  }, [tasks, currentMonth]);

  const today = new Date();

  const renderDays = () => {
    const els: React.ReactNode[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      els.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const isSelected =
        i === selectedDate.getDate() &&
        currentMonth.getMonth() === selectedDate.getMonth() &&
        currentMonth.getFullYear() === selectedDate.getFullYear();
      const isToday =
        i === today.getDate() &&
        currentMonth.getMonth() === today.getMonth() &&
        currentMonth.getFullYear() === today.getFullYear();
      const hasTask = daysWithTasks.has(i);

      els.push(
        <button
          key={i}
          onClick={() => {
            onSelectDate(dateObj);
            onClose();
          }}
          className={[
            'h-10 w-10 rounded-xl flex items-center justify-center relative transition-colors tnum',
            isSelected
              ? 'bg-ink text-white font-extrabold'
              : isToday
                ? 'bg-paper2 text-ink font-extrabold ring-1 ring-line'
                : 'text-ink hover:bg-paper2',
          ].join(' ')}
        >
          <span className="text-[13px]">{i}</span>
          {hasTask && (
            <span
              className={
                'absolute bottom-1.5 w-1 h-1 rounded-full ' +
                (isSelected ? 'bg-white' : 'bg-warning')
              }
            />
          )}
        </button>
      );
    }
    return els;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[rgba(26,24,20,0.45)] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-paper w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl shadow-soft animate-sheet-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-paper3 mb-2 mt-2" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <button
            onClick={prevMonth}
            className="w-9 h-9 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink-3">
              Calendário
            </div>
            <div className="font-display text-[18px] text-ink leading-tight tracking-[-0.02em]">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
          </div>
          <button
            onClick={nextMonth}
            className="w-9 h-9 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* week labels */}
        <div className="grid grid-cols-7 gap-1 px-4 text-center text-[10px] font-extrabold text-ink-3 tracking-[0.06em]">
          {WEEK.map((d, i) => <div key={i}>{d}</div>)}
        </div>

        {/* days */}
        <div className="grid grid-cols-7 gap-1 px-4 py-2 justify-items-center">
          {renderDays()}
        </div>

        {/* footer */}
        <div className="px-4 pt-2 pb-3 border-t border-line2 flex items-center gap-2">
          <button
            onClick={() => {
              onSelectDate(new Date());
              onClose();
            }}
            className="flex-1 h-10 rounded-xl bg-paper2 text-[12px] font-extrabold text-ink"
          >
            Hoje
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
