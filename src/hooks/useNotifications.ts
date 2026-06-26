import { useState, useCallback } from 'react';
import { useToast } from '../components/toastContext';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    'Notification' in window ? Notification.permission : 'default'
  );
  const toast = useToast();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast('Seu navegador não suporta notificações.', 'error');
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, [toast]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          ...options,
        });
      } catch (e) {
        console.error('Erro ao enviar notificação:', e);
      }
    }
  }, [permission]);

  return {
    permission,
    requestPermission,
    sendNotification
  };
}
