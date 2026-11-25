import { ACHIEVEMENTS } from '../../data/achievements';
import { useGame } from '../../store/useGame';
import { Icon } from '../icons';
import { Sheet, cn } from '../primitives';
import { useAutoClose } from '../useAutoClose';

/** все достижения партии: открытые подсвечены, закрытые показывают условие */
export function AchievementsSheet({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game);
  useAutoClose(!game);
  if (!game) return null;
  const open = new Set(game.achievements);
  return (
    <Sheet title="Достижения" onClose={onClose}>
      <p className="text-sm text-muted">
        Открыто {open.size} из {ACHIEVEMENTS.length}. Закрытые показывают, что нужно сделать.
      </p>
      <ul className="mt-3 flex flex-col gap-2 pb-2">
        {ACHIEVEMENTS.map((a) => {
          const done = open.has(a.id);
          return (
            <li key={a.id} className={cn('flex items-center gap-3 rounded-xl border border-line bg-panel2 p-3', !done && 'opacity-60')}>
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', done ? 'bg-warn/15 text-warn' : 'bg-panel3 text-muted')}>
                <Icon name={a.icon} className="h-[22px] w-[22px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] leading-snug font-semibold">{a.name}</div>
                <div className="text-xs leading-snug text-muted">{a.desc}</div>
              </div>
              <Icon name={done ? 'check' : 'lock'} className={cn('h-5 w-5 shrink-0', done ? 'text-good' : 'text-muted')} />
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
