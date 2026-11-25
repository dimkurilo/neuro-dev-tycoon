import type { Platform } from '../types';
import { platformReach } from '../data/platforms';
import { START_YEAR, yearsSince } from '../sim/time';

const W = 120;
const H = 32;

/** линия значений без осей — для выручки моделей */
export function Sparkline({ data, color, width = W, height = H }: { data: readonly number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(1, ...data);
  const n = Math.max(data.length, 2);
  const points = (data.length > 0 ? data : [0, 0])
    .map((v, i) => `${((i / (n - 1)) * (width - 4) + 2).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** кривая жизненного цикла платформы с отметкой текущего года */
export function LifecycleSparkline({ platform, week }: { platform: Platform; week: number }) {
  const curve = platform.curve;
  const year = START_YEAR + yearsSince(week);
  const first = curve[0];
  const last = curve[curve.length - 1];
  if (!first || !last) return null;
  const span = Math.max(1, last.year - first.year);
  const x = (y: number) => 2 + ((y - first.year) / span) * (W - 4);
  const y = (reach: number) => H - 3 - (reach / 100) * (H - 6);
  const points = curve.map((p) => `${x(p.year).toFixed(1)},${y(p.reach).toFixed(1)}`).join(' ');
  const cx = Math.min(W - 2, Math.max(2, x(year)));
  const cy = y(platformReach(platform, week));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0">
      <polyline points={points} fill="none" stroke="var(--color-line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3.5" fill="var(--color-accent)" />
    </svg>
  );
}
