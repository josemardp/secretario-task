import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Task } from '../types';
import { isOpenTask } from '../lib/taskFilters';

interface CalendarWidgetProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  tasks: Task[];
  anchorRef?: RefObject<HTMLElement | null>;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Mar\u00E7o', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function CalendarWidget({
  selectedDate,
  onSelectDate,
  onClose,
  tasks,
  anchorRef,
}: CalendarWidgetProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [anchorRef, onClose]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = currentMonth.getDay();

  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const daysWithTasks = useMemo(() => {
    const set = new Set<number>();
    tasks
      .filter((t) => isOpenTask(t) && t.due_at)
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
    const els: ReactNode[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      els.push(<div key={`empty-${i}`} className="aspect-square" />);
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
          type="button"
          onClick={() => {
            onSelectDate(dateObj);
            onClose();
          }}
          className={[
            'aspect-square rounded-[9px] flex items-center justify-center relative transition-colors tnum text-[12px] font-bold',
            isSelected
              ? 'bg-accent text-white'
              : isToday
                ? 'bg-canvas text-ink ring-1 ring-line'
                : 'text-ink hover:bg-canvas',
          ].join(' ')}
        >
          {i}
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

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 right-0 top-full z-50 mt-2 rounded-[20px] border border-line bg-paper p-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.35)] animate-fade-in"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 rounded-[11px] bg-canvas border border-line flex items-center justify-center text-ink-2"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">
            Calend\u00E1rio
          </div>
          <div className="text-[14px] font-extrabold text-ink leading-tight">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={nextMonth}
            className="w-9 h-9 rounded-[11px] bg-canvas border border-line flex items-center justify-center text-ink-2"
            aria-label="Proximo mes"
          >
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-[11px] bg-canvas border border-line flex items-center justify-center text-ink-2"
            aria-label="Fechar calendario"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-ink-2 tracking-[0.06em]">
        {WEEK.map((d, i) => <div key={i}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 py-2">
        {renderDays()}
      </div>

      <button
        type="button"
        onClick={() => {
          onSelectDate(new Date());
          onClose();
        }}
        className="mt-1 h-10 w-full rounded-[13px] bg-canvas border border-line text-[12px] font-bold text-ink"
      >
        Hoje
      </button>
    </div>
  );
}
