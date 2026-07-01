import { Search, Settings as SettingsIcon, Target } from 'lucide-react';

interface HeaderActionButtonsProps {
  onOpenFoco: () => void;
  onToggleSearch: () => void;
  onOpenSettings: () => void;
  hasBriefingTasks: boolean;
}

export function HeaderActionButtons({
  onOpenFoco,
  onToggleSearch,
  onOpenSettings,
  hasBriefingTasks,
}: HeaderActionButtonsProps) {
  return (
    <div className="min-w-0 flex items-center gap-2">
      <button
        type="button"
        onClick={onOpenFoco}
        className="relative w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink active:bg-paper3"
        aria-label="Abrir Foco do Dia"
        title="Foco do Dia"
      >
        <Target size={16} strokeWidth={2.2} />
        {hasBriefingTasks && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent border border-paper2" />
        )}
      </button>
      <button
        type="button"
        onClick={onToggleSearch}
        className="w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink-2 active:bg-paper3"
        aria-label="Buscar"
      >
        <Search size={16} />
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        className="w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink-2 active:bg-paper3"
        aria-label="Configurações"
      >
        <SettingsIcon size={16} />
      </button>
    </div>
  );
}
