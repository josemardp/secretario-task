import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './stores/authStore';
import { NetworkStatus } from './components/NetworkStatus';
import { fetchRemoteTasks, processSyncQueue, fetchApiKeyFromCloud } from './lib/sync';
import { useContextStore } from './stores/contextStore';
import { useNetwork } from './hooks/useNetwork';
import Login from './pages/Login';
import Home from './pages/Home';

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setIsLoading]);

  useEffect(() => {
    if (!session || !isOnline) return;

    const runSync = () =>
      fetchRemoteTasks()
        .then(() => processSyncQueue())
        .catch((err) => console.error('[sync] ciclo falhou:', err));

    fetchApiKeyFromCloud()
      .then(key => {
        if (key) useContextStore.getState().setAiApiKey(key);
      })
      .catch((err) => console.error('[sync] falha ao carregar API key:', err));

    runSync();
    const interval = setInterval(runSync, 30000);
    return () => clearInterval(interval);
  }, [session, isOnline]);

  // Pull imediato ao voltar ao foco (mobile: WebSocket cai em background)
  useEffect(() => {
    if (!session || !isOnline) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRemoteTasks()
          .then(() => processSyncQueue())
          .catch((err) => console.error('[sync] visibilitychange falhou:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, isOnline]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !isOnline) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        () => {
          fetchRemoteTasks().catch((err) => console.error('[sync] realtime falhou:', err));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user.id, isOnline]);

  return (
    <BrowserRouter>
      <NetworkStatus />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
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