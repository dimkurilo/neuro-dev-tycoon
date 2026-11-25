import { useState } from 'react';
import { useGame } from '../../store/useGame';
import { cn } from '../primitives';
import { ChartsSection } from './market/ChartsSection';
import { NewsSection } from './market/NewsSection';
import { ClientsSection } from './market/ClientsSection';
import { MarketingSection } from './market/MarketingSection';
import { MoneySection, PlatformsSection } from './market/MarketBasics';

type Section = 'charts' | 'news' | 'clients' | 'marketing' | 'platforms' | 'money';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'charts', label: 'Чарты' },
  { id: 'news', label: 'Новости' },
  { id: 'clients', label: 'Клиенты' },
  { id: 'marketing', label: 'Маркетинг' },
  { id: 'platforms', label: 'Платформы' },
  { id: 'money', label: 'Деньги' },
];

/** рынок: шесть разделов за горизонтальными вкладками */
export function MarketTab() {
  const [section, setSection] = useState<Section>('charts');
  const offers = useGame((s) => s.game?.contracts.offers.length ?? 0);
  const deals = useGame((s) => (s.game ? Number(s.game.investorOffer !== null) + s.game.grantOffers.length : 0));
  const badge = (id: Section): number | undefined => (id === 'clients' ? offers + deals || undefined : undefined);
  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label="Разделы рынка">
        {SECTIONS.map((s) => {
          const count = badge(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={section === s.id}
              onClick={() => setSection(s.id)}
              className={cn('flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors', section === s.id ? 'border-accent bg-accent text-[#15102e]' : 'border-line bg-panel2 text-muted active:bg-panel3')}
            >
              {s.label}
              {count !== undefined && <span className={cn('num rounded-full px-1.5 text-xs font-semibold', section === s.id ? 'bg-[#15102e] text-accent' : 'bg-accent/20 text-accent')}>{count}</span>}
            </button>
          );
        })}
      </div>
      {section === 'charts' && <ChartsSection />}
      {section === 'news' && <NewsSection />}
      {section === 'clients' && <ClientsSection />}
      {section === 'marketing' && <MarketingSection />}
      {section === 'platforms' && <PlatformsSection />}
      {section === 'money' && <MoneySection />}
    </div>
  );
}
