import { useState, type ReactNode } from 'react';
import type { GameState, OfficeObject, Staff } from '../../types';
import { OFFICES, OFFICE_COLS, officeById } from '../../data/offices';
import { MODULES, moduleById } from '../../data/modules';
import { researchName } from '../../data/research';
import { BALANCE } from '../../data/balance';
import { staffTitle } from '../../data/staff';
import { licensePrice } from '../../sim/market';
import { isResearchDone } from '../../sim/unlock';
import { canBuyObject, coveredDesks, deskBonus, objectAt, objectPrice, officeRank, ownedCount, staffAtDesk, type DeskBonus } from '../../sim/office';
import { isAvailable } from '../../sim/staff';
import { useGame } from '../../store/useGame';
import { Icon, type IconName } from '../icons';
import { Avatar, Btn, Card, Chip, IconBox, Notice, SectionTitle, cn } from '../primitives';
import { useRun } from '../useRun';
import { fmtCount, fmtMoney } from '../format';

const share = (v: number) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`;
const signed = (v: number) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v))}`;

/** что объекты дают столу: по строке на вид эффекта */
function bonusParts(bonus: DeskBonus): { good: boolean; icon: IconName; text: string }[] {
  const part = (value: number, icon: IconName, text: string) => (value === 0 ? [] : [{ good: value > 0, icon, text }]);
  return [
    ...part(bonus.speed, 'bolt', `${share(bonus.speed)} к скорости`),
    ...part(bonus.research, 'spark', `${signed(bonus.research)} к науке`),
    ...part(bonus.engineering, 'wrench', `${signed(bonus.engineering)} к инженерии`),
    // медленнее выгорать — хорошо
    ...part(-bonus.burnout, bonus.burnout < 0 ? 'heart' : 'fire', `${share(bonus.burnout)} к темпу выгорания`),
    ...part(bonus.rp, 'grad', `${share(bonus.rp)} к И-очкам`),
  ];
}

type Picked = { kind: 'staff'; id: string } | { kind: 'object'; uid: number };

/** клетка плана: кнопка, только если по ней можно что-то сделать */
function Tile({ label, picked, target, onClick, className, children }: { label: string; picked?: boolean; target?: boolean; onClick?: () => void; className?: string; children: ReactNode }) {
  const look = cn(
    'relative flex aspect-square min-h-11 min-w-0 flex-col items-center justify-center rounded-lg border transition-colors',
    picked ? 'z-10 border-accent bg-accent/25 shadow-[0_0_0_2px_var(--color-accent)]' : target ? 'border-accent/70 bg-accent/10' : className,
  );
  if (!onClick) return <div className={look}>{children}</div>;
  return (
    <button type="button" aria-label={label} aria-pressed={picked} onClick={onClick} className={cn(look, 'active:opacity-80')}>
      {children}
    </button>
  );
}

function StaffTile({ staff, game }: { staff: Staff; game: GameState }) {
  const bonus = bonusParts(deskBonus(game, staff.desk));
  const badge = !isAvailable(staff) ? (staff.training ? 'grad' : 'bed') : staff.burnout >= BALANCE.team.highBurnout ? 'fire' : null;
  return (
    <>
      {badge && (
        <span className="absolute top-0.5 right-0.5">
          <Icon name={badge} className={cn('h-3 w-3', badge === 'fire' ? 'text-bad' : 'text-muted')} />
        </span>
      )}
      <Avatar name={staff.name} color={staff.color} size={28} className={cn(!isAvailable(staff) && 'opacity-50')} ring={staff.founder ? 'var(--color-accent)' : undefined} />
      <span className="mt-0.5 w-full shrink-0 truncate text-center text-[10px] leading-tight min-[390px]:px-0.5">{staff.name.split(' ')[0]}</span>
      {/* на узком экране клетка 51px: иконки бонусов не помещаются, имя важнее */}
      <span className="hidden h-3 min-[390px]:flex items-center gap-[3px]" aria-hidden="true">
        {bonus.slice(0, 3).map((b) => (
          <Icon key={b.icon} name={b.icon} className={cn('h-3 w-3', b.good ? 'text-good' : 'text-bad')} />
        ))}
      </span>
    </>
  );
}

