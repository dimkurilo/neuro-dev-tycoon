import { AGENCIES } from '../../../data/agencies';
import { domainById } from '../../../data/domains';
import { FIT_LABEL } from '../../../data/compat';
import { paradigmById } from '../../../data/paradigms';
import { platformById } from '../../../data/platforms';
import { formatDate } from '../../../sim/time';
import { peakWeek } from '../../../sim/sales';
import { useGame } from '../../../store/useGame';
import { Icon } from '../../icons';
import { Btn, DefList, Notice, Sheet, cn } from '../../primitives';
import { useAutoClose } from '../../useAutoClose';
import { fmt1, fmtInt } from '../../format';
import { ratingTone } from '../../widgets';

function balanceLabel(factor: number): string {
  if (factor >= 0.95) return 'почти идеальный';
  if (factor >= 0.85) return 'хороший';
  if (factor >= 0.75) return 'заметный перекос';
  return 'сильный перекос';
}

function noveltyLabel(uses: number): string {
  if (uses === 0) return 'новая связка — бонус';
  if (uses === 1) return 'вторая модель в связке';
  if (uses <= 3) return 'привычная связка';
  return 'заезженная связка — штраф';
}

/** отчёт о релизе: четыре оценки агентств с цитатами и разбор того, что повлияло */
export function ReleaseModal({ modelId, onClose }: { modelId: number; onClose: () => void }) {
  const model = useGame((s) => s.game?.models.find((m) => m.id === modelId));
  const week = useGame((s) => s.game?.week ?? 0);
  useAutoClose(!model);
  if (!model) return null;
  const domain = domainById(model.domain);
  const report = model.report;
  const hypeAndTrend = Math.round((report.hypeFactor * report.trendFactor - 1) * 100);
  const penalty = report.degradationPenalty;
  return (
    <Sheet title={model.releasedWeek === week ? 'Модель вышла в свет' : 'Отчёт о релизе'} onClose={onClose} footer={<Btn variant="primary" full onClick={onClose}>К продажам</Btn>}>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-panel2">
          <Icon name={domain.icon} className="h-6 w-6 text-accent" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg leading-tight font-bold">{model.name}</div>
          <div className="truncate text-xs text-muted">
            {domain.name} · {paradigmById(model.paradigm).name} · {platformById(model.platform).name}
          </div>
          <div className="num text-xs text-muted">{formatDate(model.releasedWeek)}</div>
        </div>
        <div className="shrink-0 text-center">
          <div className={cn('num text-4xl leading-none font-extrabold', ratingTone(model.rating))}>{fmt1(model.rating)}</div>
          <div className="mt-1 text-[11px] text-muted">средняя оценка</div>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {model.reviews.map((r) => {
          const agency = AGENCIES.find((a) => a.name === r.agency);
          return (
            <li key={r.agency} className="rounded-xl border border-line border-l-[3px] bg-panel2 p-3" style={{ borderLeftColor: agency?.color ?? '#8b7bff' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{agency?.name ?? r.agency}</span>
                <span className={cn('num text-lg font-bold', ratingTone(r.score))}>{fmt1(r.score)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">«{r.quote}»</p>
            </li>
          );
        })}
      </ul>

      <div className="mb-2 mt-5 flex min-h-9 items-center">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Что повлияло на оценки</h3>
      </div>
      <DefList
        rows={[
          ['Очки против ожиданий рынка', `${Math.round(report.ratio * 100)}%`],
          ['Баланс исследований и инженерии', balanceLabel(report.balanceFactor)],
          ['Совместимость домена и парадигмы', FIT_LABEL[report.fit].toLowerCase()],
          ['Новизна связки', noveltyLabel(report.noveltyUses)],
          ['Хайп и тренды', `${hypeAndTrend >= 0 ? '+' : '−'}${Math.abs(hypeAndTrend)}%`],
          ['Деградации при выпуске', penalty === 0 ? 'не осталось' : `штраф ${fmt1(penalty)}`],
        ]}
      />
      <Notice className="mt-3" tone="good" icon="doc">
        Цитируемость выросла на {fmtInt(model.fansGained)}. Пик продаж — на {peakWeek() + 1}-й неделе после релиза.
      </Notice>
    </Sheet>
  );
}
