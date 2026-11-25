import type { GameState, ReleasedModel } from '../types';
import { BALANCE } from '../data/balance';

function rawShape(t: number): number {
  return Math.pow(t + 1, BALANCE.sales.shapeA) * Math.exp(-BALANCE.sales.shapeB * t);
}

let shapeMax = 0;
let peakAt = 0;

function init(): void {
  if (shapeMax > 0) return;
  for (let t = 0; t <= 52; t++) {
    const v = rawShape(t);
    if (v > shapeMax) {
      shapeMax = v;
      peakAt = t;
    }
  }
}

/** доля пиковой выручки на t-й неделе после релиза: разгон к 2–3-й неделе и экспоненциальный хвост */
export function salesShape(t: number): number {
  init();
  if (t < 0 || t > BALANCE.sales.activeWeeks) return 0;
  return rawShape(t) / shapeMax;
}

/** на какой неделе после релиза выручка максимальна */
export function peakWeek(): number {
  init();
  return peakAt;
}

/** выручка модели за неделю: сумма всех волн (релиз и версии) */
export function modelWeeklyRevenue(model: ReleasedModel, week: number): number {
  let revenue = 0;
  for (const wave of model.waves) revenue += wave.potential * salesShape(week - wave.startWeek);
  return revenue;
}

/** недельные продажи всех моделей; возвращает суммарную выручку */
export function runSales(state: GameState): number {
  let income = 0;
  const horizon = BALANCE.sales.activeWeeks;
  state.models = state.models.map((model) => {
    const revenue = modelWeeklyRevenue(model, state.week);
    income += revenue;
    // две пустые недели подряд — кривая закончилась, модель больше не трогаем
    if (revenue === 0 && model.lastRevenue === 0 && model.weekly.length > 0) return model;
    return {
      ...model,
      weekly: [...model.weekly.slice(-horizon), revenue],
      lastRevenue: revenue,
      totalRevenue: model.totalRevenue + revenue,
    };
  });
  return income;
}

/** хайп остывает без кампании, цитируемость забывается без новых релизов */
export function runAudience(state: GameState): void {
  if (!state.campaign) state.hype = Math.max(0, state.hype - BALANCE.hype.decayPerWeek);
  if (state.stats.lastReleaseWeek === 0 || state.week - state.stats.lastReleaseWeek > BALANCE.fans.decayAfterWeeks) {
    state.fans *= 1 - BALANCE.fans.weeklyDecay;
  }
}
