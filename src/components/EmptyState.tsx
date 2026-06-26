import type { ReactNode } from 'react';

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-paper border border-line rounded-2xl px-6 py-10 text-center">
      <div className="font-display text-[22px] tracking-[-0.02em] text-ink">{title}</div>
      {hint && <p className="text-[13px] text-ink-2 mt-2 leading-snug max-w-xs mx-auto">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
