import type { EventEffect, GameEvent, GameState, NewsItem, SimEvent } from '../types';
import { BALANCE } from '../data/balance';
import { EVENTS, EVENTS_BY_WEEK } from '../data/events';
import { domainById } from '../data/domains';
import { paradigmById } from '../data/paradigms';
import { researchName } from '../data/research';

const weeksLabel = (n: number) => `${n} недель`;
const mult = (value: number) => `×${value.toFixed(2).replace(/0$/, '').replace('.', ',')}`;

function complianceScale(state: GameState): number {
  return Math.pow(BALANCE.growth.cost, state.week / 52);
}

/** применяет эффект события к состоянию и возвращает строку для новостной ленты */
function applyEffect(state: GameState, effect: EventEffect): string | null {
  switch (effect.type) {
    case 'unlock': {
      const opened: string[] = [];
      for (const id of effect.paradigms ?? []) {
        const paradigm = paradigmById(id);
        if (state.research.done.includes(paradigm.research ?? '')) continue;
        if (!paradigm.research) continue;
        state.research.done = [...state.research.done, paradigm.research];
        // если игрок уже изучал эту парадигму — исследование закрывается само
        if (state.research.current === paradigm.research) state.research = { ...state.research, current: null, progress: 0 };
        opened.push(paradigm.name);
      }
      return opened.length > 0 ? `Открыта парадигма: ${opened.join(', ')}` : null;
    }
    case 'discount': {
      const names: string[] = [];
      for (const id of effect.research) {
        names.push(researchName(id) ?? id);
        if (!state.research.discounts.includes(id)) state.research.discounts = [...state.research.discounts, id];
      }
      return `Исследования подешевели вдвое: ${names.join(', ')}`;
    }
    case 'trend': {
      const label = effect.domain === 'all' ? 'Все домены' : `Домен «${domainById(effect.domain).name}»`;
      state.trends = [
        ...state.trends.filter((t) => t.id !== `trend-${state.week}-${effect.domain}`),
        { id: `trend-${state.week}-${effect.domain}`, domain: effect.domain, mult: effect.mult, untilWeek: state.week + effect.weeks, label },
      ];
      return `${label}: продажи ${mult(effect.mult)} на ${weeksLabel(effect.weeks)}`;
    }
    case 'market':
      state.marketMods = [...state.marketMods, { id: `market-${state.week}-${state.marketMods.length}`, mult: effect.mult, untilWeek: state.week + effect.weeks, label: 'Рынок' }];
      return `Выручка всего рынка ${mult(effect.mult)} на ${weeksLabel(effect.weeks)}`;
    case 'rp':
      state.rp += effect.amount;
      return `+${effect.amount} исследовательских очков`;
    case 'fans':
      state.fans += effect.amount;
      return `+${effect.amount} цитируемости`;
    case 'gpuCost':
      state.gpuCostMult *= effect.mult;
      return `Стоимость GPU-часов ${mult(effect.mult)} — навсегда`;
    case 'revenue':
      state.revenueMult *= effect.mult;
      return `Выручка ${mult(effect.mult)} — навсегда`;
    case 'compliance': {
      const amount = Math.round(effect.amount * complianceScale(state));
      state.compliance = [...state.compliance, { amount, domains: effect.domains }];
      const where = effect.domains.includes('all') ? 'в любом домене' : `в доменах: ${effect.domains.map((id) => domainById(id).name).join(', ')}`;
      return `Сбор за релиз ${amount.toLocaleString('ru-RU')} Cr ${where}`;
    }
  }
}

/**
 * События таймлайна срабатывают один раз — в свою неделю. Каждое попадает в новостную ленту
 * и показывается модалкой, пока игрок его не закроет.
 */
export function runEvents(state: GameState, events: SimEvent[]): void {
  const due: GameEvent[] | undefined = EVENTS_BY_WEEK[state.week];
  if (!due) return;
  const fresh: NewsItem[] = [];
  for (const event of due) {
    if (state.seenEvents.includes(event.id)) continue;
    state.seenEvents = [...state.seenEvents, event.id];
    const lines = event.effects.map((effect) => applyEffect(state, effect)).filter((line): line is string => line !== null);
    const item: NewsItem = { id: state.nextNewsId, week: state.week, category: event.category, title: event.title, text: event.text, effects: lines };
    state.nextNewsId += 1;
    fresh.push(item);
    events.push({ type: 'news', newsId: item.id });
  }
  if (fresh.length > 0) state.news = [...fresh.reverse(), ...state.news].slice(0, BALANCE.market.newsLimit);
}

/** тренды и модификаторы рынка с истёкшим сроком больше не нужны */
export function pruneExpired(state: GameState): void {
  state.trends = state.trends.filter((t) => state.week < t.untilWeek);
  state.marketMods = state.marketMods.filter((m) => m.untilWeek === null || state.week < m.untilWeek);
}

/** предстоящие события для подсказки в ленте */
export function upcomingEvents(state: GameState, count = 3): GameEvent[] {
  return EVENTS.filter((event) => event.week > state.week && !state.seenEvents.includes(event.id)).slice(0, count);
}
