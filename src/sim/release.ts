import type { Complaint, GameState, Project, QualityReport, Review, ScaleId } from '../types';
import { BALANCE } from '../data/balance';
import { FIELDS } from '../data/fields';
import { fitOf, idealShare, scaleById } from '../data/compat';
import { AGENCIES, quoteBand } from '../data/agencies';
import { yearsSince } from './time';
import { getMods } from './mods';
import type { Rng } from './rng';
import { clamp, mean, round1 } from './util';

/** ключ пары домен × парадигма в памяти лаборатории */
export function comboKey(domain: string, paradigm: string): string {
  return `${domain}|${paradigm}`;
}

/** сколько очков рынок ждёт от модели такого масштаба в эту неделю */
export function expectedPoints(scale: ScaleId, week: number): number {
  return scaleById(scale).expected * Math.pow(BALANCE.growth.expectations, yearsSince(week));
}

/** во сколько раз оценка снижает выручку: 1 у идеальной модели, минимум у провальной */
export function ratingFactor(rating: number): number {
  const x = clamp((rating - BALANCE.sales.ratingFloor) / BALANCE.sales.ratingSpan, 0, 1);
  return Math.max(BALANCE.sales.ratingMinFactor, Math.pow(x, BALANCE.sales.ratingPower));
}

/** действующие тренды домена */
export function trendMultiplier(state: GameState, domainId: string): number {
  let m = 1;
  for (const t of state.trends) {
    if (state.week < t.untilWeek && (t.domain === 'all' || t.domain === domainId)) m *= t.mult;
  }
  return m;
}

/** действующие модификаторы всего рынка */
export function marketMultiplier(state: GameState): number {
  let m = state.revenueMult;
  for (const mod of state.marketMods) {
    if (mod.untilWeek === null || state.week < mod.untilWeek) m *= mod.mult;
  }
  return m;
}

/**
 * Скоринг релиза. Качество = очки против ожиданий рынка × баланс исследований и инженерии
 * × совместимость домена и парадигмы × новизна связки × хайп и тренды − штраф за деградации.
 */
export function scoreProject(state: GameState, project: Project): QualityReport {
  let total = 0;
  let deviation = 0;
  let weightSum = 0;
  for (const f of FIELDS) {
    const pts = project.fields[f.id];
    const sum = pts.research + pts.engineering;
    total += sum;
    const share = sum > 0 ? pts.research / sum : BALANCE.quality.shareBase;
    deviation += Math.abs(share - idealShare(project.domain, project.paradigm, f.id)) * f.weight;
    weightSum += f.weight;
  }
  deviation = weightSum > 0 ? deviation / weightSum : 0;

  const expected = expectedPoints(project.scale, state.week);
  const ratio = expected > 0 ? total / expected : 0;
  const pointsScore = 10 * (1 - Math.exp(-BALANCE.quality.pointCurve * ratio));
  const balanceFactor = 1 - BALANCE.quality.balancePenalty * Math.min(1, deviation / BALANCE.quality.balanceScale);
  const fit = fitOf(project.domain, project.paradigm);
  const fitFactor = BALANCE.quality.fit[fit];

  const uses = state.comboMemory[comboKey(project.domain, project.paradigm)]?.times ?? 0;
  const noveltyFactor = BALANCE.quality.novelty[Math.min(uses, BALANCE.quality.novelty.length - 1)];

  const hypeFactor = 1 + (BALANCE.quality.hypeEffect * (state.hype - 50)) / 50;
  const trend = trendMultiplier(state, project.domain);
  const trendFactor = 1 + (trend - 1) * BALANCE.quality.trendEffect;

  let degradationPenalty = 0;
  for (const d of project.degradations) degradationPenalty += penaltyOf(d.severity) * (1 - d.fixed);
  degradationPenalty = Math.min(BALANCE.quality.degradationPenaltyCap, degradationPenalty);

  const quality = clamp(
    pointsScore * balanceFactor * fitFactor * noveltyFactor * hypeFactor * trendFactor * getMods(state).quality - degradationPenalty,
    0,
    10,
  );

  return {
    points: total,
    expected,
    ratio,
    pointsScore,
    deviation,
    balanceFactor,
    fit,
    fitFactor,
    noveltyUses: uses,
    noveltyFactor,
    hypeFactor,
    trendFactor,
    degradationPenalty,
    quality,
  };
}

function penaltyOf(severity: 'low' | 'mid' | 'high'): number {
  return BALANCE.quality.degradationPenalty[severity];
}

type Aspect = 'quality' | 'points' | 'balance' | 'bugs' | 'novelty';
const COMPLAINTS: Complaint[] = ['points', 'balance', 'bugs', 'novelty'];

/** четыре агентства оценивают независимо: у каждого свой профиль внимания и свой голос */
export function reviewModel(report: QualityReport, rng: Rng): { reviews: Review[]; rating: number } {
  const aspects: Record<Aspect, number> = {
    quality: report.quality,
    points: clamp(report.pointsScore * report.fitFactor, 0, 10),
    balance: clamp(10 * report.balanceFactor, 0, 10),
    bugs: clamp(10 - report.degradationPenalty * 2.5, 0, 10),
    novelty: clamp(5 + (report.noveltyFactor - 1) * 30, 0, 10),
  };

  const reviews = AGENCIES.map((agency): Review => {
    // ни один аспект не поднимает оценку выше самого качества больше чем на 2 балла:
    // маленькая, но аккуратная модель не получает высокие баллы за «порядок»
    const ceiling = report.quality + 2;
    let base = 0;
    for (const k of Object.keys(aspects) as Aspect[]) base += Math.min(aspects[k], ceiling) * agency.weights[k];
    const score = clamp(base + agency.tolerance + rng.gauss(0, BALANCE.reviews.noise), BALANCE.reviews.min, BALANCE.reviews.max);

    // слабейший из заметных аспектов становится главной претензией агентства
    let complaint: Complaint | null = null;
    let gap = 0;
    for (const k of COMPLAINTS) {
      const diff = report.quality - aspects[k];
      if (diff > gap && diff > 1.2 && aspects[k] < 5.5) {
        gap = diff;
        complaint = k;
      }
    }
    const quote = complaint ? agency.complaints[complaint] : rng.pick(agency.quotes[quoteBand(score)]);
    return { agency: agency.name, score, quote };
  });

  return { reviews, rating: round1(mean(reviews.map((r) => r.score))) };
}
