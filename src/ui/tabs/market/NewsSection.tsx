import { useState } from 'react';
import type { NewsItem } from '../../../types';
import { formatDate } from '../../../sim/time';
import { useGame } from '../../../store/useGame';
import { Icon } from '../../icons';
import { Card } from '../../primitives';
import { CATEGORY_META } from '../../meta';

const PAGE = 8;
const NO_NEWS: NewsItem[] = [];

/** новостная лента таймлайна: события рынка, науки, регуляторов и хайпа */
export function NewsSection() {
  const news = useGame((s) => s.game?.news ?? NO_NEWS);
  const [shown, setShown] = useState(PAGE);
  return (
    <div>
      <p className="mb-2 text-xs text-muted">События меняют рынок: открывают парадигмы, разгоняют и охлаждают домены, вводят сборы.</p>
      {news.length === 0 ? (
        <Card className="px-4 py-6 text-center text-sm text-muted">В новостях пока тихо. Первые события совсем скоро.</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {news.slice(0, shown).map((item) => {
            const meta = CATEGORY_META[item.category];
            return (
              <Card key={item.id} className="p-3" style={{ borderLeft: `3px solid ${meta.color}` }}>
                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: meta.color }}>
                  <Icon name={meta.icon} className="h-4 w-4" />
                  {meta.label}
                  <span className="num ml-auto text-muted">{formatDate(item.week)}</span>
                </div>
                <div className="mt-1.5 text-[15px] leading-snug font-semibold">{item.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
                {item.effects.length > 0 && (
                  <ul className="num mt-2 flex flex-col gap-0.5 text-xs text-text">
                    {item.effects.map((effect) => (
                      <li key={effect} className="flex items-start gap-1.5">
                        <Icon name="trend" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" />
                        {effect}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
          {shown < news.length && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="min-h-11 rounded-xl border border-line bg-panel2 px-4 text-sm font-medium text-muted active:bg-panel3">
              Показать ещё ({Math.min(PAGE, news.length - shown)})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
