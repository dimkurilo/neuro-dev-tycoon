import type { DegTag, GameState } from '../types';

/**
 * Суммарные множители лаборатории. Не хранятся в сейве, а считаются на лету из того,
 * что уже открыто: исследований, функций фреймворка, активных бустов и объектов офиса.
 */
export interface Mods {
  /** очков за неделю разработки */
  speed: number;
  /** итоговое качество модели */
  quality: number;
  /** исследовательские очки за неделю */
  rp: number;
  /** частота новых деградаций */
  bug: number;
  /** дополнительный множитель по типам деградаций */
  bugTags: Partial<Record<DegTag, number>>;
  /** скорость исправления деградаций */
  fix: number;
  /** скорость роста выгорания */
  burnout: number;
  /** стоимость GPU-часов */
  gpuCost: number;
  /** выручка */
  revenue: number;
}

export function baseMods(): Mods {
  return { speed: 1, quality: 1, rp: 1, bug: 1, bugTags: {}, fix: 1, burnout: 1, gpuCost: 1, revenue: 1 };
}

export function getMods(_state: GameState): Mods {
  return baseMods();
}