function ObjectCard({ game, id }: { game: GameState; id: string }) {
  const buy = useGame((s) => s.buyObject);
  const run = useRun();
  const def = moduleById(id);
  if (!def) return null;
  const owned = ownedCount(game, id);
  const soldOut = owned >= def.max;
  const reason = canBuyObject(game, id);
  const locked = officeRank(game) < def.minOffice || !isResearchDone(game, def.research);
  const price = objectPrice(game, def);
  return (
    <Card className={cn('p-3', locked && 'opacity-70')}>
      <div className="flex items-start gap-3">
        <IconBox icon={def.icon} tone={locked ? 'muted' : 'warn'} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">
            {def.name}
            {def.max > 1 && <span className="num ml-2 text-xs font-normal text-muted">{owned} из {def.max}</span>}
          </div>
          <div className="num text-xs text-muted">содержание {fmtMoney(def.upkeep)} в неделю</div>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">{def.desc}</p>
      {soldOut ? (
        <Notice className="mt-2" tone="good" icon="check">Всё куплено</Notice>
      ) : (
        <Btn full className="mt-2" icon="plus" disabled={reason !== null} onClick={() => run(() => buy(id), `«${def.name}» стоит в офисе`)}>
          {reason === null ? `Купить · ${fmtMoney(price)}` : reason === 'Недостаточно денег' ? `Купить · не хватает ${fmtMoney(price - game.money)}` : reason}
        </Btn>
      )}
    </Card>
  );
}

