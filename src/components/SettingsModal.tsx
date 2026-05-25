import { useState } from 'react';
import { useContextStore } from '../stores/contextStore';
import { useNotifications } from '../hooks/useNotifications';
import { saveApiKeyToCloud } from '../lib/sync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { aiApiKey, setAiApiKey } = useContextStore();
  const [apiKeyInput, setApiKeyInput] = useState(aiApiKey || '');
  const { permission, requestPermission } = useNotifications();

  if (!isOpen) return null;

  const handleSave = async () => {
    const key = apiKeyInput.trim() || null;
    setAiApiKey(key);
    await saveApiKeyToCloud(key);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Configurações</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            Chave da API (OpenAI)
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-proj-..."
            className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
          <p className="mt-2 text-xs text-gray-500">
            Sua chave é salva na nuvem (vinculada à sua conta) e fica disponível em qualquer dispositivo ao fazer login. É enviada diretamente para a OpenAI para gerar briefings e busca semântica.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2 mb-2">
            <span>🔔</span> Notificações (PWA)
          </h3>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              Receba lembretes nativos sobre tarefas vencendo e alertas de Daily Briefing, mesmo com o app minimizado.
            </p>
            {permission === 'granted' ? (
              <div className="text-sm font-semibold text-green-600 flex items-center gap-1">
                <span>✅</span> Notificações Ativadas
              </div>
            ) : permission === 'denied' ? (
              <div className="text-sm font-semibold text-red-600">
                🚫 Permissão bloqueada. Acesse as configurações do seu navegador para desbloquear.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => requestPermission()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              >
                Ativar Notificações
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
