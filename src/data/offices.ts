import type { Office } from '../types';

// Три офиса: гараж → студия → кампус. Сетка шесть колонок, desks — клетки со столами (индекс = строка × 6 + колонка);
// остальные клетки свободны — на них ставятся объекты офиса.
export const OFFICES: Office[] = [
  {
    id: 'garage',
    name: 'Гараж',
    desc: 'Тесно, зато бесплатно. Помещаются вы и два соратника.',
    capacity: 3,
    rent: 0,
    moveCost: 0,
    research: null,
    rows: 3,
    desks: [7, 8, 9],
    objectLimit: 2,
  },
  {
    id: 'studio',
    name: 'Студия',
    desc: 'Светлый лофт с переговоркой. Место для настоящей команды.',
    capacity: 9,
    rent: 1800,
    moveCost: 60000,
    research: 'office-studio',
    rows: 4,
    desks: [7, 8, 9, 10, 13, 14, 15, 19, 20],
    objectLimit: 5,
  },
  {
    id: 'campus',
    name: 'Кампус',
    desc: 'Собственный кампус: два этажа, серверная, столовая и вид на реку.',
    capacity: 24,
    rent: 8000,
    moveCost: 400000,
    research: 'office-campus',
    rows: 6,
    desks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
    objectLimit: 8,
  },
];

export const OFFICE_BY_ID: Record<string, Office> = Object.fromEntries(OFFICES.map((x) => [x.id, x]));

export function officeById(id: string): Office {
  return OFFICE_BY_ID[id] ?? OFFICES[0];
}

export const OFFICE_COLS = 6;
