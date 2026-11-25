import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { START_YEAR, formatDate, monthOf, weekIndex, weekOfYear, yearOf } from './time';

describe('Rng — детерминированный генератор', () => {
  it('один сид даёт одну последовательность', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  it('разные сиды дают разные числа', () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it('держит числа в диапазоне 0…1', () => {
    const rng = new Rng(9);
    for (let i = 0; i < 2000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int выдаёт целые в границах включительно', () => {
    const rng = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rng.int(2, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect(seen.size).toBe(4);
  });

  it('weighted учитывает веса и игнорирует нулевые', () => {
    const rng = new Rng(5);
    for (let i = 0; i < 200; i++) {
      expect(rng.weighted([['a', 0], ['b', 3]])).toBe('b');
    }
    const rng2 = new Rng(5);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 6000; i++) {
      const v = rng2.weighted([
        ['x', 1],
        ['y', 3],
      ]);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    expect(counts.y / counts.x).toBeGreaterThan(2.2);
    expect(counts.y / counts.x).toBeLessThan(4.2);
  });

  it('gauss держит среднее и разброс', () => {
    const rng = new Rng(11);
    const vals = Array.from({ length: 4000 }, () => rng.gauss(10, 2));
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    expect(mean).toBeGreaterThan(9.7);
    expect(mean).toBeLessThan(10.3);
    expect(sd).toBeGreaterThan(1.8);
    expect(sd).toBeLessThan(2.2);
  });

  it('состояние из сейва продолжает ту же последовательность', () => {
    const rng = new Rng(77);
    rng.next();
    rng.next();
    const saved = rng.state;
    const expected = [rng.next(), rng.next(), rng.next()];
    const restored = new Rng(saved);
    expect([restored.next(), restored.next(), restored.next()]).toEqual(expected);
  });
});

describe('календарь', () => {
  it('неделя 0 — начало 2012 года', () => {
    expect(yearOf(0)).toBe(START_YEAR);
    expect(weekOfYear(0)).toBe(0);
    expect(monthOf(0)).toBe(0);
  });

  it('52 недели составляют год', () => {
    expect(yearOf(51)).toBe(2012);
    expect(weekOfYear(51)).toBe(51);
    expect(yearOf(52)).toBe(2013);
    expect(weekOfYear(52)).toBe(0);
    expect(yearOf(104)).toBe(2014);
  });

  it('месяц растёт вместе с неделей и не выходит за декабрь', () => {
    expect(monthOf(13)).toBe(3);
    expect(monthOf(51)).toBe(11);
    expect(monthOf(104 + 51)).toBe(11);
  });

  it('weekIndex — обратное преобразование к году и неделе', () => {
    for (const [year, woy] of [
      [2012, 0],
      [2013, 17],
      [2040, 51],
    ] as const) {
      const w = weekIndex(year, woy);
      expect(yearOf(w)).toBe(year);
      expect(weekOfYear(w)).toBe(woy);
    }
  });

  it('formatDate показывает месяц, год и номер недели', () => {
    expect(formatDate(0)).toBe('янв 2012 · нед. 1');
    expect(formatDate(weekIndex(2017, 21))).toBe('май 2017 · нед. 22');
  });
});
