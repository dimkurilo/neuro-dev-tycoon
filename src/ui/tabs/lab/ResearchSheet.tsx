import type { ReactNode } from 'react';
import { describeEffects } from '../../../data/describe';
import { RESEARCH_BY_ID, RESEARCH_KIND_LABEL, RESEARCH_TIER_NAMES, RESEARCH_TIERS, researchName } from '../../../data/research';
import { canStartResearch, researchCost, researchUnlocked } from '../../../sim/research';
import { START_YEAR } from '../../../sim/time';
import { useGame } from '../../../store/useGame';
import { Icon } from '../../icons';
import { Btn, DefList, Notice, Sheet } from '../../primitives';
import { useAutoClose } from '../../useAutoClose';
import { useRun } from '../../useRun';
import { fmtInt } from '../../format';

type Row = readonly [string, ReactNode];

/** подробности исследования и запуск */
export function ResearchSheet({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const game = useGame((s) => s.game);
  const startResearch = useGame((s) => s.startResearch);
  const run = useRun();
  const node = RESEARCH_BY_ID[nodeId];
  useAutoClose(!game || !node);
  if (!game || !node) return null;

  const done = game.research.done.includes(node.id);
  const current = game.research.current === node.id;
  const error = canStartResearch(game, node.id);
  const cost = researchCost(game, node);
  const discounted = game.research.discounts.includes(node.id);
  const effects = describeEffects(node);

  const rows: Row[] = [
    ['Стоимость', done ? '—' : `${fmtInt(cost)} И-очков${discounted ? ' (скидка 50%)' : ''}`],
    ['Длительность', `${node.weeks} нед.`],
  ];
  if (node.requires.length > 0) {
    rows.push([
      'Требует',
      <span className="flex flex-wrap justify-end gap-x-3 gap-y-1 font-normal">
        {node.requires.map((req) => {
          const ready = game.research.done.includes(req);
          return (
            <span key={req} className={ready ? 'text-good' : 'text-bad'}>
              {ready ? '✓' : '✗'} {researchName(req) ?? req}
            </span>
          );
        })}
      </span>,
    ]);
  }
  if (node.year > START_YEAR) rows.push(['Доступно с', `${node.year} года`]);

  const start = () => {
    run(() => startResearch(node.id), `Изучение «${node.name}» начато`);
    onClose();
  };
  const footerLabel = done ? 'Уже изучено' : current ? `Идёт · ${game.research.progress}/${node.weeks} нед.` : 'Начать исследование';

  return (
    <Sheet
      title={node.name}
      onClose={onClose}
      footer={
        <Btn variant="primary" full icon="lab" disabled={done || current || error !== null} onClick={start}>
          {footerLabel}
        </Btn>
      }
    >
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon name={node.icon} className="h-4 w-4 text-accent" />
        {RESEARCH_KIND_LABEL[node.kind]} · ярус {RESEARCH_TIERS[node.tier]} «{RESEARCH_TIER_NAMES[node.tier]}»
        {!researchUnlocked(game, node) && <Icon name="lock" className="ml-auto h-4 w-4" />}
      </div>
      <Notice className="mt-3" tone="info">
        {node.desc}
      </Notice>
      <DefList className="mt-3" rows={rows} />

      {effects.length > 0 && (
        <>
          <div className="mb-2 mt-5 flex min-h-9 items-center">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Что даст</h3>
          </div>
          <ul className="flex flex-col gap-1.5">
            {effects.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                {line}
              </li>
            ))}
          </ul>
        </>
      )}

      {error && !done && !current && (
        <Notice className="mt-3" tone="warn" icon="alert">
          {error}
        </Notice>
      )}
    </Sheet>
  );
}
