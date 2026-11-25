import { useState } from 'react';
import type { ResearchKind } from '../../types';
import { RESEARCH, RESEARCH_KIND_LABEL, RESEARCH_TIER_NAMES, RESEARCH_TIERS } from '../../data/research';
import { researchCost, researchUnlocked } from '../../sim/research';
import { rpPerWeek } from '../../sim/staff';
import { useGame } from '../../store/useGame';
import { Icon } from '../icons';
import { Bar, Card, SectionTitle, cn } from '../primitives';
import { fmtInt } from '../format';

type Filter = 'all' | ResearchKind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все' },
  ...(Object.keys(RESEARCH_KIND_LABEL) as ResearchKind[]).map((id) => ({ id, label: RESEARCH_KIND_LABEL[id] })),
];

/** дерево исследований: шесть ярусов, карточка открывает лист с подробностями */
export function LabTab() {
  const game = useGame((s) => s.game);
  const openModal = useGame((s) => s.openModal);
  const [filter, setFilter] = useState<Filter>('all');
  if (!game) return null;

  const current = game.research.current ? RESEARCH.find((n) => n.id === game.research.current) : undefined;
  const nodes = filter === 'all' ? RESEARCH : RESEARCH.filter((n) => n.kind === filter);
  const done = game.research.done.length;

  return (
    <div>
      <SectionTitle action={<span className="num text-xs text-muted">изучено {fmtInt(done)} из {RESEARCH.length}</span>}>Лаборатория</SectionTitle>
      <Card className="p-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-muted">Исследовательские очки</div>
            <div className="num text-3xl leading-none font-extrabold text-accent">{fmtInt(Math.floor(game.rp))}</div>
          </div>
          <div className="num text-right text-xs leading-snug text-muted">
            +{rpPerWeek(game).toFixed(1)}
            <br />
            в неделю
          </div>
        </div>
        {current ? (
          <div className="mt-3 rounded-xl border border-line bg-panel2 p-2.5">
            <div className="flex items-center gap-2">
              <Icon name={current.icon} className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{current.name}</span>
              <span className="num shrink-0 text-xs text-muted">
                {game.research.progress}/{current.weeks} нед.
              </span>
            </div>
            <Bar value={game.research.progress} max={current.weeks} className="mt-2" />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Сейчас ничего не исследуется. Выберите направление: исследования открывают парадигмы, домены и улучшения лаборатории.</p>
        )}
      </Card>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label="Раздел исследований">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn('min-h-11 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors', filter === f.id ? 'border-accent bg-accent text-[#15102e]' : 'border-line bg-panel2 text-muted active:bg-panel3')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {RESEARCH_TIERS.map((numeral, tier) => {
        const inTier = nodes.filter((n) => n.tier === tier);
        if (inTier.length === 0) return null;
        const doneHere = inTier.filter((n) => game.research.done.includes(n.id)).length;
        return (
          <section key={tier}>
            <SectionTitle
              action={
                <span className="num text-xs text-muted">
                  {doneHere}/{inTier.length}
                </span>
              }
            >
              Ярус {numeral} · {RESEARCH_TIER_NAMES[tier]}
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {inTier.map((node) => {
                const isDone = game.research.done.includes(node.id);
                const isCurrent = game.research.current === node.id;
                const unlocked = researchUnlocked(game, node);
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => openModal({ kind: 'research', nodeId: node.id })}
                    className={cn(
                      'flex min-h-32 w-full flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-colors',
                      isDone ? 'border-good/40 bg-good/10' : isCurrent ? 'border-accent bg-accent/15' : unlocked ? 'border-line bg-panel2 active:bg-panel3' : 'border-line bg-panel opacity-60',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon name={node.icon} className={cn('h-4 w-4 shrink-0', isDone ? 'text-good' : 'text-accent')} />
                      <span className="truncate text-[10px] text-muted">{RESEARCH_KIND_LABEL[node.kind]}</span>
                      {isDone ? <Icon name="check" className="ml-auto h-4 w-4 shrink-0 text-good" /> : !unlocked ? <Icon name="lock" className="ml-auto h-4 w-4 shrink-0 text-muted" /> : null}
                    </div>
                    <span className="text-[13px] leading-snug font-semibold">{node.name}</span>
                    {isCurrent ? (
                      <Bar value={game.research.progress} max={node.weeks} className="mt-auto" />
                    ) : (
                      <span className="num mt-auto text-xs text-muted">{isDone ? 'изучено' : `${researchCost(game, node)} ИО · ${node.weeks} нед.`}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
