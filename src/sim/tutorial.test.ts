import { describe, expect, it } from 'vitest';
import { TUTORIAL } from '../data/tutorial';
import { createGame } from './game';
import { advanceWeek } from './tick';
import { tutorialStep } from './tutorial';

describe('обучение', () => {
  it('в новой партии показан первый шаг, шаги идут по порядку', () => {
    const game = createGame('Т', 'О', 1);
    expect(game.tutorial).toEqual({ active: true, step: 0 });
    expect(tutorialStep(game)).toBe(0);
    for (let i = 1; i < TUTORIAL.length; i++) expect(TUTORIAL[i].done(game)).toBe(false);
    expect(TUTORIAL).toHaveLength(5);
  });

  it('шаг засчитывается по состоянию партии, даже если действия шли не по порядку', () => {
    const game = createGame('Т', 'О', 1);
    game.stats = { ...game.stats, releases: 1, researchDone: 2 };
    expect(tutorialStep(game)).toBe(2);
    game.stats = { ...game.stats, hired: 1 };
    expect(tutorialStep(game)).toBe(4);
    game.stats = { ...game.stats, frameworksBuilt: 1 };
    expect(tutorialStep(game)).toBe(TUTORIAL.length);
  });

  it('после последнего шага обучение завершается с уведомлением, пропущенное — не напоминает', () => {
    const game = createGame('Т', 'О', 1);
    game.stats = { ...game.stats, releases: 1, hired: 1, researchDone: 1 };
    game.project = null;
    // четвёртый шаг ещё не сделан: ничего не меняется
    expect(advanceWeek(game).state.tutorial.active).toBe(true);

    game.stats = { ...game.stats, frameworksBuilt: 1 };
    const done = advanceWeek(game);
    expect(done.state.tutorial).toEqual({ active: false, step: TUTORIAL.length });
    expect(done.events.some((e) => e.type === 'toast' && e.text.startsWith('Обучение пройдено'))).toBe(true);

    const skipped = createGame('Т', 'О', 1);
    skipped.tutorial = { active: false, step: 0 };
    const later = advanceWeek(skipped);
    expect(later.state.tutorial.active).toBe(false);
    expect(later.events.some((e) => e.type === 'toast' && e.text.startsWith('Обучение'))).toBe(false);
  });

  it('текст каждого шага не длиннее трёх строк на телефоне', () => {
    for (const step of TUTORIAL) {
      expect(step.text.length).toBeLessThan(150);
      expect(step.title.length).toBeLessThan(32);
    }
  });
});
