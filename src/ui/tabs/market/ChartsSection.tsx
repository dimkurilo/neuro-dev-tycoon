import { useState } from 'react';
import { domainById } from '../../../data/domains';
import { leaderboard, weeklyChart, type ChartEntry } from '../../../sim/rivals';
import { useGame } from '../../../store/useGame';
import { Icon } from '../../icons';
import { Card, Chip, cn } from '../../primitives';
import { fmt1, fmtMoney } from '../../format';

/** чарт моделей недели по выручке и лидерборд бенчмарков по оценкам */
export function ChartsSection() {
  const game = useGame((s) => s.game);
  const [mode, setMode] = useState<'chart' | 'board'>('chart');
  if (!game) return null;
  const entries = mode === 'chart' ? weeklyChart(game) : leaderboard(game);
  const best = entries.findIndex((e) => e.mine) + 1;

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel2 p-1" role="group" aria-label="Вид рейтинга">
        {(
          [
            ['chart', 'Чарт недели'],
            ['board', 'Лидерборд'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={cn('min-h-11 rounded-[10px] text-[15px] font-medium transition-colors', mode === id ? 'bg-accent text-[#15102e]' : 'text-muted active:bg-panel3')}>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        {mode === 'chart'
          ? 'Кто больше всех заработал за последнюю неделю — ваши модели и лаборатории-конкуренты.'
          : 'Лучшие средние оценки бенчмарк-агентств за последние два года.'}
        {best > 0 && (
          <>
            {' '}
            Лучшая из ваших — на <b className="text-text">{best}-м месте</b>.
          </>
        )}
      </p>
      {entries.length === 0 ? (
        <Card className="mt-3 px-4 py-6 text-center text-sm text-muted">Пока ни у кого нет продаж. Выпустите модель — и она попадёт в чарт.</Card>
      ) : (
        <ol className="mt-3 flex flex-col gap-1.5">
          {entries.map((entry, index) => (
            <ChartRow key={entry.key} entry={entry} position={index + 1} mode={mode} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ChartRow({ entry, position, mode }: { entry: ChartEntry; position: number; mode: 'chart' | 'board' }) {
  return (
    <li className={cn('flex min-h-14 items-center gap-3 rounded-xl border px-3 py-1.5', entry.mine ? 'border-accent/60 bg-accent/15' : 'border-line bg-panel')}>
      <span className={cn('num w-6 shrink-0 text-center text-sm font-bold', position <= 3 ? 'text-warn' : 'text-muted')}>{position}</span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: entry.color }}>
        <Icon name={domainById(entry.domain).icon} className="h-[18px] w-[18px] text-bg" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{entry.name}</span>
        <span className="block truncate text-xs text-muted">
          {entry.owner} · {domainById(entry.domain).name}
        </span>
      </span>
      {entry.mine && (
        <Chip tone="accent" className="hidden min-[400px]:inline-flex">
          ваша
        </Chip>
      )}
      <span className="num w-[76px] shrink-0 text-right text-sm font-semibold">{mode === 'chart' ? fmtMoney(entry.revenue) : fmt1(entry.rating)}</span>
    </li>
  );
}
