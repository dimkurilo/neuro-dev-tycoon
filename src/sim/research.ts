import type { GameState, ResearchNode, SimEvent } from '../types';
import { RESEARCH_BY_ID, researchName } from '../data/research';
import { yearOf } from './time';
import { checkAchievements } from './achievements';

/** цена исследования в очках; скидки приходят с событиями таймлайна */
export function researchCost(state: GameState, node: ResearchNode): number {
  return state.research.discounts.includes(node.id) ? Math.round(node.cost / 2) : node.cost;
}

/** предпосылки изучены и год наступил — узел виден как доступный в дереве */
export function researchUnlocked(state: GameState, node: ResearchNode): boolean {
  return node.requires.every((req) => state.research.done.includes(req)) && yearOf(state.week) >= node.year;
}

/** почему исследование нельзя начать; null — можно */
export function canStartResearch(state: GameState, nodeId: string): string | null {
  const node = RESEARCH_BY_ID[nodeId];
  if (!node) return 'Неизвестное исследование';
  if (state.research.done.includes(nodeId)) return 'Уже исследовано';
  if (state.research.current === nodeId) return 'Уже изучается';
  if (state.research.current !== null) return 'Сначала завершите текущее исследование';
  const missing = node.requires.filter((req) => !state.research.done.includes(req)).map((req) => researchName(req) ?? req);
  if (missing.length > 0) return `Нужно сначала: ${missing.join(', ')}`;
  if (yearOf(state.week) < node.year) return `Появится в ${node.year} году`;
  const cost = researchCost(state, node);
  if (state.rp < cost) return `Нужно ${cost} И-очков, у лаборатории ${Math.floor(state.rp)}`;
  return null;
}

/** запускает исследование, списывая очки */
export function startResearch(state: GameState, nodeId: string): string | null {
  const error = canStartResearch(state, nodeId);
  if (error) return error;
  const node = RESEARCH_BY_ID[nodeId];
  if (!node) return 'Неизвестное исследование';
  state.rp -= researchCost(state, node);
  state.research = { ...state.research, current: nodeId, progress: 0 };
  return null;
}

/** шаг лаборатории: текущее исследование продвигается на неделю */
export function runResearch(state: GameState, events: SimEvent[]): void {
  const current = state.research.current;
  if (current === null) return;
  const node = RESEARCH_BY_ID[current];
  if (!node) {
    state.research = { ...state.research, current: null, progress: 0 };
    return;
  }
  const progress = state.research.progress + 1;
  if (progress < node.weeks) {
    state.research = { ...state.research, progress };
    return;
  }
  state.research = { ...state.research, current: null, progress: 0, done: [...state.research.done, current] };
  state.stats = { ...state.stats, researchDone: state.stats.researchDone + 1 };
  events.push({ type: 'toast', text: `Исследование завершено: «${node.name}»`, tone: 'good' });
  checkAchievements(state, events);
}

/** сколько недель осталось до конца текущего исследования */
export function researchWeeksLeft(state: GameState): number {
  const node = state.research.current ? RESEARCH_BY_ID[state.research.current] : undefined;
  return node ? Math.max(0, node.weeks - state.research.progress) : 0;
}
