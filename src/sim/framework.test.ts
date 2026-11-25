import { describe, expect, it } from 'vitest';
import type { GameState, SimEvent } from '../types';
import { BALANCE } from '../data/balance';
import { describeFeature } from '../data/describe';
import { FEATURES, featureById } from '../data/features';
import { RESEARCH_BY_ID } from '../data/research';
import { createGame } from './game';
import { advanceWeek } from './tick';
import { Rng } from './rng';
import { availableFeatures, canStartFramework, defaultFrameworkName, frameworkCost, frameworkWeeks, startFramework } from './framework';
import { createModel, gpuWeeklyCost, validateModel, type ModelInput } from './project';
import { getMods } from './mods';

const INPUT: ModelInput = { name: 'М', domain: 'vision', paradigm: 'cnn', platform: 'web', scale: 'pet', gpu: 'g1' };

function researched(game: GameState, ...ids: string[]): GameState {
  game.research.done = [...game.research.done, ...ids];
  return game;
}

function withModel(game: GameState, input: Partial<ModelInput> = {}): GameState {
  game.gpus = [...game.gpus, 'g1'];
  if (input.platform && !game.platforms.includes(input.platform)) game.platforms = [...game.platforms, input.platform];
  const merged: ModelInput = { ...INPUT, ...input };
  game.project = null;
  createModel(game, new Rng(1), merged);
  return game;
}

describe('фреймворк: контент', () => {
  it('22 функции, у каждой есть исследование и непустое описание эффекта', () => {
    expect(FEATURES.length).toBe(22);
    for (const f of FEATURES) {
      expect(RESEARCH_BY_ID[f.research], f.id).toBeDefined();
      expect(RESEARCH_BY_ID[f.research].effects.features).toContain(f.id);
      expect(describeFeature(f).length).toBeGreaterThan(5);
    }
  });
});

describe('фреймворк: сборка версии', () => {
  it('пока ничего не исследовано, доступных функций нет', () => {
    const game = createGame('Т', 'О', 1);
    expect(game.framework.version).toBe(0);
    expect(availableFeatures(game)).toEqual([]);
    expect(canStartFramework(game, ['autodiff'])).toMatch(/недоступна/);
    expect(canStartFramework(game, [])).toMatch(/хотя бы одну/);
  });

  it('исследованная функция становится доступной; сборка стоит денег сразу', () => {
    const game = researched(createGame('Т', 'О', 1), 'fw-autodiff', 'fw-track');
    expect(availableFeatures(game).map((f) => f.id)).toEqual(['autodiff', 'track']);
    const money = game.money;
    const cost = frameworkCost(game, ['autodiff', 'track']);
    expect(startFramework(game, ['autodiff', 'track'], '')).toBeNull();
    expect(game.money).toBeCloseTo(money - cost, 6);
    expect(game.project?.kind).toBe('framework');
    expect(game.project?.name).toBe(defaultFrameworkName(game));
    expect(game.project?.weeksPerPhase[0]).toBe(frameworkWeeks(game, ['autodiff', 'track']));
  });

  it('не хватает денег — нельзя; во время сборки нельзя начать модель', () => {
    const game = researched(createGame('Т', 'О', 1), 'fw-shard');
    game.money = 100;
    expect(canStartFramework(game, ['shard'])).toMatch(/Нужно/);
    game.money = 1e6;
    expect(startFramework(game, ['shard'], 'Kit')).toBeNull();
    expect(validateModel(game, INPUT)).toMatch(/завершите/);
    expect(game.project?.kind).toBe('framework');
  });

  it('сборка не тратит GPU-часы', () => {
    const game = researched(createGame('Т', 'О', 1), 'fw-autodiff');
    startFramework(game, ['autodiff'], 'Kit');
    expect(gpuWeeklyCost(game)).toBe(0);
  });

  it('версия готова через отмеренные недели: номер растёт, функции включаются', () => {
    let game = researched(createGame('Т', 'О', 1), 'fw-autodiff', 'fw-track');
    startFramework(game, ['autodiff', 'track'], 'Слой Kit');
    const weeks = game.project!.weeksPerPhase[0];
    const events: SimEvent[] = [];
    for (let i = 1; i < weeks; i++) {
      const step = advanceWeek(game);
      events.push(...step.events);
      game = step.state;
    }
    expect(game.project).not.toBeNull();
    const last = advanceWeek(game);
    events.push(...last.events);
    game = last.state;
    expect(game.project).toBeNull();
    expect(game.framework.version).toBe(1);
    expect(game.framework.name).toBe('Слой Kit');
    expect(game.framework.features).toEqual(['autodiff', 'track']);
    expect(game.stats.frameworksBuilt).toBe(1);
    expect(events.some((e) => e.type === 'framework')).toBe(true);
    expect(game.achievements).toContain('framework-1');
  });

  it('следующая версия добавляет функции к прежним', () => {
    let game = researched(createGame('Т', 'О', 1), 'fw-autodiff', 'fw-track');
    startFramework(game, ['autodiff'], 'Kit');
    for (let i = 0; i < 10 && game.project; i++) game = advanceWeek(game).state;
    startFramework(game, ['track'], 'Kit');
    for (let i = 0; i < 10 && game.project; i++) game = advanceWeek(game).state;
    expect(game.framework.version).toBe(2);
    expect(game.framework.features).toEqual(['autodiff', 'track']);
    expect(availableFeatures(game)).toEqual([]);
  });

  it('сильная команда собирает версию быстрее, но не мгновенно', () => {
    const solo = researched(createGame('Т', 'О', 1), 'fw-dist');
    solo.research.done = [...solo.research.done, 'lab-repro'];
    const weeksSolo = frameworkWeeks(solo, ['dist']);
    const team = researched(createGame('Т', 'О', 1), 'fw-dist');
    for (let i = 0; i < 3; i++) {
      team.staff.push({ ...team.staff[0], id: `s${i}`, founder: false, research: 90, engineering: 90, speed: 90, salary: 1 });
    }
    const weeksTeam = frameworkWeeks(team, ['dist']);
    expect(weeksTeam).toBeLessThan(weeksSolo);
    expect(weeksTeam).toBeGreaterThanOrEqual(1);
    expect(weeksSolo).toBe(featureById('dist')!.weeks);
  });
});

