import type { GameState } from '../../types';
import { officeById } from '../../data/offices';
import { weeklyCosts } from '../../sim/finance';
import { useGame } from '../../store/useGame';
import { Btn, Card, DefList, SectionTitle, Stat } from '../primitives';
import { fmtDuration, fmtInt, fmtMoney, plural } from '../format';

function WeekReport({ game }: { game: GameState }) {
  const last = game.finance[game.finance.length - 1];
  const costs = weeklyCosts(game);
  const net = last ? last.income - last.expenses : 0;
  return (
    <>
      <SectionTitle>Прошлая неделя</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="trend" label="Доход" value={last ? fmtMoney(last.income) : '—'} />
        <Stat icon="wallet" label="Расход" value={last ? fmtMoney(last.expenses) : '—'} />
        <Stat icon="coin" label="Итог" value={fmtMoney(net)} tone={net > 0 ? 'good' : net < 0 ? 'bad' : undefined} />
      </div>
      <DefList
        className="mt-2"
        rows={[
          ['Зарплаты', fmtMoney(costs.salaries)],
          ['Аренда', fmtMoney(costs.rent)],
          ['GPU-часы', fmtMoney(costs.gpu)],
          ['Проценты по кредитам', fmtMoney(costs.interest)],
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
  return (
    <div>
      <WeekReport game={game} />
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
