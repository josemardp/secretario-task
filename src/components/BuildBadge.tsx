declare const __APP_BUILD__: string;

export function BuildBadge() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 4,
        left: 4,
        background: 'rgba(30,27,75,0.75)',
        color: '#c7d2fe',
        fontSize: 9,
        padding: '2px 5px',
        borderRadius: 4,
        zIndex: 9999,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        backdropFilter: 'blur(4px)',
      }}
    >
      {__APP_BUILD__} · {vw}px
    </div>
  );
}
