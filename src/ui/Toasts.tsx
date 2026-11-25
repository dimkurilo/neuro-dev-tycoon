import type { Tone } from '../types';
import { useGame } from '../store/useGame';
import { cn } from './primitives';

const TONE: Record<Tone, string> = {
  info: 'border-line',
  good: 'border-good/60',
  bad: 'border-bad/60',
};

export function Toasts({ className }: { className?: string }) {
  const toasts = useGame((s) => s.ui.toasts);
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 z-[60] flex flex-col items-center gap-1.5 px-3', className ?? 'top-0 safe-top')} aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn('pointer-events-auto mt-1 flex max-w-full animate-toast-in items-center gap-2 rounded-xl border bg-panel3 px-3 py-2.5 text-sm shadow-xl', TONE[t.tone])}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
