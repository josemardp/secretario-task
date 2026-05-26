declare const __APP_BUILD__: string;

export function BuildBadge() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(4px + env(safe-area-inset-bottom))',
        left: 4,
        background: 'rgba(26,24,20,0.6)',
        color: 'rgba(255,233,194,0.85)',
        fontSize: 9,
        paddingTop: 2,
        paddingLeft: 5,
        paddingRight: 5,
        paddingBottom: 'calc(2px + env(safe-area-inset-bottom))',
        borderRadius: 4,
        zIndex: 9999,
        pointerEvents: 'none',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
        backdropFilter: 'blur(4px)',
      }}
    >
      {__APP_BUILD__} · {vw}px
    </div>
  );
}
