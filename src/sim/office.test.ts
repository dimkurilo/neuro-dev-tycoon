import { describe, expect, it } from 'vitest';
import type { GameState, Staff } from '../types';
import { BALANCE } from '../data/balance';
import { MODULES, moduleById } from '../data/modules';
import { OFFICES, OFFICE_COLS, officeById } from '../data/offices';
import { RESEARCH_BY_ID } from '../data/research';
import { burnoutFactor, buyObject, canBuyObject, canPlaceObject, coveredDesks, deskBonus, moveDesk, moveObject, objectsUpkeep, sellObject, tilesAround } from './office';
import { createGame } from './game';
import { normalizeGame } from './save';
import { moveOffice } from './market';
import { createModel, teamPools, type ModelInput } from './project';
import { runStaff } from './staff';
import { weeklyCosts } from './finance';
import { Rng } from './rng';

const INPUT: ModelInput = { name: 'М', domain: 'vision', paradigm: 'rnn', platform: 'web', scale: 'pet', gpu: 'g0' };
const OFFICE_RESEARCH = ['office-studio', 'office-board', 'office-coffee', 'office-library', 'office-campus', 'office-rest', 'office-server', 'office-gym'];

const module = (id: string) => {
  const def = moduleById(id);
  if (!def) throw new Error(`нет объекта ${id}`);
  return def;
};

/** студия со всеми объектами в продаже и деньгами */
function inStudio(seed = 1): GameState {
  const game = createGame('Т', 'О', seed);
  game.office = 'studio';
  game.research.done = [...OFFICE_RESEARCH];
  game.money = 1e6;
  return game;
}

function addStaff(game: GameState, desk: number | null): Staff {
  const staff: Staff = { ...game.staff[0], id: `x${game.staff.length}`, founder: false, desk, color: '#fff' };
  game.staff = [...game.staff, staff];
  return staff;
}

describe('офис: сетки', () => {
  it('основатель новой партии сидит за столом гаража', () => {
    const game = createGame('Т', 'О', 1);
    expect(officeById('garage').desks).toContain(game.staff[0].desk);
  });

  it('в каждом офисе столов ровно по вместимости и есть куда поставить объекты', () => {
    for (const office of OFFICES) {
      expect(office.desks).toHaveLength(office.capacity);
      expect(office.desks.every((d) => d >= 0 && d < office.rows * OFFICE_COLS)).toBe(true);
      const roomy = office.rows * OFFICE_COLS - office.desks.length;
      expect(roomy).toBeGreaterThanOrEqual(office.objectLimit);
    }
  });

  it('все объекты можно купить и расставить в кампусе', () => {
    const game = inStudio();
    game.office = 'campus';
    for (const def of MODULES) for (let i = 0; i < def.max; i++) expect(buyObject(game, def.id)).toBeNull();
    expect(game.objects).toHaveLength(MODULES.reduce((sum, m) => sum + m.max, 0));
    expect(new Set(game.objects.map((o) => o.tile)).size).toBe(game.objects.length);
  });

  it('вокруг клетки ровно восемь соседей, у края и угла меньше', () => {
    expect(tilesAround(7, 4)).toEqual([0, 1, 2, 6, 8, 12, 13, 14]);
    expect(tilesAround(0, 4)).toEqual([1, 6, 7]);
  });
});

describe('офис: покупка объектов', () => {
  it('в гараже объекты не продаются — нужен другой офис', () => {
    const game = createGame('Т', 'О', 1);
    game.research.done = [...OFFICE_RESEARCH];
    for (const def of MODULES) expect(canBuyObject(game, def.id)).toMatch(/Нужен офис/);
  });

  it('нужно исследование и деньги', () => {
    const game = inStudio();
    game.research.done = [];
    expect(canBuyObject(game, 'm-board')).toMatch(/исследование «Доски для схем»/);
    game.research.done = ['office-board'];
    expect(canBuyObject(game, 'm-coffee')).toMatch(/исследование/);
    game.money = 10;
    expect(canBuyObject(game, 'm-board')).toMatch(/Недостаточно денег/);
    game.research.done = [...OFFICE_RESEARCH];
    game.money = 1e6;
    expect(buyObject(game, 'm-coffee')).toBeNull();
    expect(canBuyObject(game, 'm-coffee')).toMatch(/Уже куплен/);
  });

  it('цена растёт вместе с рынком, списокывая ровно её', () => {
    const game = inStudio();
    game.week = 20 * 52;
    const price = module('m-board').cost * Math.pow(BALANCE.growth.cost, 20);
    const money = game.money;
    expect(buyObject(game, 'm-board')).toBeNull();
    expect(money - game.money).toBeCloseTo(price, 6);
  });

  it('объект ставится на свободную клетку, откуда накрывает больше всего столов', () => {
    const game = inStudio();
    expect(buyObject(game, 'm-board')).toBeNull();
    const board = game.objects[0];
    expect(officeById('studio').desks).not.toContain(board.tile);
    const covered = coveredDesks(game, board.tile).length;
    for (let tile = 0; tile < officeById('studio').rows * OFFICE_COLS; tile++) {
      if (tile !== board.tile && canPlaceObject(game, tile)) expect(coveredDesks(game, tile).length).toBeLessThanOrEqual(covered);
    }
    expect(covered).toBeGreaterThanOrEqual(3);
  });

  it('лимит объектов и лимит экземпляров соблюдаются', () => {
    const game = inStudio();
    for (const id of ['m-board', 'm-board', 'm-coffee', 'm-library']) expect(buyObject(game, id)).toBeNull();
    expect(buyObject(game, 'm-board')).toMatch(/Больше не купить/);
    expect(buyObject(game, 'm-rest')).toMatch(/Нужен офис «Кампус»/);
    // переполненный офис (так могло остаться от прошлой версии игры) ничего не принимает
    const limit = officeById('studio').objectLimit;
    game.objects = [...game.objects, ...Array.from({ length: limit - 4 }, (_, i) => ({ uid: 100 + i, id: 'm-board', tile: [0, 2][i] }))];
    expect(buyObject(game, 'm-coffee')).toMatch(/не осталось места/);
    expect(game.objects).toHaveLength(limit);
  });
});

