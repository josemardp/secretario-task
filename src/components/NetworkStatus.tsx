import { WifiOff } from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';

export function NetworkStatus() {
  const { isOnline } = useNetwork();
  if (isOnline) return null;

  return (
    <div
      className="fixed right-3 z-50 inline-flex items-center gap-1.5 bg-warning text-white px-3 rounded-xl shadow-soft text-[12px] font-bold"
      style={{
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        paddingTop: 8,
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
      }}
    >
      <WifiOff size={13} strokeWidth={2.4} />
      Offline · modo local
    </div>
  );
}
