import { describe, expect, it } from 'vitest';
import { TickClock, advanceWeek } from './tick';
import { BALANCE } from '../data/balance';
import { createGame } from './game';

const W = BALANCE.time.weekMs;

describe('TickClock — фиксированный тик времени', () => {
  it('на паузе не тикает и сбрасывает накопленное', () => {
    const clock = new TickClock();
    expect(clock.advance(W * 0.9, 1)).toBe(0);
    expect(clock.advance(W * 0.9, 0)).toBe(0);
    // после паузы недобранный остаток потерян: 0.9 недели — ещё не тик
    expect(clock.advance(W * 0.9, 1)).toBe(0);
    expect(clock.advance(W * 0.2, 1)).toBe(1);
  });

  it('1× — одна неделя за weekMs', () => {
    const clock = new TickClock();
    expect(clock.advance(W - 1, 1)).toBe(0);
    expect(clock.advance(1, 1)).toBe(1);
    expect(clock.advance(W * 2, 1)).toBe(2);
  });

  it('2× и 4× — пропорционально быстрее', () => {
    expect(new TickClock().advance(W, 2)).toBe(2);
    expect(new TickClock().advance(W, 4)).toBe(BALANCE.time.maxTicksPerStep);
    expect(new TickClock().advance(W / 4 - 1, 4)).toBe(0);
    expect(new TickClock().advance(W / 4, 4)).toBe(1);
  });

  it('складывает дробные шаги движка', () => {
    const clock = new TickClock();
    let ticks = 0;
    for (let i = 0; i < 24; i++) ticks += clock.advance(100, 1);
    expect(ticks).toBe(1);
    for (let i = 0; i < 24; i++) ticks += clock.advance(100, 1);
    expect(ticks).toBe(2);
  });

  it('не навёрстывает долг после долгого сна вкладки', () => {
    const clock = new TickClock();
    expect(clock.advance(W * 500, 4)).toBe(BALANCE.time.maxTicksPerStep);
    // долг сброшен, а не растянут на следующие шаги
    expect(clock.advance(0, 4)).toBe(0);
    expect(clock.advance(W / 4, 4)).toBe(1);
  });

  it('reset очищает остаток', () => {
    const clock = new TickClock();
    clock.advance(W * 0.8, 1);
    clock.reset();
    expect(clock.advance(W * 0.5, 1)).toBe(0);
    expect(clock.advance(W * 0.5, 1)).toBe(1);
  });
});

describe('advanceWeek — шаг симуляции', () => {
  it('сдвигает неделю ровно на одну', () => {
    const game = createGame('Тест', 'Тест', 7);
    const next = advanceWeek(game).state;
    expect(next.week).toBe(game.week + 1);
    expect(next.money).toBe(game.money);
  });

  it('не мутирует исходное состояние', () => {
    const game = createGame('Тест', 'Тест', 7);
    const snapshot = JSON.stringify(game);
    advanceWeek(game);
    expect(JSON.stringify(game)).toBe(snapshot);
  });

  it('детерминирован: один сид — один результат', () => {
    const a = advanceWeek(advanceWeek(createGame('Тест', 'Тест', 42)).state).state;
    const b = advanceWeek(advanceWeek(createGame('Тест', 'Тест', 42)).state).state;
    expect(a).toEqual(b);
  });
});
