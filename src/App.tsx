import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './stores/authStore';
import { NetworkStatus } from './components/NetworkStatus';
import { fetchRemoteTasks, processSyncQueue, fetchProfileFromCloud, pushContextToCloud } from './lib/sync';
import { useContextStore } from './stores/contextStore';
import { useTaskStore } from './stores/taskStore';
import { useNetwork } from './hooks/useNetwork';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Login from './pages/Login';
import Home from './pages/Home';
import ClearCache from './pages/ClearCache';
import { ErrorBoundary } from './components/ErrorBoundary';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center px-4">Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { setSession, setUser, setIsLoading, session } = useAuthStore();
  const { isOnline } = useNetwork();

  // Bug 3: ref para o canal Realtime, permitindo verificar o estado
  // e recriar a subscrição quando o canal cair em background (mobile).
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Timeout de segurança: se getSession demorar mais de 8s (rede lenta/celular),
    // libera a tela para evitar tela branca infinita.
    const timeout = setTimeout(() => {
      console.warn('[auth] getSession timeout — liberando tela');
      setIsLoading(false);
    }, 8000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error('[auth] getSession falhou:', err);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [setSession, setUser, setIsLoading]);

  useEffect(() => {
    if (!session || !isOnline) return;

    const runSync = (mode: 'full' | 'delta') => {
      void fetchProfileFromCloud()
        .catch((err) => console.error('[sync] fetchProfileFromCloud falhou:', err));

      return fetchRemoteTasks(mode)
        .then(() => processSyncQueue())
        .catch((err) => console.error('[sync] ciclo de tasks falhou:', err));
    };

    // Primeiro ciclo carrega a janela inteira; os seguintes só o que mudou.
    runSync('full');
    const interval = setInterval(() => runSync('delta'), 120_000);
    return () => clearInterval(interval);
  }, [session, isOnline]);

  // Push imediato ao enfileirar mutation.
  //
  // Antes disso, a fila só subia em três momentos: cold start, tick de 120s e
  // volta ao foreground. No celular o uso real é "abrir o app, cadastrar a
  // tarefa, bloquear a tela em poucos segundos" — e o tick de 120s nunca chega,
  // porque o sistema congela os timers da aba assim que ela vai para o
  // background. A tarefa ficava viva só no localStorage, invisível para os
  // outros devices, e sem nenhum sinal na tela: `fetchRemoteTasks` mantém a
  // tarefa com mutation pendente no store, então ela parece salva e
  // sincronizada. No PC o mesmo código funcionava porque a aba fica aberta e em
  // foco por minutos, e o tick roda várias vezes — daí a sincronização parecer
  // funcionar num sentido e não no outro.
  useEffect(() => {
    if (!session || !isOnline) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useTaskStore.subscribe((state, prev) => {
      // Só quando a fila cresce. Remoção e incremento de retryCount são efeitos
      // do próprio processSyncQueue; reagir a eles criaria laço de sync.
      if (state.mutations.length <= prev.mutations.length) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      // Debounce curto coalesce a captura de várias tarefas de uma vez só
      // (o modal salva em loop) num único push.
      debounceTimer = setTimeout(() => {
        processSyncQueue().catch((err) => console.error('[sync] push imediato falhou:', err));
      }, 800);
    });

    return () => {
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [session, isOnline]);

  useEffect(() => {
    if (!session) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useContextStore.subscribe((state, prev) => {
      if (!prev || state.activeContext === prev.activeContext) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const { activeContext, contextUpdatedAt } = useContextStore.getState();
        pushContextToCloud(activeContext, contextUpdatedAt ?? new Date().toISOString())
          .catch((err) => console.error('[sync] pushContextToCloud falhou:', err));
      }, 800);
    });

    return () => {
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [session]);

  // Bug 3: função extraída para criar/recriar o canal Realtime.
  // Reutilizada tanto na montagem inicial quanto na reconexão após queda.
  const subscribeRealtime = (userId: string) => {
    // Remove canal anterior se existir
    if (realtimeChannelRef.current) {
      void supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const channel = supabase
      .channel('tasks-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
      () => {
        fetchRemoteTasks('delta').catch((err) => console.error('[sync] realtime falhou:', err));
      }
    )
    // Bug 3 (ajuste): a API correta do Supabase JS v2 para detectar quedas de canal
    // é o callback de status passado diretamente ao .subscribe(), não .on('system', ...).
    // Os estados terminais são 'CLOSED', 'CHANNEL_ERROR' e 'TIMED_OUT'.
    .subscribe((status) => {
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[sync] Realtime canal '${status}' — reagendando reconexão`);
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            subscribeRealtime(userId);
          }
          // Se o app estiver em background, o visibilitychange reconecta ao voltar
        }, 2000);
      }
    });

    realtimeChannelRef.current = channel;
    return channel;
  };

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !isOnline) return;

    subscribeRealtime(userId);

    return () => {
      if (realtimeChannelRef.current) {
        void supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, isOnline]);

  // Bug 3: ao voltar do background (visibilitychange), além de fazer o pull
  // dos dados, verifica se o canal Realtime ainda está ativo. Se estiver
  // 'closed' ou 'errored', recria a subscrição.
  useEffect(() => {
    if (!session || !isOnline) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        // Saindo para o background: última janela de execução antes de o
        // sistema congelar a aba. Tenta subir o que ainda estiver na fila —
        // best-effort, porque a aba pode morrer no meio. Se morrer, a mutation
        // continua no localStorage e sobe na próxima abertura.
        processSyncQueue().catch((err) => console.error('[sync] flush ao sair falhou:', err));
        return;
      }

      // Pull imediato ao voltar ao foreground. Completo, não delta: enquanto o
      // app esteve em background outro device pode ter excluído tarefas, e
      // delta nunca remove nada do store.
      fetchRemoteTasks('full')
        .then(() => processSyncQueue())
        .catch((err) => console.error('[sync] visibilitychange falhou:', err));

      // Reconecta o Realtime se o canal tiver caído
      const userId = session.user.id;
      const channelState = realtimeChannelRef.current?.state;
      if (channelState === 'closed' || channelState === 'errored' || !realtimeChannelRef.current) {
        console.warn(`[sync] Realtime em estado '${channelState}' — reconectando`);
        subscribeRealtime(userId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isOnline]);

  return (
    <BrowserRouter>
      <NetworkStatus />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/clear-cache" element={<ClearCache />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Home />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
