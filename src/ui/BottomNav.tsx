import type { TabId } from '../types';
import { useGame } from '../store/useGame';
import { Icon, type IconName } from './icons';
import { cn } from './primitives';

export const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'project', label: 'Проект', icon: 'project' },
  { id: 'lab', label: 'Лаборатория', icon: 'lab' },
  { id: 'team', label: 'Команда', icon: 'team' },
  { id: 'office', label: 'Офис', icon: 'office' },
  { id: 'market', label: 'Рынок', icon: 'market' },
  { id: 'more', label: 'Ещё', icon: 'more' },
];

export function BottomNav() {
  const tab = useGame((s) => s.ui.tab);
  const setTab = useGame((s) => s.setTab);
  return (
    <nav className="safe-bottom shrink-0 border-t border-line bg-panel px-1 pt-1">
      {/* вкладки не растягиваются, свободная ширина делится поровну — подписи не слипаются */}
      <div className="flex justify-around" role="tablist">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex min-h-12 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-[10px] font-medium whitespace-nowrap transition-colors',
                active ? 'bg-accent/15 text-[#c9c1ff]' : 'text-muted active:bg-panel2',
              )}
            >
              <Icon name={t.icon} className="h-[22px] w-[22px]" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
