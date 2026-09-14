import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import './index.css'
import App from './App.tsx'
import { activateDemoMode } from './lib/demoData'

// Ativa o modo demo imediatamente se houver o parâmetro na URL ou hash antes da renderização
if (typeof window !== 'undefined') {
  const search = window.location.search;
  const hash = window.location.hash;
  if (search.includes('demo=true') || hash.includes('demo')) {
    activateDemoMode();
  }
}

// Força reload automático quando um novo Service Worker for instalado.
registerSW({
  onNeedRefresh() {
    window.location.reload()
  },
  onOfflineReady() {
    console.debug('[PWA] App pronto para uso offline')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
