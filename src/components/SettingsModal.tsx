import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Bell, LogOut, Sparkles } from 'lucide-react';
import { useContextStore } from '../stores/contextStore';
import { useNotifications } from '../hooks/useNotifications';
import { saveApiKeyToCloud } from '../lib/sync';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { aiApiKey, setAiApiKey } = useContextStore();
  const [apiKeyInput, setApiKeyInput] = useState(aiApiKey || '');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { permission, requestPermission } = useNotifications();

  if (!isOpen) return null;

  const handleSave = async () => {
    const key = apiKeyInput.trim() || null;
    setSaveError('');
    setIsSaving(true);

    try {
      await saveApiKeyToCloud(key);
      setAiApiKey(key);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar chave:', err);
      setSaveError('Não foi possível salvar a chave agora. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[rgba(26,24,20,0.45)] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-paper w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-soft animate-sheet-up flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingTop:    'calc(8px + env(safe-area-inset-top))',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-paper3 mb-2 mt-1" />
        </div>

        {/* header */}
        <div className="px-5 pt-2 pb-3 flex items-start justify-between">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-2">
              Configurações
            </div>
            <div className="font-display text-[24px] tracking-[-0.02em] text-ink mt-0.5 leading-tight">
              Conta e ajustes.
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-paper2 flex items-center justify-center text-ink-2"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* body */}
        <div className="px-5 pb-3 flex-1 overflow-y-auto flex flex-col gap-4">
          {/* API key */}
          <section className="bg-paper border border-line rounded-2xl p-4">
            <div className="flex items-start gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-soft flex items-center justify-center shrink-0 text-ink">
                <Sparkles size={15} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-ink leading-tight">
                  Recursos avançados
                </div>
                <p className="text-[11px] text-ink-2 mt-1 leading-snug">
                  A chave fica vinculada à sua conta e ativa recursos opcionais como
                  captura por voz, briefing e busca avançada.
                </p>
              </div>
            </div>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-proj-…"
              className="w-full bg-paper2 rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none border-0 placeholder:text-ink-2 tnum"
            />
            {saveError && (
              <p className="mt-2 text-[11px] font-semibold text-danger">
                {saveError}
              </p>
            )}
          </section>

          {/* Notifications */}
          <section className="bg-paper border border-line rounded-2xl p-4">
            <div className="flex items-start gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-paper2 flex items-center justify-center shrink-0 text-ink">
                <Bell size={15} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-ink leading-tight">
                  Notificações
                </div>
                <p className="text-[11px] text-ink-2 mt-1 leading-snug">
                  Receba lembretes nativos sobre tarefas vencendo e o Briefing do dia,
                  mesmo com o app minimizado.
                </p>
              </div>
            </div>

            {permission === 'granted' ? (
              <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-success px-3 py-1.5 rounded-full bg-success-light">
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> Ativadas
              </div>
            ) : permission === 'denied' ? (
              <div className="text-[12px] font-semibold text-danger leading-snug">
                Permissão bloqueada. Acesse as configurações do navegador para
                desbloquear.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => requestPermission()}
                className="inline-flex items-center gap-1.5 min-h-11 bg-ink text-white px-3 py-2 rounded-xl text-[12px] font-bold"
              >
                Ativar notificações
              </button>
            )}
          </section>

          {/* Sign out */}
          <section className="bg-paper border border-line rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold text-ink">Sair da conta</div>
              <div className="text-[11px] text-ink-2">Seus dados sincronizados ficam salvos.</div>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 min-h-11 text-danger text-[12px] font-bold px-3 py-2 rounded-xl bg-danger-light"
            >
              <LogOut size={14} /> Sair
            </button>
          </section>
        </div>

        {/* footer */}
        <div className="px-5 pt-2 flex items-center gap-2 border-t border-line">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-paper2 text-[13px] font-bold text-ink-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-11 rounded-xl bg-ink text-[13px] font-bold text-white"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
