import { cn } from './primitives';
import { fmt1 } from './format';

/** цвет оценки: провал, слабо, достойно, сильно, эталон */
export function ratingTone(score: number): string {
  if (score < 3) return 'text-bad';
  if (score < 5) return 'text-warn';
  if (score < 8.5) return 'text-good';
  return 'text-[#c9c1ff]';
}

export function RatingBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'num inline-flex shrink-0 items-center justify-center rounded-lg bg-panel2 font-bold',
        size === 'sm' ? 'min-w-9 px-1.5 py-0.5 text-sm' : size === 'lg' ? 'min-w-16 px-3 py-1 text-2xl' : 'min-w-11 px-2 py-1 text-base',
        ratingTone(score),
      )}
      aria-label={`Оценка ${fmt1(score)}`}
    >
      {fmt1(score)}
    </span>
  );
}

/** фактическая доля исследований с учётом состава команды */
export function effectiveShare(slider: number, rf: number, ef: number): number {
  const research = (slider / 100) * rf;
  const engineering = ((100 - slider) / 100) * ef;
  const total = research + engineering;
  return total > 0 ? research / total : 0.5;
}

/**
 * Слайдер «исследования ↔ инженерия»: дорожка раскрашена пропорционально значению,
 * бегунок крупный для пальца. ideal — отметка рекомендуемого баланса, если он открыт.
 */
export function ShareSlider({ value, onChange, ideal, label }: { value: number; onChange: (value: number) => void; ideal?: number; label: string }) {
  const edge = (v: number) => `calc((100% - 28px) * ${v.toFixed(3)} + 14px)`;
  const track = `linear-gradient(to right, var(--color-research) 0, var(--color-research) ${edge(value / 100)}, var(--color-engineering) ${edge(value / 100)}, var(--color-engineering) 100%)`;
  return (
    <div className="relative">
      {ideal !== undefined && (
        <>
          <span
            className="pointer-events-none absolute top-[13px] h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-text shadow-[0_0_0_1px_rgba(11,15,26,0.9)]"
            style={{ left: edge(ideal) }}
            aria-hidden="true"
          />
          <span className="pointer-events-none absolute -top-0.5 -translate-x-1/2 text-[10px] whitespace-nowrap text-text" style={{ left: edge(ideal) }}>
            рекомендовано {Math.round(ideal * 100)}%
          </span>
        </>
      )}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
        style={{ ['--track' as string]: track }}
        aria-label={label}
        aria-valuetext={`Исследования ${value}%, инженерия ${100 - value}%`}
      />
    </div>
  );
}
