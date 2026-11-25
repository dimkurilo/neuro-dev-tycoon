import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import type { Tone } from '../types';
import { Icon, type IconName } from './icons';
import { initials } from './format';

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'good';

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-accent text-[#15102e] font-semibold active:bg-[#a395ff]',
  secondary: 'bg-panel2 border border-line text-text active:bg-panel3',
  ghost: 'bg-transparent text-muted active:bg-panel2',
  danger: 'bg-bad/15 text-bad border border-bad/40 active:bg-bad/25',
  good: 'bg-good/15 text-good border border-good/40 active:bg-good/25',
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  full?: boolean;
  icon?: IconName;
}

/** все кнопки не ниже 44px — таргет для пальца */
export function Btn({ variant = 'secondary', full, icon, className, children, type, ...rest }: BtnProps) {
  return (
    <button
      type={type ?? 'button'}
      {...rest}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium transition-colors disabled:opacity-40',
        full ? 'w-full' : '',
        BTN_VARIANTS[variant],
        className,
      )}
    >
      {icon && <Icon name={icon} className="h-5 w-5 shrink-0" />}
      {children}
    </button>
  );
}

/** квадратная кнопка-иконка 44×44 */
export function IconButton({ icon, label, className, ...rest }: BtnProps & { label: string; icon: IconName }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors active:bg-panel3 disabled:opacity-40', className)}
    >
      <Icon name={icon} className="h-5 w-5" />
    </button>
  );
}

export function Card({ className, style, children, onClick }: { className?: string; style?: CSSProperties; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      style={style}
      className={cn('rounded-card border border-line bg-panel', onClick && 'cursor-pointer transition-colors active:bg-panel2', className)}
    >
      {children}
    </div>
  );
}

type ChipTone = 'default' | 'accent' | 'research' | 'engineering' | 'good' | 'warn' | 'bad';

const CHIP_TONES: Record<ChipTone, string> = {
  default: 'border-line bg-panel2 text-muted',
  accent: 'border-accent/50 bg-accent/15 text-[#c4bbff]',
  research: 'border-research/50 bg-research/15 text-research',
  engineering: 'border-engineering/50 bg-engineering/15 text-engineering',
  good: 'border-good/50 bg-good/15 text-good',
  warn: 'border-warn/50 bg-warn/15 text-warn',
  bad: 'border-bad/50 bg-bad/15 text-bad',
};

export function Chip({ tone = 'default', icon, className, children }: { tone?: ChipTone; icon?: IconName; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', CHIP_TONES[tone], className)}>
      {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

export function Bar({ value, max, color, className }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-line', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%`, background: color ?? 'var(--color-accent)' }} />
    </div>
  );
}

export function Stat({ icon, label, value, sub, tone, compact }: { icon: IconName; label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'good' | 'bad' | 'warn'; compact?: boolean }) {
  const color = tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-text';
  return (
    <div className={cn('min-w-0 rounded-xl border border-line bg-panel2 py-2', compact ? 'px-1.5 min-[390px]:px-2' : 'px-2.5')}>
      <div className={cn('flex items-center gap-1.5 text-muted', compact ? 'text-[11px]' : 'text-xs')}>
        <Icon name={icon} className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('num mt-0.5 truncate font-semibold', compact ? 'text-[14px] min-[390px]:text-[15px]' : 'text-[15px]', color)}>{value}</div>
      {sub && <div className="num truncate text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex min-h-9 items-center justify-between gap-2 first:mt-0">
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{children}</h3>
      {action}
    </div>
  );
}

export function Avatar({ name, color, size = 40, className, ring }: { name: string; color: string; size?: number; className?: string; ring?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-bg select-none', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: color, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }}
    >
      {initials(name)}
    </span>
  );
}

export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-panel2 text-muted">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      {text && <p className="text-sm text-muted">{text}</p>}
      {children && <div className="mt-2 flex w-full flex-col gap-2">{children}</div>}
    </Card>
  );
}

/** нижний лист — единственный вид модалок в игре, удобен для большого пальца */
export function Sheet({ title, onClose, children, footer, tall }: { title?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/65" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative flex animate-sheet-in flex-col rounded-t-3xl border-t border-line bg-panel shadow-2xl', tall ? 'h-[94%]' : 'max-h-[88%]')}
      >
        <div className="flex shrink-0 items-center justify-between px-2 pt-1.5">
          <div className="absolute top-1.5 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-line" />
          <h2 className="min-h-11 pl-3 text-lg leading-11 font-semibold">{title}</h2>
          <IconButton icon="close" label="Закрыть" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-3">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-panel px-4 pt-3 safe-bottom">{footer}</div>}
        {!footer && <div className="shrink-0 safe-bottom" />}
      </div>
    </div>
  );
}

export function Notice({ tone = 'info', icon, className, children }: { tone?: Tone | 'warn'; icon?: IconName; className?: string; children: ReactNode }) {
  const map = { info: 'border-line bg-panel2 text-muted', good: 'border-good/40 bg-good/10 text-good', bad: 'border-bad/40 bg-bad/10 text-bad', warn: 'border-warn/40 bg-warn/10 text-warn' } as const;
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm', map[tone], className)}>
      {icon && <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** квадратная плитка с иконкой — слева от названия в карточках */
export function IconBox({ icon, tone = 'accent' }: { icon: IconName; tone?: 'accent' | 'warn' | 'muted' | 'good' }) {
  const color = { accent: 'text-accent', warn: 'text-warn', muted: 'text-muted', good: 'text-good' }[tone];
  return (
    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel2', color)}>
      <Icon name={icon} className="h-[22px] w-[22px]" />
    </span>
  );
}

/** список «имя — значение»: сводки и итоги */
export function DefList({ rows, className }: { rows: (readonly [string, ReactNode])[]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-line rounded-card border border-line bg-panel2', className)}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex min-h-11 items-center gap-3 px-3 py-1">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 flex-1 text-right font-semibold break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** строка списка с крупной зоной нажатия */
export function Row({ onClick, children, className }: { onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={cn('flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5', onClick && 'cursor-pointer transition-colors active:bg-panel2', className)}
    >
      {children}
    </div>
  );
}
