import type { Degradation, DegradationType, FieldDef, FieldId, GameState, Gpu, Phase, Project, ReleasedModel, ScaleId, Severity, SimEvent, Staff } from '../types';
import { BALANCE } from '../data/balance';
import { DEV_PHASES, FIELD_IDS, PHASE_NAMES, fieldsOfPhase, phaseWeeksTotal } from '../data/fields';
import { DOMAIN_BY_ID, domainById } from '../data/domains';
import { PARADIGM_BY_ID } from '../data/paradigms';
import { DEGRADATIONS, severityPoints } from '../data/degradations';
import { gpuById } from '../data/gpus';
import { scaleById } from '../data/compat';
import { platformById, platformReach } from '../data/platforms';
import { suggestModelName } from '../data/names';
import { yearsSince } from './time';
import { getMods, type Mods } from './mods';
import type { Rng } from './rng';
import { comboKey, expectedPoints, marketMultiplier, ratingFactor, reviewModel, scoreProject, trendMultiplier } from './release';
import { lockReason } from './unlock';
import { checkAchievements } from './achievements';
import { clamp } from './util';

export interface ModelInput {
  name: string;
  domain: string;
  paradigm: string;
  platform: string;
  scale: ScaleId;
  gpu: string;
}

/** почему модель с такими параметрами не запустить; null — можно */
export function validateModel(state: GameState, input: ModelInput): string | null {
  if (state.project) return 'Сначала завершите текущий проект';
  const domain = DOMAIN_BY_ID[input.domain];
  if (!domain) return 'Выберите домен';
  const domainLock = lockReason(state, domain.research, domain.year);
  if (domainLock) return domainLock;
  const paradigm = PARADIGM_BY_ID[input.paradigm];
  if (!paradigm) return 'Выберите парадигму';
  const paradigmLock = lockReason(state, paradigm.research, paradigm.year);
  if (paradigmLock) return paradigmLock;
  const scale = scaleById(input.scale);
  if (scale.id !== input.scale) return 'Неизвестный масштаб';
  const scaleLock = lockReason(state, scale.research, 0);
  if (scaleLock) return scaleLock;
  if (!state.platforms.includes(input.platform)) return 'Сначала купите лицензию на платформу';
  if (!state.gpus.includes(input.gpu)) return 'Сначала арендуйте эти вычисления';
  return null;
}

/** создаёт проект новой модели в черновике состояния */
export function createModel(state: GameState, rng: Rng, input: ModelInput): Project {
  const scale = scaleById(input.scale);
  const domain = domainById(input.domain);
  const fields = {} as Record<FieldId, { research: number; engineering: number }>;
  const sliders = {} as Record<FieldId, number>;
  for (const id of FIELD_IDS) {
    fields[id] = { research: 0, engineering: 0 };
    sliders[id] = 50;
  }
  const project: Project = {
    id: state.nextProjectId,
    kind: 'model',
    name: input.name.trim() || suggestModelName(rng, domain.prefix),
    domain: input.domain,
    paradigm: input.paradigm,
    platform: input.platform,
    scale: input.scale,
    gpu: input.gpu,
    phase: 0,
    weekInPhase: 0,
    weeksPerPhase: [...scale.weeks],
    sliders,
    fields,
    degradations: [],
    nextDegradationId: 1,
    contractId: null,
    startedWeek: state.week,
    spent: 0,
    lastPoints: 0,
    baseModelId: null,
    expansion: null,
    features: [],
  };
  state.rng = rng.state;
  state.nextProjectId += 1;
  state.project = project;
  return project;
}

export interface Pools {
  research: number;
  engineering: number;
  /** суммарная мощность команды — база для очков и скорости исправления */
  power: number;
  /** усиление исследований и инженерии по составу команды */
  rf: number;
  ef: number;
  members: Staff[];
}

/**
 * Пул команды: фокус сотрудника перераспределяет его силу между исследованиями и инженерией,
 * не меняя общей мощности. Состав команды задаёт базовое соотношение, слайдеры его модулируют.
 */
