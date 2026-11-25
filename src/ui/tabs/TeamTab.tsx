import type { GameState, Staff } from '../../types';
import { BALANCE } from '../../data/balance';
import { BOOSTS } from '../../data/boosts';
import { courseById } from '../../data/courses';
import { officeById } from '../../data/offices';
import { staffTitle } from '../../data/staff';
import { boostActive, boostPrice } from '../../sim/boosts';
import { licensePrice } from '../../sim/market';
import { freeSeats, isAvailable, rpPerWeek, weeklySalaries } from '../../sim/staff';
import { isResearchDone } from '../../sim/unlock';
import { useGame } from '../../store/useGame';
import { Icon } from '../icons';
import { Avatar, Bar, Btn, Card, Chip, IconBox, Notice, SectionTitle, cn } from '../primitives';
import { ShareSlider } from '../widgets';
import { useRun } from '../useRun';
import { fmtCount, fmtInt, fmtMoney } from '../format';

function Skill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between text-[11px] text-muted">
        <span className="truncate">{label}</span>
        <span className="num font-semibold text-text">{value}</span>
      </div>
      <Bar value={value} max={100} color={color} className="mt-0.5" />
    </div>
  );
}

/** выгорание: зелёное до 60, жёллое до 85, красное выше */
function burnColor(burnout: number): string {
  return burnout >= 85 ? 'var(--color-bad)' : burnout >= 60 ? 'var(--color-warn)' : 'var(--color-good)';
}

function burnTone(burnout: number): string {
  return burnout >= 85 ? 'text-bad' : burnout >= 60 ? 'text-warn' : 'text-good';
}

