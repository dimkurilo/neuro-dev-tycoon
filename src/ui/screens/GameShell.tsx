import type { ReactNode } from 'react';
import { useGame } from '../../store/useGame';
import { TopBar } from '../TopBar';
import { BottomNav } from '../BottomNav';
import { Empty } from '../primitives';
import { TAB_LABELS } from '../meta';
import type { IconName } from '../icons';
import type { TabId } from '../../types';

const HINTS: Record<TabId, { icon: IconName; text: string }> = {
  project: { icon: 'project', text: 'Здесь появится ваша первая модель.' },
  lab: { icon: 'lab', text: 'Исследовательские очки превращаются в новые технологии.' },
  team: { icon: 'team', text: 'Найм, обучение и выгорание команды.' },
  office: { icon: 'office', text: 'Гараж, студия и кампус.' },
  market: { icon: 'market', text: 'Платформы, контракты, маркетинг и новости.' },
  more: { icon: 'more', text: 'Графики, достижения, статистика и сейвы.' },
};

export function GameShell({ tabs }: { tabs: Partial<Record<TabId, () => ReactNode>> }) {
  const tab = useGame((s) => s.ui.tab);
  const game = useGame((s) => s.game);
  if (!game) return null;
  const render = tabs[tab];
  const hint = HINTS[tab];
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <main className="relative flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
        {render ? render() : <Empty icon={hint.icon} title={TAB_LABELS[tab]} text={hint.text} />}
      </main>
      <BottomNav />
    </div>
  );
}
