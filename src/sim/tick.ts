import type { GameState, SimEvent, SimResult, Speed } from '../types';
import { BALANCE } from '../data/balance';
import { Rng } from './rng';
import { runProject } from './project';
import { runResearch } from './research';
import { runFramework } from './framework';
import { runMarketing } from './marketing';
import { investorCut, runContracts } from './contracts';
import { pruneExpired, runEvents } from './events';
import { runRivals } from './rivals';
import { runStaff } from './staff';
import { runAudience, runSales } from './sales';
import { runFinance } from './finance';
import { checkAchievements } from './achievements';

/**
 * Фиксированный тик: 1 тик = 1 игровая неделя. Часы получают реальное время,
 * накопившееся между шагами движка, и отдают целое число недель.
 */
export class TickClock {
  private acc = 0;
  private readonly weekMs: number;

  constructor(weekMs: number = BALANCE.time.weekMs) {
    this.weekMs = weekMs;
  }

  reset(): void {
    this.acc = 0;
  }

  /** сколько недель прошло; на паузе накопленное сбрасывается */
  advance(dtMs: number, speed: Speed): number {
    if (speed === 0 || dtMs <= 0) {
      this.acc = 0;
      return 0;
    }
    this.acc += dtMs;
    const perWeek = this.weekMs / speed;
    let ticks = 0;
    while (this.acc >= perWeek && ticks < BALANCE.time.maxTicksPerStep) {
      this.acc -= perWeek;
      ticks++;
    }
    // движок долго спал — долг не навёрстываем, чтобы не проиграть «задним числом»
    if (this.acc >= perWeek) this.acc = 0;
    return ticks;
  }
}

/**
 * Один шаг симуляции: чистая функция состояния (кроме переданного через state сида RNG),
 * возвращает новое состояние и события для интерфейса.
 */
export function advanceWeek(game: GameState): SimResult {
  const rng = new Rng(game.rng);
  const state: GameState = { ...game, week: game.week + 1 };
  const events: SimEvent[] = [];

  runSteps(state, rng, events);

  state.rng = rng.state;
  return { state, events };
}

/**
 * Порядок шагов недели: события таймлайна и лаборатория с командой — до проекта (их бонусы
 * действуют сразу), маркетинг разгоняет хайп до продаж, продажи раньше финансов,
 * сделки и конкуренты — в конце.
 */
function runSteps(state: GameState, rng: Rng, events: SimEvent[]): void {
  runEvents(state, events);
  pruneExpired(state);
  runResearch(state, events);
  runStaff(state, rng, events);
  if (state.project?.kind === 'framework') runFramework(state, events);
  else runProject(state, rng, events);
  runMarketing(state, events);
  runAudience(state);
  const income = runSales(state);
  const cut = investorCut(state, income);
  runFinance(state, events, income - cut);
  runContracts(state, rng, events);
  runRivals(state, rng);
  checkAchievements(state, events);
}