describe('фреймворк: влияние на модели', () => {
  it('функции ускоряют разработку и снижают деградации', () => {
    const plain = withModel(createGame('Т', 'О', 1));
    const built = withModel(researched(createGame('Т', 'О', 1)));
    built.framework = { version: 1, name: 'Kit', features: ['autodiff', 'datapipeline', 'eval'] };
    const gained = featureById('autodiff')!.speed! + featureById('datapipeline')!.speed!;
    expect(getMods(built).speed).toBeCloseTo(getMods(plain).speed + gained, 6);
    expect(getMods(built).bug).toBeCloseTo(getMods(plain).bug * (1 - featureById('eval')!.bugReduce!), 6);
    expect(getMods(built).bugTags.data).toBeCloseTo(1 - featureById('datapipeline')!.bugTags!.data!, 6);
  });

  it('квантование даёт бонус только на мобильных и периферийных платформах', () => {
    const mobile = withModel(researched(createGame('Т', 'О', 1)), { platform: 'mobile' });
    mobile.framework = { version: 1, name: 'Kit', features: ['quant'] };
    const web = withModel(researched(createGame('Т', 'О', 1)));
    web.framework = { version: 1, name: 'Kit', features: ['quant'] };
    const bare = withModel(createGame('Т', 'О', 1), { platform: 'mobile' });
    expect(getMods(mobile).quality).toBeCloseTo(getMods(bare).quality + BALANCE.project.platformFeatureBonus, 6);
    expect(getMods(web).quality).toBe(1);
  });

  it('сродство даёт бонус подходящим доменам', () => {
    const vision = withModel(researched(createGame('Т', 'О', 1)));
    vision.framework = { version: 1, name: 'Kit', features: ['auglib'] };
    const legal = withModel(researched(createGame('Т', 'О', 1)), { domain: 'legal', paradigm: 'transformer' });
    legal.framework = { version: 1, name: 'Kit', features: ['auglib'] };
    const auglib = featureById('auglib')!;
    expect(getMods(vision).quality).toBeCloseTo(1 + auglib.quality! + auglib.affinity!.bonus, 6);
    expect(getMods(legal).quality).toBeCloseTo(1 + auglib.quality!, 6);
  });

  it('функции фреймворка не дают бонусов платформ во время сборки самой версии', () => {
    const game = researched(createGame('Т', 'О', 1), 'fw-quant');
    expect(startFramework(game, ['quant'], 'Kit')).toBeNull();
    game.project!.platform = 'mobile';
    expect(getMods(game).quality).toBe(1);
    // а после сборки тот же проект на той же платформе бонус получает
    for (let i = 0; i < 10 && game.project; i++) Object.assign(game, advanceWeek(game).state);
    const model = withModel(game, { platform: 'mobile' });
    expect(getMods(model).quality).toBeCloseTo(1 + BALANCE.project.platformFeatureBonus, 6);
  });

  it('функции снижают цену GPU-часов и дают исследовательские очки', () => {
    const plain = withModel(createGame('Т', 'О', 1));
    const built = withModel(createGame('Т', 'О', 1));
    built.framework = { version: 1, name: 'Kit', features: ['mixed', 'track'] };
    expect(gpuWeeklyCost(built)).toBeLessThan(gpuWeeklyCost(plain));
    expect(getMods(built).rp).toBeCloseTo(1 + featureById('track')!.rp!, 6);
  });
});
