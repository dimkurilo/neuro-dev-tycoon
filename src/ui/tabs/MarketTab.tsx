import type { GameState, Gpu, Platform } from '../../types';
import { BALANCE } from '../../data/balance';
import { GPUS } from '../../data/gpus';
import { LIFECYCLE_LABEL, PLATFORMS, platformLifecycle, platformReach } from '../../data/platforms';
import { isGpuYear, isPlatformYear } from '../../sim/unlock';
import { licensePrice } from '../../sim/market';
import { loanOutstanding, maxLoan } from '../../sim/finance';
import { useGame } from '../../store/useGame';
import { Btn, Card, Chip, IconBox, IconButton, SectionTitle, cn } from '../primitives';
import { LifecycleSparkline } from '../Sparkline';
import { fmtCompact, fmtMoney, plural } from '../format';

const LIFECYCLE_TONE = { start: 'accent', growth: 'good', maturity: 'default', decline: 'warn' } as const;
const ANNUAL_RATE = Math.round(BALANCE.finance.loanRateWeekly * 52 * 100);

function PlatformCard({ platform, game, onLicense }: { platform: Platform; game: GameState; onLicense: () => void }) {
  const licensed = game.platforms.includes(platform.id);
  const available = isPlatformYear(game, platform.year);
  const price = licensePrice(game, platform.license);
  const lifecycle = platformLifecycle(platform, game.week);
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <IconBox icon={platform.icon} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[15px] font-semibold">{platform.name}</span>
            <Chip tone={LIFECYCLE_TONE[lifecycle]}>{LIFECYCLE_LABEL[lifecycle]}</Chip>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-muted">{platform.desc}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="num text-xs leading-relaxed text-muted">
          охват <b className="text-text">{Math.round(platformReach(platform, game.week))}</b> из 100
          <br />
          лаборатории <b className="text-text">{Math.round(platform.share * 100)}%</b> выручки
        </div>
        <LifecycleSparkline platform={platform} week={game.week} />
      </div>
      <div className="mt-2">
        {licensed ? (
          <Chip tone="good" icon="check">
            Лицензия есть
          </Chip>
        ) : (
          <Btn full icon="key" disabled={!available || game.money < price} onClick={onLicense}>
            {available ? `Купить лицензию · ${fmtMoney(price)}` : `Появится в ${platform.year} году`}
          </Btn>
        )}
      </div>
    </Card>
  );
}

function GpuCard({ gpu, game, onUse, onRent }: { gpu: Gpu; game: GameState; onUse: () => void; onRent: () => void }) {
  const owned = game.gpus.includes(gpu.id);
  const current = game.gpu === gpu.id;
  const available = isGpuYear(game, gpu.year);
  const price = licensePrice(game, gpu.license);
  return (
    <Card className={cn('p-3', !available && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <IconBox icon="chip" tone="warn" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[15px] font-semibold">{gpu.name}</span>
            {current && (
              <Chip tone="accent" icon="check">
                используется
              </Chip>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-snug text-muted">{gpu.desc}</p>
        </div>
      </div>
      <p className="num mt-2 text-xs text-muted">
        ×{gpu.compute.toFixed(1)} к очкам · {gpu.weeklyCost > 0 ? `${fmtMoney(gpu.weeklyCost)} за неделю обучения` : 'обучение бесплатно'}
      </p>
      {!current && available && (
        <Btn full className="mt-2" icon={owned ? 'check' : 'key'} disabled={!owned && game.money < price} onClick={owned ? onUse : onRent}>
          {owned ? 'Использовать в новых проектах' : `Арендовать · ${fmtMoney(price)}`}
        </Btn>
      )}
    </Card>
  );
}

export function MarketTab() {
  const game = useGame((s) => s.game);
  const toast = useGame((s) => s.toast);
  const licensePlatform = useGame((s) => s.licensePlatform);
  const licenseGpu = useGame((s) => s.licenseGpu);
  const useGpu = useGame((s) => s.useGpu);
  const takeLoan = useGame((s) => s.takeLoan);
  const repayLoan = useGame((s) => s.repayLoan);
  if (!game) return null;

  /** выполняет действие и показывает ошибку, если симуляция отказала */
  const run = (action: () => string | null, done?: string) => {
    const error = action();
    if (error) toast(error, 'bad');
    else if (done) toast(done, 'good');
  };

  const limit = maxLoan(game);
  const room = Math.max(0, limit - loanOutstanding(game));
  const weeksLeft = BALANCE.finance.insolvencyLimit - game.insolvency;

  return (
    <div>
      <SectionTitle>Платформы деплоя</SectionTitle>
      <p className="mb-2 text-xs text-muted">Лицензия покупается один раз. Модель приносит больше, пока платформа на подъёме.</p>
      <div className="flex flex-col gap-2">
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p.id}
            platform={p}
            game={game}
            onLicense={() => run(() => licensePlatform(p.id), `Лицензия «${p.name}» куплена`)}
          />
        ))}
      </div>

      <SectionTitle>Вычисления</SectionTitle>
      <p className="mb-2 text-xs text-muted">Аренда поколения ускорителей открывает его для новых проектов. GPU-часы оплачиваются только во время разработки.</p>
      <div className="flex flex-col gap-2">
        {GPUS.map((g) => (
          <GpuCard key={g.id} gpu={g} game={game} onUse={() => run(() => useGpu(g.id), `Новые проекты будут обучаться на «${g.name}»`)} onRent={() => run(() => licenseGpu(g.id), `«${g.name}» подключены`)} />
        ))}
      </div>

      <SectionTitle>Кредит</SectionTitle>
      <Card className="p-3">
        <p className="num text-sm">
          Лимит <b>{fmtMoney(limit)}</b> · доступно <b>{fmtMoney(room)}</b>
        </p>
        <p className="mt-1 text-sm text-muted">Проценты списываются каждую неделю — {ANNUAL_RATE} {plural(ANNUAL_RATE, ['процент', 'процента', 'процентов'])} годовых. Лимит растёт вместе с рынком и цитируемостью.</p>
        <div className="num mt-3 text-xs text-muted">Взять в кредит, Cr</div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {[0.25, 0.5, 1].map((share) => {
            const amount = Math.floor((room * share) / 500) * 500;
            return (
              <Btn key={share} disabled={amount < 500} aria-label={`Взять в кредит ${fmtMoney(amount)}`} onClick={() => run(() => takeLoan(amount), `Взято ${fmtMoney(amount)}`)}>
                {fmtCompact(amount)}
              </Btn>
            );
          })}
        </div>
        {game.loans.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {game.loans.map((loan) => (
              <li key={loan.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel2 p-2">
                <div className="num min-w-0 flex-1 text-sm">
                  долг <b>{fmtMoney(loan.balance)}</b>
                  <div className="text-xs text-muted">{fmtMoney(loan.balance * loan.rate)} процентов в неделю</div>
                </div>
                <IconButton icon="check" label="Погасить кредит целиком" disabled={game.money < loan.balance} onClick={() => run(() => repayLoan(loan.id, loan.balance), 'Кредит погашен')} />
              </li>
            ))}
          </ul>
        )}
        {game.insolvency > 0 && (
          <p className="mt-3 text-sm text-bad">
            Баланс в минусе. До суда о банкротстве осталось {weeksLeft} {plural(weeksLeft, ['неделя', 'недели', 'недель'])}.
          </p>
        )}
      </Card>
    </div>
  );
}
