import type { Candidate, LevelId, RoleId, Staff } from '../types';
import type { IconName } from '../ui/icons';
import { BALANCE } from './balance';
import { PALETTE, suggestStaffName } from './names';
import { yearsSince } from '../sim/time';
import type { Rng } from '../sim/rng';
import { clamp } from '../sim/util';

export interface RoleDef {
  id: RoleId;
  name: string;
  desc: string;
  icon: IconName;
  /** разброс навыков кандидата: минимум и максимум */
  research: [number, number];
  engineering: [number, number];
  speed: [number, number];
  /** недельная зарплата в 2012 году для младшего */
  salary: number;
  /** фокус по умолчанию: доля исследований */
  focus: number;
}

export const ROLES: RoleDef[] = [
  { id: 'founder', name: 'Основатель', desc: 'Всё понемногу: наука, инженерия и уборка.', icon: 'crown', research: [50, 50], engineering: [50, 50], speed: [50, 50], salary: 0, focus: 50 },
  { id: 'researcher', name: 'Ресечер', desc: 'Двигает науку: даёт в полтора раза больше исследовательских очков.', icon: 'spark', research: [62, 96], engineering: [18, 48], speed: [30, 70], salary: 1000, focus: 75 },
  { id: 'ml_engineer', name: 'ML-инженер', desc: 'Собирает и доводит модель: инженерия и скорость.', icon: 'wrench', research: [30, 70], engineering: [58, 96], speed: [45, 85], salary: 1050, focus: 40 },
  { id: 'data_engineer', name: 'Дата-инженер', desc: 'Данные и пайплайны: меньше деградаций с данными.', icon: 'filter', research: [25, 60], engineering: [50, 90], speed: [40, 80], salary: 950, focus: 35 },
  { id: 'mlops', name: 'MLOps', desc: 'Инфраструктура: ускоряет команду и экономит GPU-часы.', icon: 'server', research: [15, 45], engineering: [45, 88], speed: [60, 98], salary: 1100, focus: 30 },
];

export const ROLE_BY_ID: Record<RoleId, RoleDef> = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<RoleId, RoleDef>;

export const LEVELS: Record<LevelId, { name: string; mult: [number, number]; salary: number; weight: number }> = {
  junior: { name: 'младший', mult: [0, 0.33], salary: 1, weight: 50 },
  middle: { name: 'средний', mult: [0.34, 0.66], salary: 1.6, weight: 32 },
  senior: { name: 'старший', mult: [0.67, 1], salary: 2.4, weight: 14 },
  principal: { name: 'главный', mult: [1, 1.15], salary: 3.6, weight: 4 },
};

export const LEVEL_ORDER: LevelId[] = ['junior', 'middle', 'senior', 'principal'];

/** звание сотрудника: «средний ML-инженер» */
export function staffTitle(staff: Pick<Staff, 'role' | 'level'>): string {
  return `${LEVELS[staff.level].name} ${ROLE_BY_ID[staff.role].name.toLowerCase()}`;
}

function skill(rng: Rng, range: [number, number], level: LevelId): number {
  const [lo, hi] = LEVELS[level].mult;
  const t = lo + rng.next() * (hi - lo);
  return Math.round(clamp(range[0] + (range[1] - range[0]) * t, 1, BALANCE.team.statCap));
}

function rollLevel(rng: Rng, bias: number): LevelId {
  // bias > 0 сдвигает рынок труда к сильным кандидатам (офис, цитируемость, хедхантер)
  const weights = LEVEL_ORDER.map((id): [LevelId, number] => {
    const w = LEVELS[id].weight * Math.pow(1 + bias, LEVEL_ORDER.indexOf(id));
    return [id, w];
  });
  return rng.weighted(weights);
}

/** подбор кандидатов: качество растёт с годами, уровнем офиса и цитируемостью */
export function generateCandidates(count: number, week: number, fans: number, officeRank: number, bias: number, rng: Rng): Candidate[] {
  const years = yearsSince(week);
  const marketBias = clamp(0.18 * years + 0.25 * officeRank + Math.min(0.5, Math.log10(1 + fans / 200)) + bias, 0, 3.2);
  const out: Candidate[] = [];
  for (let i = 0; i < count; i++) {
    const role = rng.pick(ROLES.filter((r) => r.id !== 'founder'));
    const level = rollLevel(rng, marketBias);
    out.push({
      id: '',
      name: suggestStaffName(rng),
      role: role.id,
      level,
      research: skill(rng, role.research, level),
      engineering: skill(rng, role.engineering, level),
      speed: skill(rng, role.speed, level),
      salary: Math.round((role.salary * LEVELS[level].salary * Math.pow(BALANCE.growth.salary, years) * rng.range(0.92, 1.08)) / 10) * 10,
      color: rng.pick(PALETTE),
    });
  }
  return out;
}
