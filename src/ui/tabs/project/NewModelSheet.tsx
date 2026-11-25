import { useState, type ReactNode } from 'react';
import type { Fit, ScaleId } from '../../../types';
import { DOMAINS, domainById } from '../../../data/domains';
import { PARADIGMS, paradigmById } from '../../../data/paradigms';
import { PLATFORMS, platformById, platformReach } from '../../../data/platforms';
import { GPUS, gpuById } from '../../../data/gpus';
import { FIT_LABEL, SCALES, scaleById } from '../../../data/compat';
import { phaseWeeksTotal } from '../../../data/fields';
import { expectedPoints } from '../../../sim/release';
import { compatibleContracts } from '../../../sim/contracts';
import { gpuWeeklyCostOf } from '../../../sim/project';
import { isDomainOpen, isGpuYear, isParadigmOpen, isPlatformYear, isScaleOpen, lockReason } from '../../../sim/unlock';
import { licensePrice } from '../../../sim/market';
import { knownFit } from '../../../sim/perks';
import { Rng, randomSeed } from '../../../sim/rng';
import { suggestModelName } from '../../../data/names';
import { useGame } from '../../../store/useGame';
import { Icon, type IconName } from '../../icons';
import { Btn, Chip, DefList, Notice, Sheet, cn } from '../../primitives';
import { fmtCount, fmtInt, fmtMoney } from '../../format';

const STEPS = ['Домен', 'Парадигма', 'Платформа', 'Масштаб', 'Вычисления', 'Название'] as const;
const FIT_TONE: Record<Fit, 'good' | 'default' | 'bad'> = { ideal: 'good', ok: 'default', weird: 'bad' };

interface Lockable {
  icon: IconName;
  name: string;
  reason: string;
}

/** карточка-кнопка выбора: крупная зона нажатия, состояние «выбрано» */
function OptionCard({ icon, title, sub, selected, disabled, onPress, trailing }: { icon: IconName; title: string; sub?: ReactNode; selected?: boolean; disabled?: boolean; onPress?: () => void; trailing?: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onPress}
      className={cn(
        'flex min-h-16 w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-45',
        selected ? 'border-accent bg-accent/15' : 'border-line bg-panel2 active:bg-panel3',
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-accent text-[#15102e]' : 'bg-panel3 text-muted')}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug font-semibold">{title}</span>
        {sub && <span className="num mt-0.5 block text-xs leading-snug text-muted">{sub}</span>}
      </span>
      {trailing}
    </button>
  );
}

/** закрытый пункт: видно, чего именно не хватает */
function LockedRow({ icon, name, reason }: Lockable) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 opacity-75">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-panel2 text-muted">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{name}</span>
        <span className="block truncate text-xs text-muted">{reason}</span>
      </span>
      <Icon name="lock" className="h-4 w-4 shrink-0 text-muted" />
    </div>
  );
}

