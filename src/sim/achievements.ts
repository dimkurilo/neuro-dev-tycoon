import type { GameState, SimEvent } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { yearOf } from './time';

const KNOWN = new Set(ACHIEVEMENTS.map((a) => a.id));

export function unlockAchievement(state: GameState, events: SimEvent[], id: string): void {
  if (!KNOWN.has(id) || state.achievements.includes(id)) return;
  state.achievements = [...state.achievements, id];
  events.push({ type: 'achievement', id });
}

/** сверяет состояние партии с условиями всех достижений */
export function checkAchievements(state: GameState, events: SimEvent[]): void {
  const s = state.stats;
  const u = (id: string) => unlockAchievement(state, events, id);

  if (s.releases >= 1) u('first-release');
  if (s.totalRevenue > 0) u('first-money');
  if (s.bestRating >= 7) u('rating-7');
  if (s.bestRating >= 9) u('rating-9');
  if (s.perfectReleases >= 1) u('rating-10');
  if (state.money >= 1e6) u('millionaire');
  if (state.staff.length >= 10) u('team-10');
  if (state.office === 'campus') u('campus');
  if (s.frameworksBuilt >= 1) u('framework-1');
  if (state.framework.features.length >= 12) u('framework-12');
  if (s.researchDone >= 20) u('scientist-20');
  if (state.hype >= 100) u('hype-100');
  if (s.chartTops >= 1) u('chart-top');
  if (s.contractsDone >= 3) u('contract-3');
  if (s.flagships >= 1) u('flagship');
  if (s.versionsMade >= 5) u('versions-5');
  if (s.cleanReleases >= 1) u('clean-release');
  if (s.paradigmsUsed.length >= 8) u('paradigms-8');

  const year = yearOf(state.week);
  if (year >= 2019) u('survive-2019');
  if (year >= 2040) u('veteran-2040');
}
