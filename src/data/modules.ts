import type { OfficeModuleDef } from '../types';

// Объекты офиса: покупаются и расставляются по клеткам; действуют на соседние столы.
// minOffice — какой офис нужен (0 — гараж, 1 — студия, 2 — кампус), upkeep — содержание в неделю.
export const MODULES: OfficeModuleDef[] = [
  { id: 'm-board', name: 'Доска для схем', icon: 'board', desc: 'Соседние столы: +8 к инженерии.', cost: 8000, upkeep: 50, research: 'office-board', max: 2, minOffice: 1, effect: { engineering: 8 } },
  { id: 'm-coffee', name: 'Кофе-поинт', icon: 'coffee', desc: 'Соседние столы: +10% к скорости, но выгорание быстрее на 20%.', cost: 12000, upkeep: 150, research: 'office-coffee', max: 1, minOffice: 1, effect: { speed: 0.1, burnout: 0.2 } },
  { id: 'm-library', name: 'Библиотека', icon: 'library', desc: 'Соседние столы: +8 к исследованиям.', cost: 10000, upkeep: 60, research: 'office-library', max: 1, minOffice: 1, effect: { research: 8 } },
  { id: 'm-rest', name: 'Комната отдыха', icon: 'sofa', desc: 'Соседние столы: выгорание на 25% медленнее.', cost: 30000, upkeep: 200, research: 'office-rest', max: 1, minOffice: 2, effect: { burnout: -0.25 } },
  { id: 'm-server', name: 'Серверная', icon: 'server', desc: 'Соседние столы: +8% к скорости.', cost: 45000, upkeep: 400, research: 'office-server', max: 1, minOffice: 2, effect: { speed: 0.08 } },
  { id: 'm-gym', name: 'Спортивный уголок', icon: 'dumbbell', desc: 'Соседние столы: выгорание на 20% медленнее.', cost: 40000, upkeep: 250, research: 'office-gym', max: 1, minOffice: 2, effect: { burnout: -0.2 } },
];

export const MODULE_BY_ID: Record<string, OfficeModuleDef> = Object.fromEntries(MODULES.map((m) => [m.id, m]));

export function moduleById(id: string): OfficeModuleDef | undefined {
  return MODULE_BY_ID[id];
}
