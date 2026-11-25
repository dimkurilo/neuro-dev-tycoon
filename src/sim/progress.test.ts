import { describe, expect, it } from 'vitest';
import type { GameState, LevelId, RoleId, Staff } from '../types';
import { BALANCE } from '../data/balance';
import { BOOSTS } from '../data/boosts';
import { COURSES } from '../data/courses';
import { OFFICES, officeById } from '../data/offices';
import { RESEARCH, RESEARCH_BY_ID } from '../data/research';
import { createGame } from './game';
import { advanceWeek } from './tick';
import { Rng } from './rng';
import { canTakeCourse, fire, hire, isAvailable, refreshCandidates, rpPerWeek, sendTraining, sendVacation, weeklySalaries } from './staff';
import { canStartResearch, researchCost, startResearch } from './research';
import { activateBoost, boostActive, canBoost } from './boosts';
import { getMods } from './mods';
import { moveOffice } from './market';
import { createModel, gpuWeeklyCost, type ModelInput } from './project';

const INPUT: ModelInput = { name: 'М', domain: 'vision', paradigm: 'rnn', platform: 'web', scale: 'pet', gpu: 'g0' };

function withProject(seed = 1): GameState {
  const game = createGame('Т', 'О', seed);
  createModel(game, new Rng(game.rng), INPUT);
  return game;
}

function addStaff(game: GameState, role: RoleId, level: LevelId = 'middle', extra: Partial<Staff> = {}): Staff {
  const staff: Staff = {
    id: `x${game.staff.length + 1}`,
    name: 'Тест Тестов',
    role,
    level,
    research: 60,
    engineering: 60,
    speed: 60,
    salary: 1000,
    burnout: 0,
    focus: 50,
    onProject: true,
    founder: false,
    vacationWeeks: 0,
    training: null,
    desk: null,
    hiredWeek: game.week,
    burnouts: 0,
    color: '#fff',
    ...extra,
  };
  game.staff = [...game.staff, staff];
  return staff;
}

describe('найм и команда', () => {
  it('в начале партии есть кандидаты с именами и зарплатой', () => {
    const game = createGame('Т', 'О', 1);
    expect(game.candidates).toHaveLength(BALANCE.team.candidateCount);
    for (const c of game.candidates) {
      expect(c.name.length).toBeGreaterThan(3);
      expect(c.salary).toBeGreaterThan(0);
      expect(c.role).not.toBe('founder');
      expect(c.research).toBeGreaterThan(0);
      expect(c.research).toBeLessThanOrEqual(BALANCE.team.statCap);
    }
    expect(new Set(game.candidates.map((c) => c.id)).size).toBe(game.candidates.length);
  });

  it('найм ограничен вместимостью офиса', () => {
    const game = createGame('Т', 'О', 1);
    expect(officeById(game.office).capacity).toBe(3);
    const ids = game.candidates.map((c) => c.id);
    expect(hire(game, ids[0])).toBeNull();
    expect(hire(game, ids[1])).toBeNull();
    expect(hire(game, ids[2])).toMatch(/свободных мест/);
    expect(game.staff).toHaveLength(3);
    refreshCandidates(game, new Rng(5));
    expect(hire(game, game.candidates[0].id)).toMatch(/свободных мест/);
    expect(game.stats.hired).toBe(2);
    expect(game.staff[1].desk).not.toBeNull();
  });

  it('увольнение стоит выходное пособие, основателя уволить нельзя', () => {
    const game = createGame('Т', 'О', 1);
    const money = game.money;
    hire(game, game.candidates[0].id);
    const hired = game.staff[1];
    const before = weeklySalaries(game);
    expect(before).toBe(hired.salary);
    expect(fire(game, 'founder')).toMatch(/Основателя/);
    expect(fire(game, hired.id)).toBeNull();
    expect(game.money).toBe(money - hired.salary * BALANCE.team.severanceWeeks);
    expect(weeklySalaries(game)).toBe(0);
  });

  it('сильные кандидаты чаще в хорошем офисе и с ростом цитируемости', () => {
    const rank = (week: number, fans: number, office: string, seed: number) => {
      const game = createGame('Т', 'О', seed);
      game.week = week;
      game.fans = fans;
      game.office = office;
      refreshCandidates(game, new Rng(seed));
      return game.candidates.reduce((sum, c) => sum + ['junior', 'middle', 'senior', 'principal'].indexOf(c.level), 0);
    };
    let early = 0;
    let late = 0;
    for (let seed = 1; seed <= 40; seed++) {
      early += rank(0, 0, 'garage', seed);
      late += rank(20 * 52, 50000, 'campus', seed);
    }
    expect(late).toBeGreaterThan(early * 1.5);
  });
});

