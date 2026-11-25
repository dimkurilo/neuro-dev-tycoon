import type { Fit, GameState } from '../types';
import { fitOf } from '../data/compat';
import { RESEARCH_BY_ID } from '../data/research';

// Производные от завершённых исследований «знания» лаборатории — не хранятся в сейве.

/** 0 — баланс скрыт, 1 — подсказки для полей первой фазы, 2 — для всех */
export function revealBalance(state: GameState): number {
  let level = 0;
  for (const id of state.research.done) level = Math.max(level, RESEARCH_BY_ID[id]?.effects.revealBalance ?? 0);
  return level;
}

/** известна ли матрица совместимости домен × парадигма целиком */
export function revealFit(state: GameState): boolean {
  return state.research.done.some((id) => RESEARCH_BY_ID[id]?.effects.revealFit === true);
}

/** сколько контрактов клиентов можно вести одновременно */
export function maxContracts(state: GameState): number {
  let max = 1;
  for (const id of state.research.done) max += RESEARCH_BY_ID[id]?.effects.maxContracts ?? 0;
  return max;
}

/** совместимость, известная игроку: из прошлого опыта или из исследования матрицы; null — пока неизвестна */
export function knownFit(state: GameState, domainId: string, paradigmId: string): Fit | null {
  const memory = state.comboMemory[`${domainId}|${paradigmId}`];
  if (memory) return memory.fit;
  return revealFit(state) ? fitOf(domainId, paradigmId) : null;
}
