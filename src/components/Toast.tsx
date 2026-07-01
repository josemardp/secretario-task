import { useCallback, useState, type ReactNode } from 'react';
import { ToastCtx, type ToastTone } from './toastContext';

type Toast = { id: number; msg: string; tone: ToastTone };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((msg: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, msg, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        className="fixed left-0 right-0 z-[10000] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ bottom: 'calc(var(--kb, 0px) + 128px + env(safe-area-inset-bottom))' }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              'max-w-sm w-full rounded-xl px-3.5 py-2.5 text-[13px] font-semibold shadow-soft animate-fade-in ' +
              (toast.tone === 'error'
                ? 'bg-danger text-white'
                : toast.tone === 'success'
                  ? 'bg-success text-white'
                  : 'bg-ink text-canvas')
            }
          >
            {toast.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