export function teamPools(state: GameState): Pools {
  let research = 0;
  let engineering = 0;
  const members: Staff[] = [];
  for (const s of state.staff) {
    if (!s.onProject || s.vacationWeeks > 0 || s.training) continue;
    members.push(s);
    const speedFactor = BALANCE.team.speedFloor + (BALANCE.team.speedRange * s.speed) / 100;
    const over = Math.max(0, s.burnout - BALANCE.team.burnoutFrom) / (100 - BALANCE.team.burnoutFrom);
    const burnFactor = 1 - BALANCE.team.burnoutPenalty * over;
    const base = (speedFactor * burnFactor) / BALANCE.team.powerDivisor;
    const focus = s.focus / 100;
    const keep = BALANCE.team.focusBase;
    research += s.research * (keep + (1 - keep) * focus) * base;
    engineering += s.engineering * (keep + (1 - keep) * (1 - focus)) * base;
  }
  const total = research + engineering;
  return {
    research,
    engineering,
    power: total / 2,
    rf: total > 0 ? Math.min(BALANCE.team.compositionCap, (BALANCE.team.compositionBoost * research) / total) : 0,
    ef: total > 0 ? Math.min(BALANCE.team.compositionCap, (BALANCE.team.compositionBoost * engineering) / total) : 0,
    members,
  };
}

/** суммарные очки, которые команда наберёт за неделю на проекте */
export function weeklyPoints(state: GameState, pools: Pools, mods: Mods): number {
  const project = state.project;
  if (!project) return 0;
  return BALANCE.project.pointsPerWeek * pools.power * gpuById(project.gpu).compute * mods.speed;
}

/** стоимость GPU-часов за неделю для связки ускоритель × масштаб, без модификаторов лаборатории */
export function gpuWeeklyCostOf(gpu: Gpu, scale: ScaleId, mult = 1): number {
  return gpu.weeklyCost * BALANCE.project.scaleGpuShare[scale] * mult;
}

/** стоимость GPU-часов за неделю: только пока идёт проект, в стабилизации — неполная */
export function gpuWeeklyCost(state: GameState): number {
  const project = state.project;
  if (!project) return 0;
  const phaseShare = project.phase >= DEV_PHASES ? BALANCE.project.stabilizationGpuShare : 1;
  return gpuWeeklyCostOf(gpuById(project.gpu), project.scale, phaseShare * getMods(state).gpuCost * state.gpuCostMult);
}

/** тяжесть одной неисправленной деградации — для приоритета в списке */
export function degradationWeight(d: Degradation): number {
  return severityPoints(d.severity) * (1 - d.fixed);
}

function rollDegradations(project: Project, fields: FieldDef[], intensity: number, mods: Mods, rng: Rng): Degradation[] {
  const expected = BALANCE.project.degradationRate * intensity * mods.bug;
  let count = Math.floor(expected);
  if (rng.chance(expected - count)) count++;
  const out: Degradation[] = [];
  for (let i = 0; i < count; i++) {
    const type = rng.weighted(
      DEGRADATIONS.map((t): [DegradationType, number] => {
        let affinity = 0;
        for (const f of fields) affinity += t.fields[f.id] ?? 0;
        return [t, affinity * (mods.bugTags[t.tag] ?? 1)];
      }),
    );
    const [lo, mid, hi] = BALANCE.project.severityShare;
    const severity = rng.weighted<Severity>([
      ['low', lo],
      ['mid', mid],
      ['high', hi],
    ]);
    out.push({ id: project.nextDegradationId + i, type: type.id, severity, fixed: 0 });
  }
  return out;
}

