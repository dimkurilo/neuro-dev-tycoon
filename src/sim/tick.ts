import type { GameState, SimEvent, SimResult, Speed } from '../types';
import { BALANCE } from '../data/balance';
import { Rng } from './rng';

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

function runSteps(_state: GameState, _rng: Rng, _events: SimEvent[]): void {
  // шаги симуляции подключаются по мере вех
}