function StaffCard({ staff, game }: { staff: Staff; game: GameState }) {
  const openModal = useGame((s) => s.openModal);
  const setFocus = useGame((s) => s.setFocus);
  const toggleProject = useGame((s) => s.toggleProject);
  const sendVacation = useGame((s) => s.sendVacation);
  const fire = useGame((s) => s.fire);
  const run = useRun();
  const available = isAvailable(staff);
  const course = staff.training ? courseById(staff.training.courseId) : undefined;

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Avatar name={staff.name} color={staff.color} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{staff.name}</span>
            {staff.founder && <Chip tone="accent">вы</Chip>}
          </div>
          <div className="truncate text-xs text-muted">
            {staff.founder ? 'основатель лаборатории' : `${staffTitle(staff)} · ${fmtMoney(staff.salary)} в неделю`}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={staff.onProject}
          aria-label={`${staff.name}: работает над проектом`}
          disabled={!available || game.project === null}
          onClick={() => run(() => toggleProject(staff.id))}
          className={cn(
            'min-h-11 shrink-0 rounded-xl border px-3 text-xs font-medium transition-colors disabled:opacity-40',
            staff.onProject ? 'border-accent/60 bg-accent/15 text-[#cdc5ff]' : 'border-line bg-panel2 text-muted',
          )}
        >
          {staff.onProject ? 'В проекте' : 'Свободен'}
        </button>
      </div>

      {staff.training && course && (
        <Notice className="mt-2" tone="info" icon="grad">
          Учится: «{course.name}» · осталось {fmtCount(staff.training.weeksLeft, ['неделя', 'недели', 'недель'])}
        </Notice>
      )}
      {staff.vacationWeeks > 0 && (
        <Notice className="mt-2" tone="info" icon="bed">
          В отпуске · вернётся через {fmtCount(staff.vacationWeeks, ['неделю', 'недели', 'недель'])}
        </Notice>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Skill label="Наука" value={staff.research} color="var(--color-research)" />
        <Skill label="Инженерия" value={staff.engineering} color="var(--color-engineering)" />
        <Skill label="Скорость" value={staff.speed} color="var(--color-good)" />
      </div>

      <div className="mt-3">
        <div className="num flex justify-between text-xs font-medium">
          <span className="text-research">Фокус: наука {staff.focus}%</span>
          <span className="text-engineering">инженерия {100 - staff.focus}%</span>
        </div>
        <ShareSlider value={staff.focus} label={`Фокус ${staff.name}: доля исследований`} onChange={(v) => setFocus(staff.id, v)} />
      </div>

      <div className="mt-1 flex items-center gap-2">
        <Icon name="fire" className={cn('h-4 w-4 shrink-0', burnTone(staff.burnout))} />
        <Bar value={staff.burnout} max={100} color={burnColor(staff.burnout)} className="flex-1" />
        <span className="num w-[76px] text-right text-xs whitespace-nowrap text-muted">выгорание {Math.round(staff.burnout)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Btn icon="grad" disabled={!available} onClick={() => openModal({ kind: 'courses', staffId: staff.id })}>
          Обучить
        </Btn>
        <Btn icon="bed" disabled={!available || staff.burnout < 20} onClick={() => run(() => sendVacation(staff.id), `${staff.name} уходит в отпуск`)}>
          Отпуск
        </Btn>
      </div>
      {!staff.founder && (
        <Btn
          variant="ghost"
          icon="trash"
          className="mt-1 text-xs text-bad"
          onClick={() =>
            openModal({
              kind: 'confirm',
              title: 'Уволить сотрудника',
              text: `${staff.name} покинет лабораторию. Выходное пособие — ${fmtMoney(staff.salary * BALANCE.team.severanceWeeks)}.`,
              confirmLabel: 'Уволить',
              danger: true,
              onConfirm: () => run(() => fire(staff.id), `${staff.name} уволен(а)`),
            })
          }
        >
          Уволить · пособие {fmtMoney(staff.salary * BALANCE.team.severanceWeeks)}
        </Btn>
      )}
    </Card>
  );
}

function CandidateCard({ game, candidateId }: { game: GameState; candidateId: string }) {
  const hire = useGame((s) => s.hire);
  const run = useRun();
  const candidate = game.candidates.find((c) => c.id === candidateId);
  if (!candidate) return null;
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Avatar name={candidate.name} color={candidate.color} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{candidate.name}</div>
          <div className="truncate text-xs text-muted">
            {staffTitle(candidate)} · {fmtMoney(candidate.salary)} в неделю
          </div>
          <div className="num mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            <span className="text-research">наука {candidate.research}</span>
            <span className="text-engineering">инженерия {candidate.engineering}</span>
            <span className="text-good">скорость {candidate.speed}</span>
          </div>
        </div>
      </div>
      <Btn variant="primary" full className="mt-2" disabled={freeSeats(game) === 0} onClick={() => run(() => hire(candidate.id), `${candidate.name} принят(а) в команду`)}>
        {freeSeats(game) === 0 ? 'Нет свободных мест' : 'Нанять'}
      </Btn>
    </Card>
  );
}

function BoostCard({ game, id }: { game: GameState; id: string }) {
  const activateBoost = useGame((s) => s.activateBoost);
  const run = useRun();
  const def = BOOSTS.find((b) => b.id === id);
  if (!def) return null;
  const active = boostActive(game, def.id);
  const price = boostPrice(game, def.id);
  const left = game.boosts.find((b) => b.id === def.id && game.week < b.endsWeek);
  return (
    <Card className="flex flex-col gap-2 p-2.5">
      <div className="flex items-center gap-2">
        <IconBox icon={def.icon} tone="warn" />
        <span className="text-[13px] leading-tight font-semibold">{def.name}</span>
      </div>
      <p className="text-xs leading-snug text-muted">{def.desc}</p>
      <div className="mt-auto">
        {active && left ? (
          <Chip tone="good" icon="clock">
            ещё {fmtCount(left.endsWeek - game.week, ['неделю', 'недели', 'недель'])}
          </Chip>
        ) : (
          <Btn full className="min-h-11 px-2 text-sm" disabled={game.money < price} onClick={() => run(() => activateBoost(def.id), `«${def.name}»: применено`)}>
            {fmtMoney(price)}
          </Btn>
        )}
      </div>
    </Card>
  );
}

export function TeamTab() {
  const game = useGame((s) => s.game);
  const postJobs = useGame((s) => s.postJobs);
  const run = useRun();
  if (!game) return null;
  const office = officeById(game.office);
  const postPrice = licensePrice(game, BALANCE.team.jobPostCost);
  const boosts = BOOSTS.filter((b) => isResearchDone(game, b.research));
  const lockedBoosts = BOOSTS.length - boosts.length;

  return (
    <div>
      <SectionTitle>Команда</SectionTitle>
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <IconBox icon="office" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">{office.name}</div>
            <div className="num text-xs text-muted">
              {game.staff.length} из {office.capacity} мест · зарплата {fmtMoney(weeklySalaries(game))} в неделю
            </div>
          </div>
        </div>
        <p className="num mt-2 text-xs text-muted">
          Наука команды даёт +{rpPerWeek(game).toFixed(1)} И-очка в неделю. Сотрудник «в проекте» набирает очки модели, свободный — больше исследует.
        </p>
      </Card>

      <div className="mt-2 flex flex-col gap-2">
        {game.staff.map((staff) => (
          <StaffCard key={staff.id} staff={staff} game={game} />
        ))}
      </div>

      <SectionTitle
        action={
          <span className="num text-xs text-muted">
            {game.candidateRefreshIn > 0 ? `новые через ${game.candidateRefreshIn} нед.` : 'обновляются'}
          </span>
        }
      >
        Кандидаты
      </SectionTitle>
      {game.candidates.length === 0 ? (
        <Card className="p-3 text-sm text-muted">Сейчас никто не ищет работу. Разместите вакансии ещё раз.</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {game.candidates.map((c) => (
            <CandidateCard key={c.id} game={game} candidateId={c.id} />
          ))}
        </div>
      )}
      <Btn full className="mt-2" icon="team" disabled={game.money < postPrice} onClick={() => run(() => postJobs(), 'Вакансии размещены — новые кандидаты на экране')}>
        Искать кандидатов · {fmtMoney(postPrice)}
      </Btn>

      <SectionTitle action={<span className="num text-xs text-muted">{fmtInt(boosts.length)} из {BOOSTS.length} открыто</span>}>Бусты</SectionTitle>
      {boosts.length === 0 ? (
        <Card className="p-3 text-sm text-muted">Пока не открыто ни одного буста — изучите «Кухню для команды» в лаборатории.</Card>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {boosts.map((b) => (
            <BoostCard key={b.id} game={game} id={b.id} />
          ))}
        </div>
      )}
      {lockedBoosts > 0 && <p className="mt-2 text-xs text-muted">Ещё {lockedBoosts} бустов открываются исследованиями в лаборатории.</p>}
      <Btn variant="ghost" full icon="office" className="mt-3" onClick={() => useGame.getState().setTab('office')}>
        Офис и переезд
      </Btn>
    </div>
  );
}
