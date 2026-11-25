import type { ExpansionType, GameState, Project, ReleasedModel } from '../types';
import { EXPANSIONS } from '../data/expansions';
import { featureById } from '../data/features';
import { scaleById } from '../data/compat';
import { FIELD_IDS } from '../data/fields';
import type { Rng } from './rng';

export function baseModelOf(state: GameState, id: number): ReleasedModel | undefined {
  return state.models.find((m) => m.id === id);
}

/** недели трёх фаз версии: доли от базового масштаба, но не меньше одной */
export function expansionWeeks(base: ReleasedModel, type: ExpansionType): [number, number, number] {
  const def = EXPANSIONS[type];
  return scaleById(base.scale).weeks.map((w) => Math.max(1, Math.round(w * def.weeksMult))) as [number, number, number];
}

export function expansionName(base: ReleasedModel, type: ExpansionType): string {
  return `${base.name}${EXPANSIONS[type].suffix}`;
}

/** почему версию нельзя выпустить; null — можно */
export function canExpand(state: GameState, baseId: number, type: ExpansionType): string | null {
  const base = baseModelOf(state, baseId);
  if (!base) return 'Базовая модель не найдена';
  if (state.project) return 'Сначала завершите текущий проект';
  const def = EXPANSIONS[type];
  for (const id of def.requires) {
    if (!state.framework.features.includes(id)) return `Нужна функция фреймворка «${featureById(id)?.name ?? id}»`;
  }
  if (def.minScale && base.scale === 'pet') return 'Нужна базовая модель масштаба не ниже «Продуктовая модель»';
  if (type !== 'finetune' && state.models.some((m) => m.baseId === baseId && m.versionType === type)) {
    return `Для «${base.name}» уже выпущена ${def.name.toLowerCase()}`;
  }
  return null;
}

/** запускает проект версии модели: те же три фазы слайдеров, но короче */
export function startExpansion(state: GameState, baseId: number, type: ExpansionType, rng: Rng, name: string): string | null {
  const error = canExpand(state, baseId, type);
  if (error) return error;
  const base = baseModelOf(state, baseId);
  if (!base) return 'Базовая модель не найдена';
  const fields = {} as Project['fields'];
  const sliders = {} as Project['sliders'];
  for (const id of FIELD_IDS) {
    fields[id] = { research: 0, engineering: 0 };
    sliders[id] = 50;
  }
  state.project = {
    id: state.nextProjectId,
    kind: 'expansion',
    name: name.trim() || expansionName(base, type),
    domain: base.domain,
    paradigm: base.paradigm,
    platform: base.platform,
    scale: type === 'xl' && base.scale === 'product' ? 'flagship' : base.scale,
    gpu: state.gpu,
    phase: 0,
    weekInPhase: 0,
    weeksPerPhase: expansionWeeks(base, type),
    sliders,
    fields,
    degradations: [],
    nextDegradationId: 1,
    contractId: null,
    startedWeek: state.week,
    spent: 0,
    lastPoints: 0,
    baseModelId: baseId,
    expansion: type,
    features: [],
  };
  state.nextProjectId += 1;
  state.rng = rng.state;
  return null;
}
