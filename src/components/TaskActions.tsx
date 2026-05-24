import React, { useRef } from 'react';

interface TaskActionsProps {
  onComplete: () => void;
  onPostponeTomorrow: () => void;
  onPostponeDate: (dateString: string) => void;
  showComplete?: boolean;
}

export function TaskActions({ 
  onComplete, 
  onPostponeTomorrow, 
  onPostponeDate,
  showComplete = true 
}: TaskActionsProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-2 items-center flex-wrap">
      {showComplete && (
        <button
          onClick={onComplete}
          className="text-xs font-medium px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors flex items-center gap-1"
          title="Marcar como concluído"
        >
          ✅ Concluir
        </button>
      )}
      
      <button
        onClick={onPostponeTomorrow}
        className="text-xs font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
        title="Adiar para amanhã"
      >
        ➡️ Amanhã
      </button>
      
      <div className="relative">
        <button
          onClick={() => dateInputRef.current?.showPicker?.()}
          className="text-xs font-medium px-2 py-1 rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors flex items-center gap-1"
          title="Escolher outra data"
        >
          📅 Adiar
        </button>
        <input
          ref={dateInputRef}
          type="date"
          className="absolute opacity-0 w-0 h-0 p-0 m-0 border-0"
          onChange={(e) => {
            if (e.target.value) {
              onPostponeDate(e.target.value);
            }
          }}
        />
      </div>
    </div>
  );
}
