import { useEffect } from 'react';
import { Icon, type IconName } from '../icons';
import { useGame } from '../../store/useGame';
import { Btn, Card, Stat } from '../primitives';
import { fmtCompact, fmtDuration, fmt1, fmtInt, fmtMoney } from '../format';

export function GameOver() {
  const game = useGame((s) => s.game);
  const goIntro = useGame((s) => s.goIntro);
  const toMenu = useGame((s) => s.toMenu);

  useEffect(() => {
    if (!game?.gameover) toMenu();
  }, [game, toMenu]);

  if (!game?.gameover) return null;
  const s = game.stats;
  const cells: { icon: IconName; label: string; value: string; sub?: string }[] = [
    { icon: 'calendar', label: 'Продержались', value: fmtDuration(game.gameover.week) },
    { icon: 'rocket', label: 'Релизов', value: fmtInt(s.releases) },
    { icon: 'star', label: 'Лучшая оценка', value: s.bestRating > 0 ? fmt1(s.bestRating) : '—', sub: s.bestModel || undefined },
    { icon: 'coin', label: 'Заработано', value: fmtMoney(s.totalRevenue) },
    { icon: 'doc', label: 'Цитируемость', value: fmtCompact(s.peakFans) },
    { icon: 'lab', label: 'Исследований', value: fmtInt(s.researchDone) },
    { icon: 'team', label: 'Нанято всего', value: fmtInt(s.hired) },
    { icon: 'briefcase', label: 'Контрактов', value: fmtInt(s.contractsDone) },
  ];
  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 safe-top safe-bottom">
      <div className="mt-10 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-bad/15 text-bad">
          <Icon name="alert" className="h-10 w-10" />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold">Банкротство</h1>
        <p className="mt-2 text-sm text-muted">{game.gameover.reason}</p>
      </div>
      <Card className="mt-6 grid grid-cols-2 gap-3 p-3">
        {cells.map((c) => (
          <Stat key={c.label} icon={c.icon} label={c.label} value={c.value} sub={c.sub} />
        ))}
      </Card>
      <div className="mt-auto flex flex-col gap-2 pt-6">
        <Btn variant="primary" full onClick={goIntro}>
          Начать заново
        </Btn>
        <Btn full onClick={toMenu}>
          В меню
        </Btn>
      </div>
    </div>
  );
}
