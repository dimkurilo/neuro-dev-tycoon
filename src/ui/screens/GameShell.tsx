import type { ReactNode } from 'react';
import type { GameState } from '../../types';
import { TUTORIAL } from '../../data/tutorial';
import { tutorialStep } from '../../sim/tutorial';
import { useGame } from '../../store/useGame';
import { TopBar } from '../TopBar';
import { BottomNav } from '../BottomNav';
import { Btn, Card, Empty } from '../primitives';
import { Toasts } from '../Toasts';
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

/** подсказка текущего шага обучения над содержимым вкладки; мир при этом идёт */
function TutorialHint({ game, tab }: { game: GameState; tab: TabId }) {
  const setTab = useGame((s) => s.setTab);
  const skipTutorial = useGame((s) => s.skipTutorial);
  const step = tutorialStep(game);
  const current = TUTORIAL[step];
  if (!current) return null;
  return (
    <Card className="mb-4 border-accent/50 p-3">
      <div className="num text-[11px] font-semibold tracking-wide text-accent uppercase">
        Обучение · шаг {step + 1} из {TUTORIAL.length}
      </div>
      <div className="mt-1 text-[15px] leading-snug font-semibold">{current.title}</div>
      <p className="mt-1 text-sm leading-relaxed text-muted">{current.text}</p>
      <div className="mt-2 flex gap-2">
        {current.tab !== tab && (
          <Btn variant="primary" className="flex-1" icon="pin" onClick={() => setTab(current.tab)}>
            Показать
          </Btn>
        )}
        <Btn variant="ghost" className="flex-1" onClick={skipTutorial}>
          Пропустить обучение
        </Btn>
      </div>
    </Card>
  );
}

export function GameShell({ tabs }: { tabs: Partial<Record<TabId, () => ReactNode>> }) {
  const tab = useGame((s) => s.ui.tab);
  const game = useGame((s) => s.game);
  if (!game) return null;
  const render = tabs[tab];
  const hint = HINTS[tab];
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* key пересоздаёт ленту со сменой вкладки — новая вкладка всегда открывается с начала */}
        <main key={tab} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
          {game.tutorial.active && <TutorialHint game={game} tab={tab} />}
          {render ? render() : <Empty icon={hint.icon} title={TAB_LABELS[tab]} text={hint.text} />}
        </main>
        {/* тосты поверх контента, но не поверх шапки с кнопками скорости */}
        <Toasts className="top-2" />
      </div>
      <BottomNav />
    </div>
  );
}