/** шаг проекта за неделю: очки и деградации в фазах разработки, исправление — в стабилизации */
export function runProject(state: GameState, rng: Rng, events: SimEvent[]): void {
  let project = state.project;
  if (!project) return;
  const mods = getMods(state);
  const pools = teamPools(state);
  const gpuCost = gpuWeeklyCost(state);

  if (project.phase < DEV_PHASES) {
    const phase = project.phase as 0 | 1 | 2;
    const fields = fieldsOfPhase(phase);
    const points = weeklyPoints(state, pools, mods);
    const per = points / fields.length;
    const nextFields = { ...project.fields };
    for (const f of fields) {
      const share = project.sliders[f.id] / 100;
      const prev = project.fields[f.id];
      nextFields[f.id] = {
        research: prev.research + per * share * pools.rf,
        engineering: prev.engineering + per * (1 - share) * pools.ef,
      };
    }
    // чем сильнее команда обгоняет ожидания рынка, тем чаще что-то ломается
    const expectedPerWeek = expectedPoints(project.scale, state.week) / phaseWeeksTotal(project.weeksPerPhase);
    const intensity = expectedPerWeek > 0 ? points / expectedPerWeek : 0;
    const fresh = rollDegradations(project, fields, intensity, mods, rng);
    project = {
      ...project,
      fields: nextFields,
      degradations: [...project.degradations, ...fresh],
      nextDegradationId: project.nextDegradationId + fresh.length,
      lastPoints: points,
      spent: project.spent + gpuCost,
      weekInPhase: project.weekInPhase + 1,
    };
    if (project.weekInPhase >= project.weeksPerPhase[phase]) {
      project = { ...project, weekInPhase: 0, phase: (phase + 1) as Phase };
      events.push({
        type: 'toast',
        text: project.phase >= DEV_PHASES ? 'Разработка завершена. Команда стабилизирует модель — можно выпустить сразу.' : `Фаза «${PHASE_NAMES[phase]}» завершена`,
        tone: 'info',
      });
    }
    state.project = project;
    return;
  }

  // стабилизация: команда чинит деградации по списку, начиная с самых тяжёлых
  const { remaining, solved } = applyFix(project.degradations, fixCapacity(state, mods));
  if (solved > 0) events.push({ type: 'toast', text: solved === 1 ? 'Деградация устранена' : `Устранено деградаций: ${solved}`, tone: 'good' });
  state.project = { ...project, degradations: remaining, spent: project.spent + gpuCost };
  if (remaining.length === 0) releaseProject(state, rng, events);
}

/**
 * Тратит amount «очков исправления» на самые тяжёлые деградации.
 * Возвращает новый список и число полностью устранённых.
 */
export function applyFix(degradations: readonly Degradation[], amount: number): { remaining: Degradation[]; solved: number } {
  const ordered = [...degradations].sort((a, b) => degradationWeight(b) - degradationWeight(a));
  let left = amount;
  const remaining: Degradation[] = [];
  let solved = 0;
  for (const d of ordered) {
    if (left <= 0 || d.fixed >= 1) {
      if (d.fixed < 1) remaining.push(d);
      continue;
    }
    const total = severityPoints(d.severity);
    const applied = Math.min(left, total * (1 - d.fixed));
    left -= applied;
    const fixed = d.fixed + applied / total;
    if (fixed >= 0.999) solved++;
    else remaining.push({ ...d, fixed });
  }
  return { remaining, solved };
}

/** максимальная выручка за неделю (пик кривой продаж) при текущем хайпе и цитируемости */
export function salesPotential(state: GameState, domain: string, platformId: string, rating: number): number {
  const platform = platformById(platformId);
  const reach = platformReach(platform, state.week) * Math.pow(BALANCE.growth.market, yearsSince(state.week));
  const audience = reach * BALANCE.sales.reachMoney + state.fans * BALANCE.sales.fanMoney + state.hype * BALANCE.sales.hypeMoney;
  return audience * ratingFactor(rating) * platform.share * marketMultiplier(state) * trendMultiplier(state, domain) * getMods(state).revenue;
}

/** разовый сбор регулятора за релиз в регулируемых доменах */
export function complianceFee(state: GameState, domain: string): number {
  let fee = 0;
  for (const rule of state.compliance) {
    if (rule.domains.includes(domain) || rule.domains.includes('all')) fee += rule.amount;
  }
  return fee;
}

