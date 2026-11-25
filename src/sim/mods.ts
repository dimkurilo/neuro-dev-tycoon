import type { DegTag, GameState, ResearchEffects } from '../types';
import { BOOSTS } from '../data/boosts';
import { RESEARCH_BY_ID } from '../data/research';
import { BALANCE } from '../data/balance';

/**
 * Суммарные множители лаборатории. Не хранятся в сейве, а считаются на лету из того,
 * что уже открыто: исследований, активных бустов и состава команды на проекте.
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
  /** снижение выгорания за неделю от бустов */
  burnoutRelief: number;
  /** стоимость GPU-часов */
  gpuCost: number;
  /** выручка */
  revenue: number;
}

export function baseMods(): Mods {
  return { speed: 1, quality: 1, rp: 1, bug: 1, bugTags: {}, fix: 1, burnout: 1, burnoutRelief: 0, gpuCost: 1, revenue: 1 };
}

/** применяет числовые эффекты одного источника: исследования или буста */
function apply(m: Mods, e: ResearchEffects): void {
  m.speed += e.speed ?? 0;
  m.quality += e.quality ?? 0;
  m.rp += e.rp ?? 0;
  m.bug *= 1 - (e.bugReduce ?? 0);
  if (e.bugTags) {
    for (const tag of Object.keys(e.bugTags) as DegTag[]) {
      m.bugTags[tag] = (m.bugTags[tag] ?? 1) * (1 - (e.bugTags[tag] ?? 0));
    }
  }
  m.fix += e.fixRate ?? 0;
  m.burnout += e.burnout ?? 0;
  m.gpuCost *= 1 - (e.gpuCost ?? 0);
  m.revenue += e.revenue ?? 0;
}

export function getMods(state: GameState): Mods {
  const m = baseMods();

  for (const id of state.research.done) {
    const effects = RESEARCH_BY_ID[id]?.effects;
    if (effects) apply(m, effects);
  }

  for (const active of state.boosts) {
    if (state.week >= active.endsWeek) continue;
    const def = BOOSTS.find((b) => b.id === active.id);
    if (!def) continue;
    apply(m, { speed: def.speed ?? def.points, rp: def.rp, gpuCost: def.gpuCost, burnout: def.burnoutRate });
    if (def.burnout !== undefined && def.burnout < 0) m.burnoutRelief -= def.burnout;
  }

  // особенности ролей учитываются только для тех, кто работает на проекте
  if (state.project) {
    const roles = BALANCE.team.roles;
    let data = 0;
    let mlops = 0;
    let engineer = 0;
    for (const s of state.staff) {
      if (!s.onProject || s.vacationWeeks > 0 || s.training || s.founder) continue;
      if (s.role === 'data_engineer') data++;
      else if (s.role === 'mlops') mlops++;
      else if (s.role === 'ml_engineer') engineer++;
    }
    if (data > 0) m.bugTags.data = (m.bugTags.data ?? 1) * (1 - Math.min(roles.dataBugCap, roles.dataBug * data));
    if (mlops > 0) {
      m.gpuCost *= 1 - Math.min(roles.gpuCostCap, roles.gpuCost * mlops);
      m.speed += Math.min(roles.speedCap, roles.speed * mlops);
    }
    if (engineer > 0) m.fix += Math.min(roles.fixCap, roles.fix * engineer);
  }

  return m;
}
