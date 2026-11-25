import type { ReleasedModel } from '../../../types';
import { useGame } from '../../../store/useGame';
import { domainById } from '../../../data/domains';
import { Icon } from '../../icons';
import { Row } from '../../primitives';
import { Sparkline } from '../../Sparkline';
import { RatingBadge } from '../../widgets';
import { fmtMoney, fmtSigned } from '../../format';

const NO_MODELS: ReleasedModel[] = [];

/** выпущенные модели: оценка, выручка за неделю и форма кривой продаж */
export function ReleasesList() {
  const models = useGame((s) => s.game?.models ?? NO_MODELS);
  const week = useGame((s) => s.game?.week ?? 0);
  const openModal = useGame((s) => s.openModal);
  if (models.length === 0) return null;
  const latest = [...models].reverse();
  return (
    <section>
      <div className="mb-2 flex min-h-9 items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Релизы</h3>
        <span className="num text-xs text-muted">{models.length} всего</span>
      </div>
      <div className="divide-y divide-line rounded-card border border-line bg-panel">
        {latest.map((m) => {
          const selling = m.lastRevenue > 0;
          return (
            <Row key={m.id} className="px-3" onClick={() => openModal({ kind: 'model', modelId: m.id })}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel2">
                <Icon name={domainById(m.domain).icon} className="h-5 w-5 text-accent" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{m.name}</div>
                <div className="num truncate text-xs text-muted">{week - m.releasedWeek > 1 ? `${fmtMoney(m.totalRevenue)} всего` : 'вышла на этой неделе'}</div>
              </div>
              {/* мини-график уступает место названию модели на экранах уже 390px; выручка за неделю остаётся цифрой */}
              <span className="hidden shrink-0 min-[390px]:block">
                <Sparkline data={m.weekly} color="var(--color-good)" width={56} height={24} />
              </span>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <RatingBadge score={m.rating} size="sm" />
                {selling && (
                  <span className="num text-[11px] leading-none text-good" aria-label={`Выручка за неделю: ${fmtSigned(m.lastRevenue)} Cr`}>
                    {fmtSigned(m.lastRevenue)}
                  </span>
                )}
              </div>
            </Row>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">Оценка и выручка за неделю. Нажмите на модель, чтобы увидеть отчёт агентств.</p>
    </section>
  );
}