/** выпускает модель: четыре оценки, старт кривой продаж, рост цитируемости */
export function releaseProject(state: GameState, rng: Rng, events: SimEvent[]): ReleasedModel | null {
  const project = state.project;
  if (!project) return null;
  const report = scoreProject(state, project);
  const { reviews, rating } = reviewModel(report, rng);
  const potential = salesPotential(state, project.domain, project.platform, rating);
  const fee = complianceFee(state, project.domain);
  const fansGained = Math.max(0, rating - BALANCE.fans.ratingBase) * BALANCE.fans.perRatingPoint + state.hype * BALANCE.fans.perHype;

  const model: ReleasedModel = {
    id: state.nextModelId,
    name: project.name,
    domain: project.domain,
    paradigm: project.paradigm,
    platform: project.platform,
    scale: project.scale,
    releasedWeek: state.week,
    rating,
    quality: report.quality,
    reviews,
    report,
    waves: [{ startWeek: state.week, potential }],
    weekly: [],
    totalRevenue: 0,
    lastRevenue: 0,
    fansGained,
    versions: [],
    baseId: project.baseModelId,
    versionType: project.expansion,
  };

  state.rng = rng.state;
  state.nextModelId += 1;
  state.models = [...state.models, model];
  state.project = null;
  state.money -= fee;
  state.fans += fansGained;
  state.hype *= BALANCE.hype.afterRelease;

  const key = comboKey(project.domain, project.paradigm);
  const memory = state.comboMemory[key];
  state.comboMemory = {
    ...state.comboMemory,
    [key]: { times: (memory?.times ?? 0) + 1, fit: report.fit, bestRating: Math.max(memory?.bestRating ?? 0, rating) },
  };

  const s = state.stats;
  state.stats = {
    ...s,
    releases: s.releases + 1,
    bestRating: Math.max(s.bestRating, rating),
    bestModel: rating > s.bestRating ? model.name : s.bestModel,
    lowRatedReleases: s.lowRatedReleases + (rating < 4 ? 1 : 0),
    perfectReleases: s.perfectReleases + (reviews.every((r) => r.score >= 9.95) ? 1 : 0),
    cleanReleases: s.cleanReleases + (report.degradationPenalty === 0 ? 1 : 0),
    flagships: s.flagships + (project.scale === 'flagship' ? 1 : 0),
    paradigmsUsed: s.paradigmsUsed.includes(project.paradigm) ? s.paradigmsUsed : [...s.paradigmsUsed, project.paradigm],
    lastReleaseWeek: state.week,
  };

  events.push({ type: 'release', modelId: model.id });
  if (fee > 0) events.push({ type: 'toast', text: `Сбор регулятора за релиз: −${Math.round(fee).toLocaleString('ru-RU')} Cr`, tone: 'bad' });
  checkAchievements(state, events);
  return model;
}

/** досрочный выпуск из стабилизации; в фазах разработки нельзя */
export function releaseNow(state: GameState, rng: Rng, events: SimEvent[]): string | null {
  const project = state.project;
  if (!project) return 'Нет активного проекта';
  if (project.phase < DEV_PHASES) return 'Модель можно выпустить только после трёх фаз разработки';
  releaseProject(state, rng, events);
  return null;
}

/** сила, с которой команда чинит деградации за неделю */
export function fixCapacity(state: GameState, mods: Mods = getMods(state)): number {
  const power = teamPools(state).power;
  return (BALANCE.project.fixBase + BALANCE.project.fixPerPower * (power / BALANCE.project.fixReferencePower)) * mods.fix;
}

/** доля исправленного по всем деградациям проекта — для общего прогресса стабилизации */
export function stabilizationProgress(project: Project): number {
  if (project.degradations.length === 0) return 1;
  let done = 0;
  let total = 0;
  for (const d of project.degradations) {
    total += severityPoints(d.severity);
    done += severityPoints(d.severity) * d.fixed;
  }
  return total > 0 ? clamp(done / total, 0, 1) : 1;
}
