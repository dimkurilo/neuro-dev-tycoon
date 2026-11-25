import type { Feature, GameState, Project, SimEvent } from '../types';
import { BALANCE } from '../data/balance';
import { FEATURES, featureById } from '../data/features';
import { isResearchDone } from './unlock';
import { licensePrice } from './market';
import { getMods } from './mods';
import { teamPools } from './project';
import { checkAchievements } from './achievements';

export function isFeatureResearched(state: GameState, feature: Feature): boolean {
  return isResearchDone(state, feature.research);
}

/** исследованные функции, которых ещё нет в фреймворке */
export function availableFeatures(state: GameState): Feature[] {
  return FEATURES.filter((f) => isFeatureResearched(state, f) && !state.framework.features.includes(f.id));
}

export function featureCost(state: GameState, feature: Feature): number {
  return licensePrice(state, feature.cost);
}

export function frameworkCost(state: GameState, ids: readonly string[]): number {
  let sum = 0;
  for (const id of ids) {
    const feature = featureById(id);
    if (feature) sum += featureCost(state, feature);
  }
  return sum;
}

/** длительность разработки версии: базовые недели функций, поделённые на силу команды и скорость фреймворка */
export function frameworkWeeks(state: GameState, ids: readonly string[]): number {
  const base = ids.reduce((sum, id) => sum + (featureById(id)?.weeks ?? 0), 0);
  const power = teamPools(state).power * getMods(state).speed;
  return Math.max(1, Math.round((base * BALANCE.project.fixReferencePower) / Math.max(1, power)));
}

export function canStartFramework(state: GameState, ids: readonly string[]): string | null {
  if (state.project) return 'Сначала завершите текущий проект';
  if (ids.length === 0) return 'Выберите хотя бы одну функцию';
  const available = new Set(availableFeatures(state).map((f) => f.id));
  for (const id of ids) if (!available.has(id)) return `Функция «${featureById(id)?.name ?? id}» недоступна`;
  const cost = frameworkCost(state, ids);
  if (state.money < cost) return `Нужно ${Math.round(cost).toLocaleString('ru-RU')} Cr на разработку`;
  return null;
}

/** название по умолчанию: первое слово имени лаборатории + «Core» */
export function defaultFrameworkName(state: GameState): string {
  const head = state.companyName.trim().split(/\s+/)[0] || 'Нейро';
  return `${head} Core`;
}

/** запускает проект новой версии фреймворка; стоимость списывается сразу */
export function startFramework(state: GameState, ids: readonly string[], name: string): string | null {
  const error = canStartFramework(state, ids);
  if (error) return error;
  const cost = frameworkCost(state, ids);
  state.money -= cost;
  const weeks = frameworkWeeks(state, ids);
  const project: Project = {
    id: state.nextProjectId,
    kind: 'framework',
    name: name.trim() || defaultFrameworkName(state),
    domain: '',
    paradigm: '',
    platform: '',
    scale: 'pet',
    gpu: state.gpu,
    phase: 0,
    weekInPhase: 0,
    weeksPerPhase: [weeks, 0, 0],
    sliders: {} as Project['sliders'],
    fields: {} as Project['fields'],
    degradations: [],
    nextDegradationId: 1,
    contractId: null,
    startedWeek: state.week,
    spent: cost,
    lastPoints: 0,
    baseModelId: null,
    expansion: null,
    features: [...ids],
  };
  state.nextProjectId += 1;
  state.project = project;
  return null;
}

/** версия готова: функции включаются в фреймворк и начинают действовать */
export function completeFramework(state: GameState, project: Project, events: SimEvent[]): void {
  const version = state.framework.version + 1;
  state.framework = { version, name: project.name, features: [...state.framework.features, ...project.features] };
  state.stats = { ...state.stats, frameworksBuilt: state.stats.frameworksBuilt + 1 };
  state.project = null;
  events.push({ type: 'toast', text: `Фреймворк «${project.name}» v${version} готов`, tone: 'good' });
  events.push({ type: 'framework' });
  checkAchievements(state, events);
}

/** шаг проекта фреймворка за неделю: по истечении срока версия собирается */
export function runFramework(state: GameState, events: SimEvent[]): void {
  const project = state.project;
  if (!project || project.kind !== 'framework') return;
  const week = project.weekInPhase + 1;
  if (week >= project.weeksPerPhase[0]) {
    completeFramework(state, project, events);
    return;
  }
  state.project = { ...project, weekInPhase: week };
}
