import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { activateDemoMode, isDemoMode } from '../lib/demoData';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('demo') === 'true' || window.location.hash.includes('demo') || isDemoMode()) {
      activateDemoMode();
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleEnterDemo = () => {
    activateDemoMode();
    navigate('/', { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError(error.message);
    else navigate('/');

    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Preencha e-mail e senha para criar a conta.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) setError(error.message);
    else setNotice('Conta criada. Você já pode entrar.');

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-canvas flex flex-col justify-center px-5 safe-top safe-bottom font-sans text-ink"
      style={{ width: '100%', maxWidth: '100vw' }}
    >
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2">
            SecretárioTask
          </div>
          <h1 className="font-display text-[34px] leading-[1.05] text-ink mt-1">
            Seu chefe de gabinete.
          </h1>
          <p className="text-[13px] text-ink-2 mt-2 leading-snug">
            Entre para ver o que importa hoje, em que ordem.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="h-12 bg-paper border border-line rounded-xl px-3.5 text-[16px] text-ink outline-none placeholder:text-ink-2 focus:border-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 bg-paper border border-line rounded-xl px-3.5 text-[16px] text-ink outline-none placeholder:text-ink-2 focus:border-ink"
            />
          </label>

          {error && (
            <p className="text-[12px] font-semibold text-danger leading-snug">{error}</p>
          )}
          {notice && (
            <p className="text-[12px] font-semibold text-success leading-snug">{notice}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 mt-1 rounded-xl bg-ink text-canvas text-[14px] font-bold disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            className="h-12 rounded-xl bg-paper2 text-ink text-[14px] font-bold disabled:opacity-50"
          >
            Criar conta
          </button>

          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <span className="relative bg-canvas px-3 text-[11px] uppercase tracking-wider text-ink-2 font-medium">
              Avaliadores & Recrutadores
            </span>
          </div>

          <button
            type="button"
            onClick={handleEnterDemo}
            className="h-12 rounded-xl border border-line bg-paper text-ink text-[14px] font-bold hover:bg-paper2 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            ✨ Acessar Modo Demonstração (Sem Cadastro)
          </button>
        </form>
      </div>
    </div>
  );
}
