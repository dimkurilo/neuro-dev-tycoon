import { OFFICES, officeById } from '../../data/offices';
import { licensePrice } from '../../sim/market';
import { researchName } from '../../data/research';
import { isResearchDone } from '../../sim/unlock';
import { useGame } from '../../store/useGame';
import { Btn, Card, IconBox, Notice, SectionTitle } from '../primitives';
import { useRun } from '../useRun';
import { fmtMoney } from '../format';

/** офис лаборатории и переезд в более просторный */
export function OfficeTab() {
  const game = useGame((s) => s.game);
  const moveOffice = useGame((s) => s.moveOffice);
  const run = useRun();
  if (!game) return null;
  const current = officeById(game.office);
  const rank = OFFICES.findIndex((o) => o.id === game.office);
  const upgrades = OFFICES.filter((_, i) => i > rank);

  return (
    <div>
      <SectionTitle>Офис</SectionTitle>
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <IconBox icon="office" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">{current.name}</div>
            <div className="num text-xs text-muted">
              {game.staff.length} из {current.capacity} мест · аренда {current.rent > 0 ? `${fmtMoney(current.rent)} в неделю` : 'бесплатно'}
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">{current.desc}</p>
      </Card>

      {upgrades.length === 0 ? (
        <Notice className="mt-3" tone="good" icon="trophy">Это лучший офис в игре: больше и просторнее некуда.</Notice>
      ) : (
        <>
          <SectionTitle>Переезд</SectionTitle>
          <div className="flex flex-col gap-2">
            {upgrades.map((office) => {
              const price = licensePrice(game, office.moveCost);
              const researched = isResearchDone(game, office.research);
              return (
                <Card key={office.id} className={researched ? 'p-3' : 'p-3 opacity-70'}>
                  <div className="flex items-start gap-3">
                    <IconBox icon="office" tone={researched ? 'accent' : 'muted'} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold">{office.name}</div>
                      <div className="num text-xs text-muted">
                        до {office.capacity} человек · аренда {fmtMoney(office.rent)} в неделю
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted">{office.desc}</p>
                  <Btn full className="mt-2" icon="pin" disabled={!researched || game.money < price} onClick={() => run(() => moveOffice(office.id), `Лаборатория переехала в офис «${office.name}»`)}>
                    {!researched ? `Нужно исследование «${researchName(office.research)}»` : game.money < price ? `Переезд · не хватает ${fmtMoney(price - game.money)}` : `Переехать · ${fmtMoney(price)}`}
                  </Btn>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
