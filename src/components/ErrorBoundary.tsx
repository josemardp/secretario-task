import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, info);
  }

  handleReset = () => {
    // Limpar o localStorage resolve erros de hidratação do zustand
    try {
      localStorage.removeItem('secretario-task:task-store');
      localStorage.removeItem('secretario-task:context-store');
    } catch {
      console.warn('[ErrorBoundary] Não foi possível limpar o estado local.');
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 gap-6 bg-canvas">
          <div className="text-center">
            <h1 className="text-xl font-bold text-ink mb-2">Algo deu errado</h1>
            <p className="text-sm text-ink-2 mb-1">
              O app encontrou um erro inesperado.
            </p>
            <p className="text-xs text-ink-2 font-mono bg-paper2 rounded-lg px-3 py-2 mt-3 max-w-xs break-all">
              {this.state.error?.message ?? 'Erro desconhecido'}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReset}
              className="bg-ink text-canvas px-6 py-3 rounded-2xl text-sm font-bold w-full"
            >
              Limpar dados e recarregar
            </button>
            <a
              href="/clear-cache"
              className="text-center text-xs text-ink-2 underline"
            >
              Limpar cache completo do app
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
