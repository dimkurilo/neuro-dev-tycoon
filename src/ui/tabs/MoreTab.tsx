import type { GameState } from '../../types';
import { officeById } from '../../data/offices';
import { weeklyCosts } from '../../sim/finance';
import { useGame } from '../../store/useGame';
import { Btn, Card, DefList, IconBox, SectionTitle, Stat } from '../primitives';
import { ACHIEVEMENTS } from '../../data/achievements';
import { ChartsSection } from './Charts';
import { fmt1, fmtCompact, fmtDuration, fmtInt, fmtMoney, fmtSigned, plural } from '../format';

function WeekReport({ game }: { game: GameState }) {
  const last = game.finance[game.finance.length - 1];
  const costs = weeklyCosts(game);
  const net = last ? last.income - last.expenses : 0;
  return (
    <>
      <SectionTitle>Прошлая неделя</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <Stat compact icon="trend" label="Доход" value={last ? fmtMoney(last.income) : '—'} />
        <Stat compact icon="wallet" label="Расход" value={last ? fmtMoney(last.expenses) : '—'} />
        <Stat compact icon="coin" label="Итог" value={fmtMoney(net)} tone={net > 0 ? 'good' : net < 0 ? 'bad' : undefined} />
      </div>
      <DefList
        className="mt-2"
        rows={[
          ['Зарплаты', fmtMoney(costs.salaries)],
          ['Аренда', fmtMoney(costs.rent)],
          ['GPU-часы', fmtMoney(costs.gpu)],
          ['Проценты по кредитам', fmtMoney(costs.interest)],
          ...(costs.upkeep > 0 ? [['Объекты офиса', fmtMoney(costs.upkeep)] as const] : []),
        ]}
      />
    </>
  );
}

export /** сводка партии: что сделано и чего это стоило */
function StatsReport({ game }: { game: GameState }) {
  const s = game.stats;
  const features = game.framework.features.length;
  return (
    <>
      <SectionTitle>Статистика</SectionTitle>
      <DefList
        rows={[
          ['Моделей выпущено', fmtInt(s.releases)],
          ['Лучшая оценка', s.bestRating > 0 ? `${fmt1(s.bestRating)}${s.bestModel ? ` · ${s.bestModel}` : ''}` : '—'],
          ['Всего заработано', fmtMoney(s.totalRevenue)],
          ['Всего потрачено', fmtMoney(s.totalExpenses)],
          ['Контракты: выполнено / сорвано', `${fmtInt(s.contractsDone)} / ${fmtInt(s.contractsFailed)}`],
          ['Версий моделей', fmtInt(s.versionsMade)],
          ['Исследований завершено', fmtInt(s.researchDone)],
          ['Фреймворк', `${game.framework.version > 0 ? `v${game.framework.version}` : 'не собран'} · ${fmtInt(features)} ${plural(features, ['функция', 'функции', 'функций'])}`],
          ['Кампаний запущено', fmtInt(s.campaigns)],
          ['Нанято / уволилось', `${fmtInt(s.hired)} / ${fmtInt(s.quit)}`],
          ['Пик цитируемости', fmtCompact(s.peakFans)],
          ['Пик баланса', fmtMoney(s.peakMoney)],
          ['Худшая неделя', fmtSigned(s.worstWeeklyLoss)],
        ]}
      />
    </>
  );
}

export function MoreTab() {
  const game = useGame((s) => s.game);
  const openModal = useGame((s) => s.openModal);
  const toMenu = useGame((s) => s.toMenu);
  if (!game) return null;
  const achieved = game.achievements.length;
  return (
    <div>
      <WeekReport game={game} />
      <Card
        className="flex items-center gap-3 p-3"
        onClick={() => openModal({ kind: 'achievements' })}
      >
        <IconBox icon="trophy" tone={achieved > 0 ? 'warn' : 'muted'} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Достижения</div>
          <div className="text-xs text-muted">Открыто {achieved} из {ACHIEVEMENTS.length}</div>
        </div>
      </Card>
      <StatsReport game={game} />
      <ChartsSection />
      <SectionTitle>Лаборатория</SectionTitle>
      <DefList
        rows={[
          ['Название', game.companyName],
          ['Основатель', game.founderName],
          ['В игре', fmtDuration(game.week)],
          ['Офис', officeById(game.office).name],
          ['Команда', `${fmtInt(game.staff.length)} ${plural(game.staff.length, ['человек', 'человека', 'человек'])}`],
        ]}
      />
      <SectionTitle>Игра</SectionTitle>
      <Card className="flex flex-col gap-1 p-2">
        <Btn variant="ghost" full icon="save" onClick={() => openModal({ kind: 'save' })}>
          Сохранение и перенос
        </Btn>
        <Btn variant="ghost" full icon="home" onClick={toMenu}>
          В главное меню
        </Btn>
        <Btn
          variant="ghost"
          full
          icon="trash"
          className="text-bad"
          onClick={() =>
            openModal({
              kind: 'confirm',
              title: 'Начать заново',
              text: 'Текущая партия будет удалена вместе с сейвом. Экспортируйте её, если жалко терять.',
              confirmLabel: 'Удалить и начать заново',
              danger: true,
              onConfirm: () => {
                useGame.getState().abandonGame();
                useGame.getState().goIntro();
              },
            })
          }
        >
          Начать заново
        </Btn>
      </Card>
    </div>
  );
}
