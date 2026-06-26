import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

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
            className="h-12 mt-1 rounded-xl bg-ink text-white text-[14px] font-bold disabled:opacity-50"
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
        </form>
      </div>
    </div>
  );
}
