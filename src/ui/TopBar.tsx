import type { Speed } from '../types';
import { useGame } from '../store/useGame';
import { Icon, type IconName } from './icons';
import { Stat, cn } from './primitives';
import { fmtCompact, fmtInt } from './format';
import { formatDate } from '../sim/time';

const SPEEDS: Speed[] = [0, 1, 2, 4];
const SPEED_ICONS: Record<Speed, IconName> = { 0: 'pause', 1: 'play', 2: 'ff2', 4: 'ff4' };
const SPEED_LABELS: Record<Speed, string> = { 0: 'Пауза', 1: 'Обычная скорость', 2: 'Ускорение ×2', 4: 'Ускорение ×4' };

export function TopBar() {
  const game = useGame((s) => s.game);
  const setSpeed = useGame((s) => s.setSpeed);
  if (!game) return null;
  const last = game.finance[game.finance.length - 1];
  const delta = last ? last.income - last.expenses : 0;
  return (
    <header className="safe-top shrink-0 border-b border-line bg-panel px-3 pb-2">
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: game.accent }} />
            <span className="truncate text-sm font-semibold">{game.companyName}</span>
          </div>
          <div className="num text-xs text-muted">{formatDate(game.week)}</div>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-xl bg-panel2 p-0.5" role="group" aria-label="Скорость времени">
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              type="button"
              aria-label={SPEED_LABELS[sp]}
              aria-pressed={game.speed === sp}
              onClick={() => setSpeed(sp)}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-[10px] transition-colors',
                game.speed === sp ? 'bg-accent text-[#15102e]' : 'text-muted active:bg-panel3',
              )}
            >
              <Icon name={SPEED_ICONS[sp]} className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {/* саб-строка баланса — изменение за неделю; место в плитке всего ~60px, поэтому коротко */}
        <Stat
          compact
          icon="coin"
          label="Баланс"
          value={fmtCompact(game.money)}
          sub={Math.abs(Math.round(delta)) > 0 ? `${delta > 0 ? '▲' : '▼'} ${fmtCompact(Math.abs(delta))}` : 'за неделю'}
          tone={game.money < 0 ? 'bad' : undefined}
        />
        <Stat compact icon="spark" label="И-очки" value={fmtInt(Math.floor(game.rp))} />
        <Stat compact icon="doc" label="Цитаты" value={fmtCompact(game.fans)} />
        <Stat compact icon="megaphone" label="Хайп" value={fmtInt(Math.round(game.hype))} />
      </div>
    </header>
  );
}