describe('исследовательские очки и лаборатория', () => {
  it('основатель даёт 1.5 очка в неделю на проекте и 3 без проекта', () => {
    const idle = createGame('Т', 'О', 1);
    expect(rpPerWeek(idle)).toBeCloseTo(3, 5);
    expect(rpPerWeek(withProject())).toBeCloseTo(1.5, 5);
  });

  it('ресечер даёт в полтора раза больше очков', () => {
    const a = createGame('Т', 'О', 1);
    addStaff(a, 'ml_engineer', 'middle', { research: 80 });
    const b = createGame('Т', 'О', 1);
    addStaff(b, 'researcher', 'middle', { research: 80 });
    expect(rpPerWeek(b) - rpPerWeek(a)).toBeCloseTo(80 * BALANCE.team.rpPerResearch * 0.5, 5);
  });

  it('без очков и без предпосылок исследование не начать', () => {
    const game = createGame('Т', 'О', 1);
    expect(canStartResearch(game, 'p-cnn')).toMatch(/Нужно \d+ И-очков/);
    game.rp = 1000;
    expect(canStartResearch(game, 'lab-repro')).toMatch(/Нужно сначала/);
    expect(canStartResearch(game, 'p-transformer')).toMatch(/Нужно сначала/);
    expect(canStartResearch(game, 'nope')).toMatch(/Неизвестное/);
    const gated = RESEARCH.find((n) => n.year > 2012 && n.requires.length === 0 && n.id !== 'scale-product');
    if (gated) expect(canStartResearch(game, gated.id)).toMatch(new RegExp(String(gated.year)));
  });

  it('исследование списывает очки и завершается через заявленное число недель', () => {
    let game = createGame('Т', 'О', 1);
    game.rp = 500;
    const node = RESEARCH_BY_ID['p-cnn'];
    const cost = researchCost(game, node);
    expect(startResearch(game, 'p-cnn')).toBeNull();
    expect(game.rp).toBe(500 - cost);
    expect(canStartResearch(game, 'lab-metrics')).toMatch(/текущее/);
    for (let i = 1; i < node.weeks; i++) game = advanceWeek(game).state;
    expect(game.research.current).toBe('p-cnn');
    game = advanceWeek(game).state;
    expect(game.research.current).toBeNull();
    expect(game.research.done).toContain('p-cnn');
    expect(game.stats.researchDone).toBe(1);
    expect(canStartResearch(game, 'p-cnn')).toMatch(/Уже исследовано/);
  });

  it('дерево согласовано: все узлы достижимы по зависимостям', () => {
    const pending = new Set(RESEARCH.map((n) => n.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of [...pending]) {
        if (RESEARCH_BY_ID[id].requires.every((r) => !pending.has(r))) {
          pending.delete(id);
          changed = true;
        }
      }
    }
    expect([...pending]).toEqual([]);
  });

  it('эффект исследования попадает в модификаторы', () => {
    const game = createGame('Т', 'О', 1);
    const before = getMods(game).speed;
    game.research.done = ['lab-metrics', 'lab-repro'];
    expect(getMods(game).speed).toBeCloseTo(before + 0.08, 6);
  });

  it('скидка таймлайна уменьшает цену вдвое', () => {
    const game = createGame('Т', 'О', 1);
    const node = RESEARCH_BY_ID['p-gan'];
    game.research.discounts = ['p-gan'];
    expect(researchCost(game, node)).toBe(Math.round(node.cost / 2));
  });
});