function LockedList({ items }: { items: Lockable[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <Btn variant="ghost" full icon={open ? 'up' : 'down'} className="text-xs" onClick={() => setOpen((v) => !v)}>
        {open ? 'Скрыть недоступное' : `Недоступно: ${items.length}`}
      </Btn>
      {open && (
        <div className="mt-1 flex flex-col">
          {items.map((it) => (
            <LockedRow key={it.name} {...it} />
          ))}
        </div>
      )}
    </div>
  );
}

function StepHeader({ title, hint, text }: { title: string; hint: string; text: string }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{hint}</p>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}

/** мастер создания модели: шесть вертикальных шагов */
export function NewModelSheet({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game);
  const startModel = useGame((s) => s.startModel);
  const toast = useGame((s) => s.toast);
  const [step, setStep] = useState(0);
  const [domainId, setDomainId] = useState<string | null>(null);
  const [paradigmId, setParadigmId] = useState<string | null>(null);
  const [platformId, setPlatformId] = useState('web');
  const [scaleId, setScaleId] = useState<ScaleId>('pet');
  const [gpuId, setGpuId] = useState('g0');
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [contractId, setContractId] = useState<number | null>(null);

  if (!game) return null;
  const domain = domainId ? domainById(domainId) : null;
  const scale = scaleById(scaleId);
  const gpu = gpuById(gpuId);
  const last = step === STEPS.length - 1;

  const ready =
    step === 0 ? domainId !== null
    : step === 1 ? paradigmId !== null
    : step === 4 ? game.gpus.includes(gpuId)
    : last ? name.trim().length > 0
    : true;

  const pickDomain = (id: string) => {
    setDomainId(id);
    if (!nameEdited) setName(suggestModelName(new Rng(randomSeed()), domainById(id).prefix));
  };

  const next = () => {
    if (!last) {
      setStep(step + 1);
      return;
    }
    if (!domain || !paradigmId) return;
    const error = startModel({ name, domain: domain.id, paradigm: paradigmId, platform: platformId, scale: scaleId, gpu: gpuId, contractId });
    if (error) toast(error, 'bad');
    else onClose();
  };

  const licensedGpus = GPUS.filter((g) => game.gpus.includes(g.id));
  const gpuCostLabel = (g: (typeof GPUS)[number]) => {
    const cost = gpuWeeklyCostOf(g, scaleId);
    return cost > 0 ? `${fmtMoney(cost)} за неделю` : 'бесплатно';
  };

  let body: ReactNode;
  switch (step) {
    case 0:
      body = (
        <>
          <StepHeader title="Что будет делать модель?" hint="Домен" text="Домен задаёт задачу и то, какие парадигмы ей подходят." />
          <div className="grid grid-cols-2 gap-2">
            {DOMAINS.filter((d) => isDomainOpen(game, d)).map((d) => (
              <OptionCard key={d.id} icon={d.icon} title={d.name} selected={d.id === domainId} onPress={() => pickDomain(d.id)} />
            ))}
          </div>
          {domain && <Notice className="mt-3" tone="info" icon={domain.icon}>{domain.desc}</Notice>}
          <LockedList items={DOMAINS.filter((d) => !isDomainOpen(game, d)).map((d) => ({ icon: d.icon, name: d.name, reason: lockReason(game, d.research, d.year) ?? '' }))} />
        </>
      );
      break;
    case 1: {
      const options = PARADIGMS.filter((p) => isParadigmOpen(game, p));
      body = (
        <>
          <StepHeader title="Как она устроена?" hint="Парадигма" text="У каждой пары домен × парадигма своя совместимость. Идеальные пары получают бонус к оценкам." />
          {domain && (
            <div className="mb-2">
              <Chip icon={domain.icon} tone="accent">
                {domain.name}
              </Chip>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {options.map((p) => {
              const fit = domain ? knownFit(game, domain.id, p.id) : null;
              return (
                <OptionCard
                  key={p.id}
                  icon={p.icon}
                  title={p.name}
                  sub={p.desc}
                  selected={p.id === paradigmId}
                  onPress={() => setParadigmId(p.id)}
                  trailing={fit ? <Chip tone={FIT_TONE[fit]}>{FIT_LABEL[fit]}</Chip> : <span className="text-xs text-muted">?</span>}
                />
              );
            })}
          </div>
          <LockedList items={PARADIGMS.filter((p) => !isParadigmOpen(game, p)).map((p) => ({ icon: p.icon, name: p.name, reason: lockReason(game, p.research, p.year) ?? '' }))} />
        </>
      );
      break;
    }
    case 2:
      body = (
        <>
          <StepHeader title="Где будет работать?" hint="Платформа деплоя" text="Платформа задаёт аудиторию и долю выручки, которая остаётся лаборатории." />
          <div className="flex flex-col gap-2">
            {PLATFORMS.filter((p) => game.platforms.includes(p.id)).map((p) => (
              <OptionCard
                key={p.id}
                icon={p.icon}
                title={p.name}
                sub={`лаборатории ${Math.round(p.share * 100)}% выручки · охват ${Math.round(platformReach(p, game.week))}`}
                selected={p.id === platformId}
                onPress={() => setPlatformId(p.id)}
              />
            ))}
          </div>
          <LockedList
            items={PLATFORMS.filter((p) => !game.platforms.includes(p.id)).map((p) => ({
              icon: p.icon,
              name: p.name,
              reason: isPlatformYear(game, p.year) ? `лицензия за ${fmtMoney(licensePrice(game, p.license))} — на вкладке «Рынок»` : `появится в ${p.year} году`,
            }))}
          />
        </>
      );
      break;
    case 3:
      body = (
        <>
          <StepHeader title="Насколько большой проект?" hint="Масштаб" text="Крупнее модель — дольше делать и выше ожидания рынка." />
          <div className="flex flex-col gap-2">
            {SCALES.map((s) => {
              const open = isScaleOpen(game, s);
              const weeks = phaseWeeksTotal(s.weeks);
              return (
                <OptionCard
                  key={s.id}
                  icon="trend"
                  title={s.name}
                  sub={
                    open
                      ? `${fmtCount(weeks, ['неделя', 'недели', 'недель'])} разработки · ожидания ×${(s.expected / SCALES[0].expected).toFixed(1)}`
                      : (lockReason(game, s.research, 0) ?? '')
                  }
                  selected={s.id === scaleId}
                  disabled={!open}
                  onPress={() => setScaleId(s.id)}
                />
              );
            })}
          </div>
          {scale.id !== 'pet' && <Notice className="mt-3" tone="info" icon="info">Крупному проекту нужны команда и мощности: в одиночку не набрать ожидаемое число очков.</Notice>}
        </>
      );
      break;
    case 4:
      body = (
        <>
          <StepHeader title="На чём обучаем?" hint="Вычисления" text="Мощнее ускорители — больше очков за неделю и дороже GPU-часы." />
          <div className="flex flex-col gap-2">
            {licensedGpus.map((g) => (
              <OptionCard key={g.id} icon="chip" title={g.name} sub={`×${g.compute.toFixed(1)} к очкам · ${gpuCostLabel(g)}`} selected={g.id === gpuId} onPress={() => setGpuId(g.id)} />
            ))}
          </div>
          <LockedList
            items={GPUS.filter((g) => !game.gpus.includes(g.id) && isGpuYear(game, g.year)).map((g) => ({
              icon: 'chip',
              name: g.name,
              reason: `аренда за ${fmtMoney(licensePrice(game, g.license))} — на вкладке «Рынок»`,
            }))}
          />
        </>
      );
      break;
    default: {
      const paradigm = paradigmId ? paradigmById(paradigmId) : null;
      const fit = domain && paradigm ? knownFit(game, domain.id, paradigm.id) : null;
      const weeks = phaseWeeksTotal(scale.weeks);
      // заказы в работе, под которые подходит выбранная связка
      const contracts = domain && paradigm ? compatibleContracts(game, { domain: domain.id, paradigm: paradigm.id, platform: platformId, scale: scaleId }) : [];
      body = (
        <>
          <StepHeader title="Как назовём модель?" hint="Название и итог" text="Название увидят агентства и клиенты в чартах." />
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameEdited(true);
              }}
              maxLength={28}
              placeholder="Название модели"
              aria-label="Название модели"
              className="field min-w-0 flex-1"
            />
            <Btn aria-label="Придумать название" disabled={!domain} onClick={() => domain && setName(suggestModelName(new Rng(randomSeed()), domain.prefix))} className="px-3">
              <Icon name="spark" className="h-5 w-5" />
            </Btn>
          </div>
          {contracts.length > 0 && (
            <>
              <div className="mb-2 mt-5 flex min-h-9 items-center">
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Заказ клиента</h3>
              </div>
              <div className="flex flex-col gap-2">
                <OptionCard icon="doc" title="Без заказа" selected={contractId === null} onPress={() => setContractId(null)} />
                {contracts.map((contract) => (
                  <OptionCard
                    key={contract.uid}
                    icon="briefcase"
                    title={contract.title}
                    sub={`${contract.client} · оплата ${fmtMoney(contract.pay)} · ещё ${contract.deadlineWeek - game.week} нед.`}
                    selected={contractId === contract.uid}
                    onPress={() => setContractId(contract.uid)}
                  />
                ))}
              </div>
            </>
          )}
          <DefList
            className="mt-4"
            rows={[
              ['Домен', domain?.name ?? '—'],
              ['Парадигма', paradigm ? `${paradigm.name}${fit ? ` · ${FIT_LABEL[fit].toLowerCase()}` : ''}` : '—'],
              ['Платформа', platformById(platformId).name],
              ['Масштаб', `${scale.name} · ${fmtCount(weeks, ['неделя', 'недели', 'недель'])}`],
              ['Вычисления', `${gpu.name} · ×${gpu.compute.toFixed(1)} к очкам`],
              ['GPU-часы', gpuCostLabel(gpu)],
              ['Ожидания рынка', `${fmtInt(expectedPoints(scale.id, game.week))} очков`],
            ]}
          />
        </>
      );
    }
  }

  return (
    <Sheet
      title="Новая модель"
      onClose={onClose}
      tall
      footer={
        <div className="flex gap-2">
          <Btn className="flex-1" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Назад
          </Btn>
          <Btn variant="primary" className="flex-[2]" disabled={!ready} onClick={next}>
            {last ? 'Начать разработку' : 'Дальше'}
          </Btn>
        </div>
      }
    >
      <ol className="mb-4 flex gap-1" aria-label={`Шаг ${step + 1} из ${STEPS.length}`}>
        {STEPS.map((label, i) => (
          <li key={label} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-accent' : 'bg-line')} title={label} />
        ))}
      </ol>
      {body}
    </Sheet>
  );
}
