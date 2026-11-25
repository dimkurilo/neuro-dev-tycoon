import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { RESEARCH } from '../data/research';
import { runBot } from './bot';

declare const process: { env: Record<string, string | undefined> };
const WEEKS = 28 * 52;
const SEEDS = [1, 2, 3];

describe('баланс-проход ботом', () => {
  const runs = SEEDS.map((seed) => runBot(seed, WEEKS));

  it('опытный игрок доживает до 2040 года без банкротства', () => {
    for (const [i, run] of runs.entries()) {
      expect(run.bankruptWeek, `сид ${SEEDS[i]}`).toBeNull();
      expect(run.game.week).toBe(WEEKS);
      expect(run.years.at(-1)?.year).toBe(2040);
    }
  });

  it('партия детерминирована по сиду', () => {
    const again = runBot(SEEDS[0], 26 * 52);
    const first = runBot(SEEDS[0], 26 * 52);
    expect(again.game.rng).toBe(first.game.rng);
    expect(again.years).toEqual(first.years);
  });

  it('деньги, фанаты и хайп остаются конечными, хайп не превышает 100', () => {
    for (const [i, run] of runs.entries()) {
      const label = `сид ${SEEDS[i]}`;
      for (const y of run.years) {
        expect(Number.isFinite(y.money) && Number.isFinite(y.fans), `${label}, ${y.year}`).toBe(true);
        expect(y.money, `${label}, ${y.year}`).toBeGreaterThan(0);
      }
      expect(run.game.hype, label).toBeLessThanOrEqual(100);
      expect(Number.isFinite(run.game.hype), label).toBe(true);
      expect(Number.isFinite(run.minMoney), label).toBe(true);
    }
  });

  it('к 2040 году сработали все системы прогрессии', () => {
    for (const [i, run] of runs.entries()) {
      const label = `сид ${SEEDS[i]}`;
      const s = run.game.stats;
      expect(run.game.office, label).toBe('campus');
      expect(run.game.staff.length, label).toBe(run.game.staff.map((x) => x.id).length);
      expect(s.researchDone, label).toBeGreaterThan(RESEARCH.length / 2);
      expect(s.frameworksBuilt, label).toBeGreaterThan(1);
      expect(s.contractsDone, label).toBeGreaterThan(0);
      expect(s.versionsMade, label).toBeGreaterThan(0);
      expect(s.releases - s.contractsDone, `${label}: своих моделей`).toBeGreaterThan(10);
      expect(s.campaigns, label).toBeGreaterThan(0);
      expect(run.game.objects.length, label).toBeGreaterThan(0);
      expect(run.game.achievements.length, label).toBeGreaterThan(10);
    }
  });

  it('первый год не даёт сразу всё: кампус и флагман ещё не по карману', () => {
    for (const [i, run] of runs.entries()) {
      const first = run.years[0];
      expect(first.office, `сид ${SEEDS[i]}`).not.toBe('campus');
      expect(first.releases, `сид ${SEEDS[i]}`).toBeLessThan(6);
    }
  });

  // партии бота на первый и восьмой год — реалистичные состояния для скриншотов и мобильного
  // аудита; печатаются строками «SAVE <имя> <json>», их забирает scripts/audit.mjs
  it.runIf(process.env.BALANCE_SAVES === '1')('партии для визуальной проверки', async () => {
    const { exportSave } = await import('./save');
    // без продаж и с двумя предупреждениями из трёх: следующая неделя — банкротство
    const broke: GameState = { ...runBot(11, 40).game, money: -10, insolvency: 2, models: [] };
    const parties: [string, GameState][] = [['year1', runBot(11, 52).game], ['year8', runBot(11, 8 * 52).game], ['broke', broke]];
    for (const [name, game] of parties) {
      console.log(`SAVE ${name} ${exportSave(game)}`);
    }
  });

  it.runIf(process.env.BALANCE_REPORT === '1')('отчёт по годам', () => {
    for (const [i, run] of runs.entries()) {
      console.log(`\nсид ${SEEDS[i]}: банкротство — ${run.bankruptWeek ?? 'нет'}; минимум кассы ${Math.round(run.minMoney)}`);
      console.log('год    деньги    фанаты  команда  офис      релизов  оценка  доход/нед  расход/нед  запас  иссл  ачивки');
      for (const y of run.years) {
        const k = (v: number) => `${(v / 1000).toFixed(0).padStart(v >= 1e8 ? 9 : 6)}k`;
        console.log(
          `${y.year}  ${k(y.money)}  ${String(Math.round(y.fans)).padStart(7)}  ${String(y.staff).padStart(7)}  ${y.office.padEnd(8)}  ${String(y.releases).padStart(7)}  ${y.bestRating.toFixed(1).padStart(6)}  ${k(y.income)}  ${k(y.costs)}  ${(y.income / Math.max(1, y.costs)).toFixed(1).padStart(6)}  ${String(y.research).padStart(4)}  ${String(y.achievements).padStart(5)}`,
        );
      }
      const s = run.game.stats;
      console.log(`итог: контрактов ${s.contractsDone} (провалено ${s.contractsFailed}), версий ${s.versionsMade}, кампаний ${s.campaigns}, фреймворков ${s.frameworksBuilt}, нанято ${s.hired}, уволилось ${s.quit}`);
    }
  });
});
