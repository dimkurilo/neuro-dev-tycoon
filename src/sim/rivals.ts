import type { CompetitorModel, GameState, ReleasedModel } from '../types';
import { BALANCE } from '../data/balance';
import { domainById } from '../data/domains';
import { LAB_BY_ID, rivalModelName } from '../data/labs';
import { platformById, platformReach } from '../data/platforms';
import { ratingFactor } from './release';
import { salesShape } from './sales';
import { isDomainOpen } from './unlock';
import { yearsSince } from './time';
import { clamp, round1 } from './util';
import type { Rng } from './rng';

/** строка чарта или лидерборда */
export interface ChartEntry {
  key: string;
  name: string;
  owner: string;
  domain: string;
  rating: number;
  revenue: number;
  mine: boolean;
  color: string;
}

/** средняя оценка моделей на рынке: растёт от 5.6 в 2012-м примерно к 8.2 к 2040-му */
export function expectedRating(week: number): number {
  return 5.6 + 2.6 * (1 - Math.exp(-yearsSince(week) / 12));
}

/** выручка модели конкурента за неделю — та же кривая продаж, что у моделей игрока */
export function rivalRevenue(model: CompetitorModel, week: number): number {
  return model.potential * salesShape(week - model.week);
}

/** охват рынка в деньгах: пик недельной выручки модели с идеальной оценкой без цитируемости и хайпа */
function marketReach(state: GameState): number {
  const web = platformById('web');
  return platformReach(web, state.week) * Math.pow(BALANCE.growth.market, yearsSince(state.week)) * BALANCE.sales.reachMoney * web.share;
}

function makeRival(state: GameState, rng: Rng, labId: string, serial: number): CompetitorModel {
  const lab = LAB_BY_ID[labId];
  const known = lab.domains.filter((id) => isDomainOpen(state, domainById(id)));
  const rating = clamp(rng.gauss(expectedRating(state.week) + lab.bias, BALANCE.market.labRatingNoise), 2, 9.9);
  return {
    id: state.nextCompetitorId,
    name: rivalModelName(lab, serial),
    lab: lab.id,
    domain: rng.pick(known.length > 0 ? known : lab.domains),
    rating: round1(rating),
    week: state.week,
    potential: marketReach(state) * ratingFactor(rating) * rng.range(0.6, 1.4),
  };
}

/** лаборатории-конкуренты время от времени выпускают модели */
export function runRivals(state: GameState, rng: Rng): void {
  const rivals = [...state.competitors];
  for (const lab of state.labs) {
    if (!rng.chance(1 / BALANCE.market.labReleaseEvery)) continue;
    const serial = rivals.filter((m) => m.lab === lab.id).length + 1;
    rivals.push(makeRival(state, rng, lab.id, serial));
    state.nextCompetitorId += 1;
  }
  const horizon = BALANCE.market.leaderboardWeeks + BALANCE.sales.activeWeeks;
  state.competitors = rivals.filter((m) => state.week - m.week <= horizon);

  // модель игрока на вершине недельного чарта
  if (weeklyChart(state)[0]?.mine) state.stats = { ...state.stats, chartTops: state.stats.chartTops + 1 };
}

function playerEntry(state: GameState, model: ReleasedModel): ChartEntry {
  return { key: `m${model.id}`, name: model.name, owner: state.companyName, domain: model.domain, rating: model.rating, revenue: model.lastRevenue, mine: true, color: state.accent };
}

function rivalEntry(state: GameState, model: CompetitorModel): ChartEntry {
  const lab = LAB_BY_ID[model.lab];
  return {
    key: `r${model.id}`,
    name: model.name,
    owner: lab?.name ?? 'конкурент',
    domain: model.domain,
    rating: model.rating,
    revenue: rivalRevenue(model, state.week),
    mine: false,
    color: lab?.color ?? '#94a1c0',
  };
}

/** топ моделей недели по выручке */
export function weeklyChart(state: GameState): ChartEntry[] {
  const entries = [...state.models.filter((m) => m.lastRevenue > 0).map((m) => playerEntry(state, m)), ...state.competitors.map((c) => rivalEntry(state, c))];
  return entries.sort((a, b) => b.revenue - a.revenue).slice(0, BALANCE.market.chartSize);
}

/** лидерборд бенчмарков: лучшие модели за последние два года */
export function leaderboard(state: GameState): ChartEntry[] {
  const horizon = BALANCE.market.leaderboardWeeks;
  const entries = [
    ...state.models.filter((m) => state.week - m.releasedWeek <= horizon).map((m) => playerEntry(state, m)),
    ...state.competitors.filter((c) => state.week - c.week <= horizon).map((c) => rivalEntry(state, c)),
  ];
  return entries.sort((a, b) => b.rating - a.rating).slice(0, BALANCE.market.chartSize);
}

/** место первой модели игрока в списке (с единицы) или null, если её нет */
export function bestPosition(entries: ChartEntry[]): number | null {
  const index = entries.findIndex((e) => e.mine);
  return index === -1 ? null : index + 1;
}
