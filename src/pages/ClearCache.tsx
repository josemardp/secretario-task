import { useState } from 'react';

export default function ClearCache() {
  const [status, setStatus] = useState<'idle' | 'clearing' | 'done'>('idle');

  const handleClear = async () => {
    setStatus('clearing');
    try {
      // Desregistrar todos os Service Workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      // Limpar todos os caches do Workbox
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      // Limpar localStorage e sessionStorage
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.error('[ClearCache] Erro ao limpar:', err);
    }
    setStatus('done');
    // Redirecionar para o início após 1s
    setTimeout(() => {
      window.location.replace('/');
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gap-6 bg-canvas">
      <div className="text-center">
        <h1 className="text-xl font-bold text-ink mb-2">Limpar Cache do App</h1>
        <p className="text-sm text-ink-2 text-center max-w-xs">
          Desregistra o Service Worker, limpa todos os caches e recarrega o app do zero.
          Use se o app estiver travado ou com tela branca.
        </p>
      </div>

      {status === 'idle' && (
        <button
          onClick={handleClear}
          className="bg-danger text-white px-6 py-3 rounded-2xl text-sm font-bold w-full max-w-xs"
        >
          Limpar tudo e recarregar
        </button>
      )}

      {status === 'clearing' && (
        <p className="text-sm text-ink-2">Limpando...</p>
      )}

      {status === 'done' && (
        <p className="text-sm text-ink-2">Pronto! Redirecionando...</p>
      )}

      <a href="/" className="text-xs text-ink-2 underline">
        Voltar sem limpar
      </a>
    </div>
  );
}
