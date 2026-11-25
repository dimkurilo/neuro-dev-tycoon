import type { Domain, GameState, Paradigm, Scale } from '../types';
import { researchName } from '../data/research';
import { yearOf } from './time';

/** исследование завершено; отсутствие требования считается выполненным */
export function isResearchDone(state: GameState, research: string | null): boolean {
  return research === null || state.research.done.includes(research);
}

/** домен открыт: изучено нужное исследование и наступил год появления */
export function isDomainOpen(state: GameState, domain: Pick<Domain, 'research' | 'year'>): boolean {
  return yearOf(state.week) >= domain.year && isResearchDone(state, domain.research);
}

export function isParadigmOpen(state: GameState, paradigm: Pick<Paradigm, 'research' | 'year'>): boolean {
  return yearOf(state.week) >= paradigm.year && isResearchDone(state, paradigm.research);
}

export function isScaleOpen(state: GameState, scale: Pick<Scale, 'research'>): boolean {
  return isResearchDone(state, scale.research);
}

export function isPlatformYear(state: GameState, year: number): boolean {
  return yearOf(state.week) >= year;
}

export function isGpuYear(state: GameState, year: number): boolean {
  return yearOf(state.week) >= year;
}

/** почему пункт закрыт; null — открыт */
export function lockReason(state: GameState, research: string | null, year: number): string | null {
  const name = researchName(research);
  if (name !== null && !isResearchDone(state, research)) return `Нужно исследование «${name}»`;
  if (yearOf(state.week) < year) return `Появится в ${year} году`;
  return null;
}
