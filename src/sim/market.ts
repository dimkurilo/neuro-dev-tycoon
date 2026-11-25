import type { GameState } from '../types';
import { BALANCE } from '../data/balance';
import { officeById } from '../data/offices';
import { PLATFORM_BY_ID } from '../data/platforms';
import { GPU_BY_ID } from '../data/gpus';
import { researchName } from '../data/research';
import { isResearchDone } from './unlock';
import { yearsSince, yearOf } from './time';

/** лицензии и прочие разовые платежи дорожают вместе с рынком */
export function licensePrice(state: GameState, base: number): number {
  return base * Math.pow(BALANCE.growth.cost, yearsSince(state.week));
}

export function licensePlatform(state: GameState, id: string): string | null {
  const platform = PLATFORM_BY_ID[id];
  if (!platform) return 'Неизвестная платформа';
  if (state.platforms.includes(id)) return 'Лицензия уже куплена';
  if (yearOf(state.week) < platform.year) return `Платформа появится в ${platform.year} году`;
  const price = licensePrice(state, platform.license);
  if (state.money < price) return 'Недостаточно денег';
  state.money -= price;
  state.platforms = [...state.platforms, id];
  return null;
}

/** аренда поколения ускорителей: открывает его для новых проектов и делает текущим */
export function licenseGpu(state: GameState, id: string): string | null {
  const gpu = GPU_BY_ID[id];
  if (!gpu) return 'Неизвестные вычисления';
  if (state.gpus.includes(id)) return 'Эти вычисления уже подключены';
  if (yearOf(state.week) < gpu.year) return `Появятся в ${gpu.year} году`;
  const price = licensePrice(state, gpu.license);
  if (state.money < price) return 'Недостаточно денег';
  state.money -= price;
  state.gpus = [...state.gpus, id];
  state.gpu = id;
  return null;
}

export function useGpu(state: GameState, id: string): string | null {
  if (!state.gpus.includes(id)) return 'Сначала арендуйте эти вычисления';
  if (state.project) return 'Нельзя менять вычисления посреди проекта';
  state.gpu = id;
  return null;
}

/** переезд в другой офис */
export function moveOffice(state: GameState, id: string): string | null {
  const office = officeById(id);
  if (office.id !== id) return 'Неизвестный офис';
  if (state.office === id) return 'Лаборатория уже здесь';
  if (!isResearchDone(state, office.research)) return `Нужно исследование «${researchName(office.research)}»`;
  const price = licensePrice(state, office.moveCost);
  if (state.money < price) return 'Недостаточно денег на переезд';
  state.money -= price;
  state.office = id;
  // столы, которых нет в новом офисе, освобождаются
  const desks = new Set(office.desks);
  state.staff = state.staff.map((s) => (s.desk !== null && !desks.has(s.desk) ? { ...s, desk: null } : s));
  return null;
}
