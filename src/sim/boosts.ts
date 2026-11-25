import type { GameState } from '../types';
import { BALANCE } from '../data/balance';
import { BOOSTS } from '../data/boosts';
import { yearsSince } from './time';
import { applyFix } from './project';
import { isResearchDone } from './unlock';
import { refreshCandidates } from './staff';
import type { Rng } from './rng';

export function boostPrice(state: GameState, id: string): number {
  const def = BOOSTS.find((b) => b.id === id);
  return def ? def.cost * Math.pow(BALANCE.growth.cost, yearsSince(state.week)) : 0;
}

export function boostActive(state: GameState, id: string): boolean {
  return state.boosts.some((b) => b.id === id && state.week < b.endsWeek);
}

/** почему буст нельзя применить; null — можно */
export function canBoost(state: GameState, id: string): string | null {
  const def = BOOSTS.find((b) => b.id === id);
  if (!def) return 'Неизвестный буст';
  if (!isResearchDone(state, def.research)) return 'Буст ещё не открыт в лаборатории';
  if (boostActive(state, id)) return 'Уже действует';
  const price = boostPrice(state, id);
  if (state.money < price) return 'Недостаточно денег';
  if (def.instant === 'fix' && (!state.project || state.project.degradations.every((d) => d.fixed >= 1))) return 'Нет проекта с открытыми деградациями';
  return null;
}

/** применяет буст: временный — на несколько недель, разовый — сразу */
export function activateBoost(state: GameState, id: string, rng: Rng): string | null {
  const error = canBoost(state, id);
  if (error) return error;
  const def = BOOSTS.find((b) => b.id === id);
  if (!def) return 'Неизвестный буст';
  state.money -= boostPrice(state, id);

  if (def.instant === 'fix' && state.project) {
    state.project = { ...state.project, degradations: applyFix(state.project.degradations, def.instantValue ?? 0).remaining };
  } else if (def.instant === 'rp') {
    state.rp += def.instantValue ?? 0;
  } else if (def.instant === 'candidates') {
    refreshCandidates(state, rng, def.instantValue ?? 0);
  } else if (def.weeks > 0) {
    state.boosts = [...state.boosts, { id, endsWeek: state.week + def.weeks }];
  }
  return null;
}