describe('обучение', () => {
  it('закрытый курс не предлагают, открытый — повышает навыки за свой срок', () => {
    let game = createGame('Т', 'О', 1);
    const staff = game.staff[0];
    expect(canTakeCourse(game, staff, 'c-ml')).toMatch(/не открыт/);
    game.research.done = ['course-ml'];
    expect(canTakeCourse(game, staff, 'c-ml')).toBeNull();
    const money = game.money;
    const research = staff.research;
    expect(sendTraining(game, staff.id, 'c-ml')).toBeNull();
    expect(game.money).toBeLessThan(money);
    expect(isAvailable(game.staff[0])).toBe(false);
    const weeks = COURSES.find((c) => c.id === 'c-ml')!.weeks;
    for (let i = 0; i < weeks; i++) game = advanceWeek(game).state;
    expect(game.staff[0].training).toBeNull();
    expect(game.staff[0].research).toBe(research + 12);
    expect(isAvailable(game.staff[0])).toBe(true);
  });

  it('продвинутый курс доступен только доросшим до уровня', () => {
    const game = createGame('Т', 'О', 1);
    game.money = 1e6;
    game.research.done = RESEARCH.map((n) => n.id);
    const junior = addStaff(game, 'researcher', 'junior');
    const middle = addStaff(game, 'researcher', 'middle');
    const principal = addStaff(game, 'researcher', 'principal');
    expect(canTakeCourse(game, junior, 'c-ml')).toBeNull();
    expect(canTakeCourse(game, junior, 'c-lead')).toMatch(/уровня «старший» и выше/);
    expect(canTakeCourse(game, middle, 'c-stats')).toBeNull();
    expect(canTakeCourse(game, principal, 'c-lead')).toBeNull();
  });

  it('навык не превышает потолка', () => {
    let game = createGame('Т', 'О', 1);
    game.research.done = ['course-stats'];
    game.staff[0].research = 96;
    sendTraining(game, 'founder', 'c-stats');
    for (let i = 0; i < 5; i++) game = advanceWeek(game).state;
    expect(game.staff[0].research).toBe(BALANCE.team.statCap);
  });
});

describe('выгорание и отпуска', () => {
  it('работа над проектом накапливает выгорание, простой — снимает', () => {
    const busy = advanceWeek(withProject()).state.staff[0].burnout;
    const idle = advanceWeek(createGame('Т', 'О', 1)).state.staff[0].burnout;
    expect(busy).toBeCloseTo(BALANCE.team.burnoutPerWeek, 5);
    expect(idle).toBe(0);
    let game = withProject();
    game.staff[0].burnout = 50;
    game.project = null;
    expect(advanceWeek(game).state.staff[0].burnout).toBeCloseTo(50 - BALANCE.team.burnoutIdleRecover, 5);
  });

  it('на грани выгорания сотрудник уходит в вынужденный отпуск, третий раз — увольняется', () => {
    let game = withProject();
    game.staff[0].burnout = 99.9;
    game = advanceWeek(game).state;
    expect(game.staff[0].vacationWeeks).toBe(BALANCE.team.forcedVacationWeeks);
    expect(game.staff[0].burnouts).toBe(1);
    game.staff[0].burnout = 99.9;
    game.staff[0].vacationWeeks = 0;
    game.staff[0].onProject = true;
    game = advanceWeek(game).state;
    expect(game.staff[0].burnouts).toBe(2);
    game.staff[0].burnout = 99.9;
    game.staff[0].vacationWeeks = 0;
    game.staff[0].onProject = true;
    game = advanceWeek(game).state;
    expect(game.staff).toHaveLength(0);
    expect(game.stats.quit).toBe(1);
  });

  it('отпуск снимает выгорание и возвращает к работе', () => {
    let game = withProject();
    game.staff[0].burnout = 70;
    expect(sendVacation(game, 'founder')).toBeNull();
    expect(sendVacation(game, 'founder')).toMatch(/уже в отпуске/);
    expect(isAvailable(game.staff[0])).toBe(false);
    for (let i = 0; i < BALANCE.team.vacationWeeks; i++) game = advanceWeek(game).state;
    expect(game.staff[0].vacationWeeks).toBe(0);
    expect(game.staff[0].burnout).toBeLessThan(20);
    expect(game.staff[0].onProject).toBe(true);
  });
});

