declare const __APP_BUILD__: string;

export function BuildBadge() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;

  return (
    <span className="font-mono text-[11px] text-ink-2 tnum">
      {__APP_BUILD__} · {vw}px
    </span>
  );
}
