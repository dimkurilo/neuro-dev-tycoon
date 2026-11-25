import type { GameState, OfficeModuleDef, OfficeObject, Staff } from '../types';
import { BALANCE } from '../data/balance';
import { OFFICES, OFFICE_COLS, officeById } from '../data/offices';
import { moduleById } from '../data/modules';
import { researchName } from '../data/research';
import { licensePrice } from './market';
import { isResearchDone } from './unlock';

/** всё, что объекты офиса дают одному столу; числа суммируются по всем объектам вокруг */
export interface DeskBonus {
  /** доля к мощности сотрудника: 0.1 → +10% */
  speed: number;
  research: number;
  engineering: number;
  /** доля к темпу выгорания: +0.2 → на 20% быстрее, −0.25 → на 25% медленнее */
  burnout: number;
  /** доля к исследовательским очкам */
  rp: number;
  /** объекты, от которых стол получил бонусы */
  sources: OfficeObject[];
}

const NO_BONUS: DeskBonus = { speed: 0, research: 0, engineering: 0, burnout: 0, rp: 0, sources: [] };

/** восемь клеток вокруг объекта */
export function tilesAround(tile: number, rows: number): number[] {
  const row = Math.floor(tile / OFFICE_COLS);
  const col = tile % OFFICE_COLS;
  const out: number[] = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(OFFICE_COLS - 1, col + 1); c++) {
      if (r !== row || c !== col) out.push(r * OFFICE_COLS + c);
    }
  }
  return out;
}

export function officeRank(state: GameState): number {
  return OFFICES.findIndex((o) => o.id === state.office);
}

export function ownedCount(state: GameState, id: string): number {
  return state.objects.filter((o) => o.id === id).length;
}

export function objectPrice(state: GameState, def: OfficeModuleDef): number {
  return licensePrice(state, def.cost);
}

export function objectAt(state: GameState, tile: number): OfficeObject | undefined {
  return state.objects.find((o) => o.tile === tile);
}

export function staffAtDesk(state: GameState, desk: number): Staff | undefined {
  return state.staff.find((s) => s.desk === desk);
}

/** можно ли поставить объект на клетку: она есть в офисе и не занята */
export function canPlaceObject(state: GameState, tile: number): boolean {
  const office = officeById(state.office);
  return Number.isInteger(tile) && tile >= 0 && tile < office.rows * OFFICE_COLS && !office.desks.includes(tile) && !objectAt(state, tile);
}

/** почему объект не купить; null — можно */
export function canBuyObject(state: GameState, id: string): string | null {
  const def = moduleById(id);
  if (!def) return 'Неизвестный объект';
  if (officeRank(state) < def.minOffice) return `Нужен офис «${OFFICES[def.minOffice].name}»`;
  if (!isResearchDone(state, def.research)) return `Нужно исследование «${researchName(def.research)}»`;
  if (state.objects.length >= officeById(state.office).objectLimit) return 'В офисе не осталось места для объектов';
  if (ownedCount(state, id) >= def.max) return def.max === 1 ? 'Уже куплен' : 'Больше не купить';
  if (state.money < objectPrice(state, def)) return 'Недостаточно денег';
  return null;
}

/** столы в восьми клетках вокруг клетки */
export function coveredDesks(state: GameState, tile: number): number[] {
  const office = officeById(state.office);
  const around = tilesAround(tile, office.rows);
  return office.desks.filter((d) => around.includes(d));
}

/** свободная клетка, с которой объект накроет больше всего столов */
function bestTile(state: GameState): number | null {
  const office = officeById(state.office);
  let best: number | null = null;
  let bestCover = -1;
  for (let tile = 0; tile < office.rows * OFFICE_COLS; tile++) {
    if (!canPlaceObject(state, tile)) continue;
    const cover = coveredDesks(state, tile).length;
    if (cover > bestCover) {
      best = tile;
      bestCover = cover;
    }
  }
  return best;
}