describe('офис: действие на столы', () => {
  it('объект действует на восемь клеток вокруг и не дальше', () => {
    const game = inStudio();
    game.objects = [{ uid: 1, id: 'm-board', tile: 1 }];
    for (const desk of tilesAround(1, 4)) expect(deskBonus(game, desk).engineering).toBe(8);
    expect(deskBonus(game, 20).engineering).toBe(0);
    expect(deskBonus(game, null).engineering).toBe(0);
  });

  it('бонусы соседних объектов складываются', () => {
    const game = inStudio();
    // стол 7: кофе-поинт в клетке 1, библиотека в клетке 6, комната отдыха в клетке 12
    game.objects = [
      { uid: 1, id: 'm-coffee', tile: 1 },
      { uid: 2, id: 'm-library', tile: 6 },
      { uid: 3, id: 'm-rest', tile: 12 },
    ];
    const bonus = deskBonus(game, 7);
    expect(bonus).toMatchObject({ speed: 0.1, research: 8, burnout: 0.2 - 0.25 });
    expect(bonus.sources.map((o) => o.id)).toEqual(['m-coffee', 'm-library', 'm-rest']);
    expect(coveredDesks(game, 1)).toContain(7);
  });

  it('библиотека усиливает науку стола, кофе-поинт ускоряет всю работу за ним', () => {
    const base = inStudio();
    // основатель за столом 7; библиотека в клетке 6 и кофе-поинт в клетке 1 стоят рядом
    const office = inStudio();
    office.objects = [
      { uid: 1, id: 'm-library', tile: 6 },
      { uid: 2, id: 'm-coffee', tile: 1 },
    ];
    const plain = teamPools(base);
    const boosted = teamPools(office);
    expect(boosted.research).toBeCloseTo(plain.research * 1.1 * (58 / 50), 6);
    expect(boosted.engineering).toBeCloseTo(plain.engineering * 1.1, 6);
  });

  it('кофе-поинт ускоряет выгорание, комната отдыха и спортзал замедляют', () => {
    const week = (objects: GameState['objects']) => {
      const game = inStudio();
      createModel(game, new Rng(game.rng), INPUT);
      game.objects = objects;
      runStaff(game, new Rng(1), []);
      return game.staff[0].burnout;
    };
    const perWeek = BALANCE.team.burnoutPerWeek;
    // стол основателя — 7: кофе-поинт в клетке 6, комната отдыха в 12, спортзал в 2
    expect(week([])).toBeCloseTo(perWeek, 6);
    expect(week([{ uid: 1, id: 'm-coffee', tile: 6 }])).toBeCloseTo(perWeek * 1.2, 6);
    expect(week([{ uid: 1, id: 'm-rest', tile: 12 }])).toBeCloseTo(perWeek * 0.75, 6);
    expect(week([
      { uid: 1, id: 'm-rest', tile: 12 },
      { uid: 2, id: 'm-gym', tile: 2 },
    ])).toBeCloseTo(perWeek * 0.55, 6);
  });

  it('темп выгорания не падает ниже границы', () => {
    expect(burnoutFactor({ speed: 0, research: 0, engineering: 0, burnout: -0.95, rp: 0, sources: [] })).toBe(BALANCE.office.burnoutFloor);
    expect(burnoutFactor({ speed: 0, research: 0, engineering: 0, burnout: -0.25, rp: 0, sources: [] })).toBeCloseTo(0.75, 6);
  });
});

