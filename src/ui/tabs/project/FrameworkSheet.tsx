import { useState } from 'react';
import { FEATURES, featureById } from '../../../data/features';
import { describeFeature } from '../../../data/describe';
import { availableFeatures, canStartFramework, defaultFrameworkName, frameworkCost, frameworkWeeks } from '../../../sim/framework';
import { useGame } from '../../../store/useGame';
import { Icon } from '../../icons';
import { Btn, Card, DefList, IconBox, Notice, SectionTitle, Sheet, cn } from '../../primitives';
import { useRun } from '../../useRun';
import { fmtCount, fmtMoney } from '../../format';

/** свой фреймворк: текущая версия и сборка следующей из исследованных функций */
export function FrameworkSheet({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game);
  const startFramework = useGame((s) => s.startFramework);
  const run = useRun();
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  if (!game) return null;

  const built = game.framework.features.map(featureById).filter((f) => f !== undefined);
  const available = availableFeatures(game);
  const locked = FEATURES.length - built.length - available.length;
  const version = game.framework.version;
  const weeks = frameworkWeeks(game, selected);
  const cost = frameworkCost(game, selected);
  const error = selected.length > 0 ? canStartFramework(game, selected) : null;
  const title = name.trim() || defaultFrameworkName(game);

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const start = () => {
    run(() => startFramework(selected, title), `Разработка «${title}» v${version + 1} начата`);
    onClose();
  };

  return (
    <Sheet
      title="Свой фреймворк"
      onClose={onClose}
      tall
      footer={
        <Btn variant="primary" full icon="wrench" disabled={selected.length === 0 || error !== null} onClick={start}>
          {selected.length === 0 ? 'Выберите функции' : error ?? `Собрать v${version + 1} · ${fmtCount(weeks, ['неделя', 'недели', 'недель'])} · ${fmtMoney(cost)}`}
        </Btn>
      }
    >
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <IconBox icon="wrench" tone={built.length > 0 ? 'accent' : 'muted'} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{game.framework.name}</div>
            <div className="num text-xs text-muted">{version === 0 ? 'чужие библиотеки без надстроек' : `версия ${version} · ${fmtCount(built.length, ['функция', 'функции', 'функций'])}`}</div>
          </div>
        </div>
        {built.length === 0 ? (
          <Notice className="mt-2" tone="info" icon="info">
            Пока лаборатория работает на чужих библиотеках. Изучите функции в лаборатории и соберите свою первую версию: каждая функция ускоряет разработку или повышает качество моделей.
          </Notice>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {built.map((feature) => (
              <li key={feature.id} className="flex items-start gap-2 text-sm">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                <span className="min-w-0">
                  <span className="font-medium">{feature.name}</span>
                  <span className="block text-xs text-muted">{describeFeature(feature)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SectionTitle action={<span className="text-xs text-muted">{available.length} доступно</span>}>Добавить в новую версию</SectionTitle>
      {available.length === 0 ? (
        <Notice tone="warn" icon="lock">
          Нет новых исследованных функций. {locked > 0 ? `Ещё ${locked} открываются исследованиями в лаборатории.` : 'Все функции уже включены.'}
        </Notice>
      ) : (
        <div className="flex flex-col gap-2">
          {available.map((feature) => {
            const on = selected.includes(feature.id);
            return (
              <button
                key={feature.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(feature.id)}
                className={cn('flex min-h-16 w-full items-start gap-3 rounded-xl border p-2.5 text-left transition-colors', on ? 'border-accent bg-accent/15' : 'border-line bg-panel2 active:bg-panel3')}
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', on ? 'bg-accent text-[#15102e]' : 'bg-panel3 text-muted')}>
                  <Icon name={feature.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-snug font-semibold">{feature.name}</span>
                  <span className="block text-xs leading-snug text-muted">{feature.desc}</span>
                  <span className="num mt-0.5 block text-xs text-muted">
                    {describeFeature(feature)} · {fmtCount(feature.weeks, ['неделя', 'недели', 'недель'])}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <>
          <SectionTitle>Новая версия</SectionTitle>
          <label className="text-xs font-semibold tracking-wide text-muted uppercase">
            Название фреймворка
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultFrameworkName(game)} maxLength={28} aria-label="Название фреймворка" className="field mt-1 font-normal tracking-normal normal-case" />
          </label>
          <DefList
            className="mt-3"
            rows={[
              ['Версия', `v${version + 1}`],
              ['Функций добавится', fmtCount(selected.length, ['функция', 'функции', 'функций'])],
              ['Разработка', fmtCount(weeks, ['неделя', 'недели', 'недель'])],
              ['Стоимость', fmtMoney(cost)],
            ]}
          />
          <p className="mt-2 text-xs text-muted">Сильная команда собирает версию быстрее. На время разработки нельзя выпускать модели.</p>
        </>
      )}
    </Sheet>
  );
}
