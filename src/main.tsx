import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Força reload automático quando um novo Service Worker for instalado.
// Isso garante que o app sempre use a versão mais recente após um novo deploy,
// sem precisar que o usuário faça Ctrl+Shift+R manualmente.
registerSW({
  onNeedRefresh() {
    // Aceita a atualização e recarrega a página automaticamente
    window.location.reload()
  },
  onOfflineReady() {
    console.log('[PWA] App pronto para uso offline')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