describe('офис: расстановка', () => {
  it('объект переставляется на свободную клетку, на стол и занятую — нет', () => {
    const game = inStudio();
    buyObject(game, 'm-board');
    const uid = game.objects[0].uid;
    const from = game.objects[0].tile;
    expect(moveObject(game, uid, 7)).toMatch(/не поставить/);
    expect(moveObject(game, uid, from)).toBeNull();
    expect(moveObject(game, uid, 0)).toBeNull();
    expect(game.objects[0].tile).toBe(0);
    buyObject(game, 'm-coffee');
    expect(moveObject(game, uid, game.objects[1].tile)).toMatch(/не поставить/);
    expect(moveObject(game, 99, 0)).toMatch(/не найден/);
    expect(canPlaceObject(game, 999)).toBe(false);
  });

  it('сотрудник пересаживается за другой стол или меняется местами', () => {
    const game = inStudio();
    const other = addStaff(game, 8);
    expect(moveDesk(game, 'founder', 9)).toBeNull();
    expect(game.staff[0].desk).toBe(9);
    expect(moveDesk(game, 'founder', 8)).toBeNull();
    expect(game.staff[0].desk).toBe(8);
    expect(game.staff.find((s) => s.id === other.id)?.desk).toBe(9);
    expect(moveDesk(game, 'founder', 0)).toMatch(/только за столом/);
    expect(moveDesk(game, 'founder', 8)).toBeNull();
    expect(moveDesk(game, 'nobody', 7)).toMatch(/не найден/);
  });

  it('продажа возвращает часть цены и освобождает клетку', () => {
    const game = inStudio();
    const money = game.money;
    buyObject(game, 'm-library');
    const object = game.objects[0];
    expect(sellObject(game, object.uid)).toBeNull();
    expect(game.objects).toHaveLength(0);
    expect(game.money).toBeCloseTo(money - module('m-library').cost * (1 - BALANCE.office.sellShare), 6);
    expect(canPlaceObject(game, object.tile)).toBe(true);
    expect(sellObject(game, object.uid)).toMatch(/не найден/);
  });

  it('содержание объектов входит в недельные расходы', () => {
    const game = inStudio();
    expect(weeklyCosts(game).upkeep).toBe(0);
    buyObject(game, 'm-coffee');
    buyObject(game, 'm-board');
    expect(objectsUpkeep(game)).toBe(module('m-coffee').upkeep + module('m-board').upkeep);
    expect(weeklyCosts(game).upkeep).toBe(objectsUpkeep(game));
  });
});

describe('офис: переезд и старые сейвы', () => {
  it('после переезда оставшиеся без стола занимают свободные', () => {
    const game = inStudio();
    addStaff(game, 10);
    game.research.done = [...OFFICE_RESEARCH];
    expect(moveOffice(game, 'campus')).toBeNull();
    const desks = game.staff.map((s) => s.desk);
    expect(desks.every((d) => d !== null && officeById('campus').desks.includes(d))).toBe(true);
    expect(new Set(desks).size).toBe(game.staff.length);
  });

  it('при переезде объекты не остаются на клетках, которые стали столами', () => {
    const game = inStudio();
    for (const id of ['m-board', 'm-coffee', 'm-library']) expect(buyObject(game, id)).toBeNull();
    const before = game.objects.map((o) => o.tile);
    expect(before.some((tile) => officeById('campus').desks.includes(tile))).toBe(true);
    expect(moveOffice(game, 'campus')).toBeNull();
    const desks = officeById('campus').desks;
    expect(game.objects).toHaveLength(3);
    expect(game.objects.every((o) => !desks.includes(o.tile))).toBe(true);
    expect(new Set(game.objects.map((o) => o.tile)).size).toBe(3);
    // на прежнем месте остаются только те, кто и в новом офисе стоит на свободной клетке
    expect(game.objects.filter((o, i) => o.tile === before[i]).length).toBe(before.filter((tile) => !desks.includes(tile)).length);
  });

  it('ранний сейв с основателем вне стола чинится при загрузке', () => {
    const raw = JSON.parse(JSON.stringify(createGame('Т', 'О', 1))) as GameState;
    raw.staff[0].desk = 0;
    expect(officeById('garage').desks).not.toContain(0);
    const loaded = normalizeGame(raw);
    expect(loaded).not.toBeNull();
    expect(officeById('garage').desks).toContain(loaded?.staff[0].desk);
  });

  it('каждый объект открывается существующим исследованием и нужен не выше третьего офиса', () => {
    for (const def of MODULES) {
      expect(RESEARCH_BY_ID[def.research]?.effects.modules).toContain(def.id);
      expect(def.minOffice).toBeLessThan(OFFICES.length);
      expect(def.max).toBeGreaterThan(0);
    }
  });
});
