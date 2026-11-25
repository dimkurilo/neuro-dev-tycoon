import { useState } from 'react';
import type { ExpansionType } from '../../../types';
import { EXPANSIONS, EXPANSION_ORDER } from '../../../data/expansions';
import { featureById } from '../../../data/features';
import { scaleById } from '../../../data/compat';
import { canExpand, expansionWeeks } from '../../../sim/expansions';
import { phaseWeeksTotal } from '../../../data/fields';
import { useGame } from '../../../store/useGame';
import { Icon } from '../../icons';
import { Btn, DefList, Notice, SectionTitle, Sheet, cn } from '../../primitives';
import { useRun } from '../../useRun';
import { fmt1, fmtCount } from '../../format';

const WEEKS = ['неделя', 'недели', 'недель'] as const;

/** новая версия выпущенной модели: выбор базовой модели и типа версии */
export function ExpansionSheet({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game);
  const startExpansion = useGame((s) => s.startExpansion);
  const run = useRun();
  const [baseId, setBaseId] = useState<number | null>(null);
  const [type, setType] = useState<ExpansionType | null>(null);
  const [name, setName] = useState('');
  if (!game) return null;

  const bases = [...game.models].reverse();
  const base = baseId !== null ? (bases.find((m) => m.id === baseId) ?? null) : null;
  const error = base && type ? canExpand(game, base.id, type) : null;
  const def = type ? EXPANSIONS[type] : null;
  const title = name.trim() || (base && type ? `${base.name}${EXPANSIONS[type].suffix}` : '');
  const weeks = base && type ? phaseWeeksTotal(expansionWeeks(base, type)) : 0;

  const start = () => {
    if (!base || !type) return;
    run(() => startExpansion(base.id, type, title), `Разработка «${title}» начата`);
    onClose();
  };

  return (
    <Sheet
      title="Новая версия модели"
      onClose={onClose}
      tall
      footer={
        <Btn variant="primary" full icon="copy" disabled={!base || !type || error !== null} onClick={start}>
          {!base ? 'Выберите модель' : !type ? 'Выберите тип версии' : (error ?? `Начать разработку · ${fmtCount(weeks, WEEKS)}`)}
        </Btn>
      }
    >
      <p className="text-sm text-muted">Версия дообучает уже выпущенную модель: разработка короче, а оригинал получает новую волну продаж.</p>

      <SectionTitle>Базовая модель</SectionTitle>
      {bases.length === 0 ? (
        <Notice tone="warn" icon="alert">Сначала выпустите хотя бы одну модель.</Notice>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {bases.map((model) => (
            <button
              key={model.id}
              type="button"
              aria-pressed={model.id === baseId}
              onClick={() => setBaseId(model.id)}
              className={cn('flex min-h-16 w-full flex-col justify-center rounded-xl border p-2.5 text-left transition-colors', model.id === baseId ? 'border-accent bg-accent/15' : 'border-line bg-panel2 active:bg-panel3')}
            >
              <span className="line-clamp-2 text-[13px] leading-snug font-semibold">{model.name}</span>
              <span className="num mt-0.5 text-xs text-muted">
                {scaleById(model.scale).name} · оценка {fmt1(model.rating)}
              </span>
            </button>
          ))}
        </div>
      )}

      <SectionTitle>Тип версии</SectionTitle>
      <div className="flex flex-col gap-2">
        {EXPANSION_ORDER.map((id) => {
          const option = EXPANSIONS[id];
          const reason = base ? canExpand(game, base.id, id) : null;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={type === id}
              onClick={() => setType(id)}
              className={cn('flex min-h-16 w-full items-start gap-3 rounded-xl border p-2.5 text-left transition-colors', type === id ? 'border-accent bg-accent/15' : 'border-line bg-panel2 active:bg-panel3')}
            >
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', type === id ? 'bg-accent text-[#15102e]' : 'bg-panel3 text-muted')}>
                <Icon name="copy" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-snug font-semibold">{option.name}</span>
                <span className="block text-xs leading-snug text-muted">{option.desc}</span>
                {base && reason && <span className="mt-0.5 block text-xs text-warn">{reason}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {base && def && (
        <>
          <SectionTitle>Итог</SectionTitle>
          <label className="text-xs font-semibold tracking-wide text-muted uppercase">
            Название версии
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${base.name}${def.suffix}`} maxLength={28} aria-label="Название версии" className="field mt-1 font-normal tracking-normal normal-case" />
          </label>
          <DefList
            className="mt-3"
            rows={[
              ['Базовая модель', base.name],
              ['Разработка', fmtCount(weeks, WEEKS)],
              ['Ожидания рынка', `×${def.expectedMult.toFixed(2).replace(/0$/, '').replace('.', ',')} от базового масштаба`],
              ['Волна продаж оригинала', `×${def.waveMult.toFixed(2).replace(/0$/, '').replace('.', ',')}`],
              ['Нужны функции', def.requires.length > 0 ? def.requires.map((id) => featureById(id)?.name ?? id).join(', ') : 'не нужны'],
            ]}
          />
        </>
      )}
    </Sheet>
  );
}
