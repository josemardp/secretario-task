import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onClick = async (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    if (!promptInstall) return;
    await promptInstall.prompt();
    const { outcome } = await promptInstall.userChoice;
    if (outcome === 'accepted') setSupportsPWA(false);
  };

  if (!supportsPWA) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[13px] bg-ink text-canvas"
      title="Instalar aplicativo"
      aria-label="Instalar aplicativo"
    >
      <Download size={14} strokeWidth={2.4} />
      <span className="text-[8px] font-bold leading-none">Instalar</span>
    </button>
  );
}