/** покупает объект и ставит его на самую выгодную свободную клетку */
export function buyObject(state: GameState, id: string): string | null {
  const error = canBuyObject(state, id);
  if (error) return error;
  const def = moduleById(id);
  if (!def) return 'Неизвестный объект';
  const tile = bestTile(state);
  if (tile === null) return 'В офисе не осталось места для объектов';
  state.money -= objectPrice(state, def);
  state.objects = [...state.objects, { uid: state.nextObjectUid, id, tile }];
  state.nextObjectUid += 1;
  return null;
}

export function moveObject(state: GameState, uid: number, tile: number): string | null {
  const object = state.objects.find((o) => o.uid === uid);
  if (!object) return 'Объект не найден';
  if (object.tile === tile) return null;
  if (!canPlaceObject(state, tile)) return 'Сюда объект не поставить';
  state.objects = state.objects.map((o) => (o.uid === uid ? { ...o, tile } : o));
  return null;
}

/** продаёт объект за часть текущей цены */
export function sellObject(state: GameState, uid: number): string | null {
  const object = state.objects.find((o) => o.uid === uid);
  if (!object) return 'Объект не найден';
  const def = moduleById(object.id);
  state.objects = state.objects.filter((o) => o.uid !== uid);
  if (def) state.money += objectPrice(state, def) * BALANCE.office.sellShare;
  return null;
}

/** пересаживает сотрудника за другой стол; занятый стол означает обмен местами */
export function moveDesk(state: GameState, staffId: string, desk: number): string | null {
  const staff = state.staff.find((s) => s.id === staffId);
  if (!staff) return 'Сотрудник не найден';
  if (staff.desk === desk) return null;
  if (!officeById(state.office).desks.includes(desk)) return 'Сотрудник работает только за столом';
  const seatMate = staffAtDesk(state, desk);
  state.staff = state.staff.map((s) => (s.id === staffId ? { ...s, desk } : s.id === seatMate?.id ? { ...s, desk: staff.desk } : s));
  return null;
}

/** сотрудники, оставшиеся без стола (переезд, ранний сейв), занимают свободные */
export function reseat(state: GameState): void {
  const desks = officeById(state.office).desks;
  const taken = new Set(state.staff.map((s) => s.desk));
  let next = 0;
  state.staff = state.staff.map((s) => {
    if (s.desk !== null && desks.includes(s.desk)) return s;
    while (next < desks.length && taken.has(desks[next])) next++;
    if (next >= desks.length) return s.desk === null ? s : { ...s, desk: null };
    const desk = desks[next];
    taken.add(desk);
    return { ...s, desk };
  });
}

/** после переезда объекты, чья клетка стала столом или исчезла, стоят на лучших свободных */
export function settleObjects(state: GameState): void {
  const office = officeById(state.office);
  const limit = office.rows * OFFICE_COLS;
  for (const object of [...state.objects]) {
    if (object.tile < limit && !office.desks.includes(object.tile)) continue;
    const tile = bestTile(state);
    if (tile === null) continue;
    state.objects = state.objects.map((o) => (o.uid === object.uid ? { ...o, tile } : o));
  }
}

export function deskBonus(state: GameState, desk: number | null): DeskBonus {
  if (desk === null) return NO_BONUS;
  const rows = officeById(state.office).rows;
  const bonus: DeskBonus = { speed: 0, research: 0, engineering: 0, burnout: 0, rp: 0, sources: [] };
  for (const object of state.objects) {
    if (!tilesAround(object.tile, rows).includes(desk)) continue;
    const def = moduleById(object.id);
    if (!def) continue;
    bonus.speed += def.effect.speed ?? 0;
    bonus.research += def.effect.research ?? 0;
    bonus.engineering += def.effect.engineering ?? 0;
    bonus.burnout += def.effect.burnout ?? 0;
    bonus.rp += def.effect.rp ?? 0;
    bonus.sources.push(object);
  }
  return bonus;
}

/** во сколько раз меняется темп выгорания за столом */
export function burnoutFactor(bonus: DeskBonus): number {
  return Math.max(BALANCE.office.burnoutFloor, 1 + bonus.burnout);
}

export function objectsUpkeep(state: GameState): number {
  let sum = 0;
  for (const object of state.objects) sum += moduleById(object.id)?.upkeep ?? 0;
  return sum;
}