/** план офиса: столы, объекты и свободные клетки; тапом сотрудник и объект переставляются */
export function OfficeTab() {
  const game = useGame((s) => s.game);
  const moveDesk = useGame((s) => s.moveDesk);
  const moveObject = useGame((s) => s.moveObject);
  const sellObject = useGame((s) => s.sellObject);
  const moveOffice = useGame((s) => s.moveOffice);
  const run = useRun();
  const [picked, setPicked] = useState<Picked | null>(null);
  if (!game) return null;

  const current = officeById(game.office);
  const rank = OFFICES.findIndex((o) => o.id === game.office);
  const upgrades = OFFICES.filter((_, i) => i > rank);
  const tiles = current.rows * OFFICE_COLS;

  const pickedStaff = picked?.kind === 'staff' ? (game.staff.find((s) => s.id === picked.id) ?? null) : null;
  const pickedObject: OfficeObject | null = picked?.kind === 'object' ? (game.objects.find((o) => o.uid === picked.uid) ?? null) : null;

  const tapTile = (tile: number) => {
    const staff = staffAtDesk(game, tile);
    const object = objectAt(game, tile);
    if (pickedStaff) {
      if (staff?.id !== pickedStaff.id) run(() => moveDesk(pickedStaff.id, tile));
      setPicked(null);
    } else if (pickedObject) {
      if (object?.uid === pickedObject.uid) setPicked(null);
      else if (object) setPicked({ kind: 'object', uid: object.uid });
      else {
        run(() => moveObject(pickedObject.uid, tile));
        setPicked(null);
      }
    } else if (staff) setPicked({ kind: 'staff', id: staff.id });
    else if (object) setPicked({ kind: 'object', uid: object.uid });
  };

  const pickedDef = pickedObject ? moduleById(pickedObject.id) : undefined;
  const covered = pickedObject ? coveredDesks(game, pickedObject.tile) : [];
  const names = covered.map((d) => staffAtDesk(game, d)?.name).filter((n): n is string => n !== undefined);

  return (
    <div>
      <SectionTitle>План офиса</SectionTitle>
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <IconBox icon="office" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">{current.name}</div>
            <div className="num text-xs text-muted">
              {game.staff.length} из {current.capacity} мест · аренда {current.rent > 0 ? `${fmtMoney(current.rent)} в неделю` : 'бесплатно'}
              {game.objects.length > 0 ? ` · объекты: ${fmtMoney(game.objects.reduce((sum, o) => sum + (moduleById(o.id)?.upkeep ?? 0), 0))} в неделю` : ''}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-6 gap-1" role="group" aria-label="План офиса">
          {Array.from({ length: tiles }, (_, tile) => {
            const desk = current.desks.includes(tile);
            const staff = desk ? staffAtDesk(game, tile) : undefined;
            const object = objectAt(game, tile);
            const isPicked = Boolean(pickedStaff && staff?.id === pickedStaff.id) || Boolean(pickedObject && object?.uid === pickedObject.uid);
            // стол — цель для перестановки сотрудника, свободная клетка — для объекта
            const target = !isPicked && !object && (pickedStaff ? desk && !staff : pickedObject ? !desk : false);
            const tappable = isPicked || target || !!staff || !!object;
            return (
              <Tile
                key={tile}
                label={staff ? `${staff.name}: переставить` : object ? moduleById(object.id)?.name ?? 'Объект' : 'Свободная клетка'}
                picked={isPicked}
                target={target}
                onClick={tappable ? () => tapTile(tile) : undefined}
                className={cn(desk ? 'border-line bg-panel2' : 'border-line/60 bg-panel2/50', object && 'border-warn/50 bg-warn/10')}
              >
                {staff && <StaffTile staff={staff} game={game} />}
                {!staff && object && <Icon name={moduleById(object.id)?.icon ?? 'cube'} className="h-5 w-5 text-warn" />}
                {!staff && !object && desk && (
                  <span aria-hidden="true" className="flex flex-col items-center gap-[3px]">
                    <span className="h-3 w-5 rounded-[3px] border-[1.5px] border-line" />
                    <span className="h-[3px] w-2 rounded-full bg-line" />
                  </span>
                )}
              </Tile>
            );
          })}
        </div>

        {pickedStaff ? (
          <div className="mt-3 animate-fade-in">
            <div className="text-sm">
              <span className="font-semibold">{pickedStaff.name}</span>
              <span className="text-muted"> — {pickedStaff.founder ? 'основатель лаборатории' : staffTitle(pickedStaff)}</span>
            </div>
            <BonusChips bonus={deskBonus(game, pickedStaff.desk)} empty="Стол без бонусов: рядом нет объектов." />
            <p className="mt-2 text-xs text-muted">Нажмите на другой стол, чтобы пересадить.</p>
          </div>
        ) : pickedObject && pickedDef ? (
          <div className="mt-3 animate-fade-in">
            <div className="text-sm font-semibold">{pickedDef.name}</div>
            <p className="mt-1 text-xs text-muted">{pickedDef.desc}</p>
            <p className="mt-2 text-sm">
              {covered.length === 0 ? (
                <span className="text-bad">Не действует ни на один стол — переставьте ближе.</span>
              ) : (
                <>
                  <span className="text-muted">Действует на {fmtCount(covered.length, ['стол', 'стола', 'столов'])}: </span>
                  {names.length > 0 ? names.join(', ') : 'сейчас все свободны'}
                  {names.length > 0 && names.length < covered.length ? ` и ещё ${fmtCount(covered.length - names.length, ['свободный', 'свободных', 'свободных'])}` : ''}
                </>
              )}
            </p>
            <Btn variant="danger" full className="mt-2" icon="trash" onClick={() => run(() => sellObject(pickedObject.uid), `«${pickedDef.name}» продан`)}>
              Продать · +{fmtMoney(objectPrice(game, pickedDef) * BALANCE.office.sellShare)}
            </Btn>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">Нажмите на сотрудника или объект, чтобы переставить. Объекты действуют на восемь клеток вокруг.</p>
        )}
      </Card>

      <SectionTitle>Объекты</SectionTitle>
      {rank === 0 ? (
        <Card className="p-3 text-sm text-muted">В гараже тесно: доски, кофе и комната отдыха появятся после переезда в студию.</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {MODULES.map((m) => (
            <ObjectCard key={m.id} game={game} id={m.id} />
          ))}
        </div>
      )}

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

function BonusChips({ bonus, empty }: { bonus: DeskBonus; empty: string }) {
  const parts = bonusParts(bonus);
  if (parts.length === 0) return <p className="mt-1 text-sm text-muted">{empty}</p>;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {parts.map((c) => (
        <Chip key={c.text} tone={c.good ? 'good' : 'bad'} icon={c.icon}>
          {c.text}
        </Chip>
      ))}
    </div>
  );
}