describe('бусты', () => {
  it('контент: 12+ бустов, у каждого цена и хотя бы один эффект', () => {
    expect(BOOSTS.length).toBeGreaterThanOrEqual(12);
    for (const b of BOOSTS) {
      expect(b.cost).toBeGreaterThan(0);
      expect(b.speed !== undefined || b.rp !== undefined || b.burnout !== undefined || b.gpuCost !== undefined || b.instant !== undefined).toBe(true);
    }
  });

  it('закрытый буст не купить, открытый действует свои недели и исчезает', () => {
    const game = createGame('Т', 'О', 1);
    expect(canBoost(game, 'retreat')).toMatch(/не открыт/);
    expect(canBoost(game, 'standup')).toBeNull();
    const money = game.money;
    expect(activateBoost(game, 'standup', new Rng(1))).toBeNull();
    expect(game.money).toBeLessThan(money);
    expect(boostActive(game, 'standup')).toBe(true);
    expect(getMods(game).speed).toBeCloseTo(1.06, 6);
    let next = game;
    for (let i = 0; i < BOOSTS.find((b) => b.id === 'standup')!.weeks; i++) next = advanceWeek(next).state;
    expect(boostActive(next, 'standup')).toBe(false);
    expect(getMods(next).speed).toBeCloseTo(1, 6);
  });

  it('кофе ускоряет выгорание, пицца его гасит', () => {
    const coffee = withProject();
    activateBoost(coffee, 'coffee', new Rng(1));
    expect(advanceWeek(coffee).state.staff[0].burnout).toBeCloseTo(BALANCE.team.burnoutPerWeek * 1.5, 5);
    const pizza = withProject();
    activateBoost(pizza, 'pizza', new Rng(1));
    expect(advanceWeek(pizza).state.staff[0].burnout).toBe(0);
  });

  it('разовые бусты: очки сразу, аудит — только при открытых деградациях', () => {
    const game = createGame('Т', 'О', 1);
    expect(canBoost(game, 'audit')).toMatch(/Нет проекта/);
    const rp = game.rp;
    expect(activateBoost(game, 'hackathon', new Rng(1))).toBeNull();
    expect(game.rp).toBe(rp + 30);
    const dirty = withProject();
    dirty.project!.degradations = [
      { id: 1, type: 'overfit', severity: 'mid', fixed: 0 },
      { id: 2, type: 'leak', severity: 'low', fixed: 0 },
    ];
    expect(activateBoost(dirty, 'audit', new Rng(1))).toBeNull();
    expect(dirty.project!.degradations).toHaveLength(0);
  });
});

describe('роли в команде', () => {
  it('дата-инженер режет деградации с данными, MLOps удешевляет GPU и ускоряет', () => {
    const base = getMods(withProject());
    const data = withProject();
    addStaff(data, 'data_engineer');
    expect(getMods(data).bugTags.data).toBeCloseTo(1 - BALANCE.team.roles.dataBug, 6);
    expect(base.bugTags.data).toBeUndefined();

    const mlops = withProject();
    mlops.project!.gpu = 'g1';
    mlops.gpus = [...mlops.gpus, 'g1'];
    addStaff(mlops, 'mlops');
    const plain = withProject();
    plain.project!.gpu = 'g1';
    plain.gpus = [...plain.gpus, 'g1'];
    expect(gpuWeeklyCost(mlops)).toBeLessThan(gpuWeeklyCost(plain));
    expect(getMods(mlops).speed).toBeCloseTo(1 + BALANCE.team.roles.speed, 6);
  });

  it('ML-инженер ускоряет исправление деградаций', () => {
    const base = withProject();
    const pro = withProject();
    addStaff(pro, 'ml_engineer');
    expect(getMods(pro).fix).toBeCloseTo(getMods(base).fix + BALANCE.team.roles.fix, 6);
  });
});

describe('офисы', () => {
  it('переезд требует исследование и деньги', () => {
    const game = createGame('Т', 'О', 1);
    expect(moveOffice(game, 'studio')).toMatch(/исследование/);
    game.research.done = ['office-studio'];
    game.money = 10;
    expect(moveOffice(game, 'studio')).toMatch(/Недостаточно денег/);
    game.money = 1e6;
    addStaff(game, 'researcher', 'senior', { desk: 7 });
    expect(moveOffice(game, 'studio')).toBeNull();
    expect(game.office).toBe('studio');
    expect(officeById('studio').desks).toContain(7);
    expect(moveOffice(game, 'studio')).toMatch(/уже здесь/);
    expect(moveOffice(game, 'campus')).toMatch(/исследование/);
    expect(OFFICES).toHaveLength(3);
  });
});
