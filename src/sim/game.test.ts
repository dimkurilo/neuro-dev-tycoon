import { describe, expect, it } from 'vitest';
import type { FieldId, GameState, ReleasedModel, SalesWave, SimEvent } from '../types';
import { AGENCIES, quoteBand } from '../data/agencies';
import { BALANCE } from '../data/balance';
import { fitOf, idealShare, SCALES } from '../data/compat';
import { DOMAINS } from '../data/domains';
import { FIELDS } from '../data/fields';
import { GPUS } from '../data/gpus';
import { PARADIGMS } from '../data/paradigms';
import { PLATFORMS } from '../data/platforms';
import { RESEARCH, RESEARCH_BY_ID } from '../data/research';
import { createGame } from './game';
import { advanceWeek } from './tick';
import { Rng } from './rng';
import { createModel, releaseNow, teamPools, validateModel, type ModelInput } from './project';
import { comboKey, expectedPoints, ratingFactor, reviewModel, scoreProject } from './release';
import { modelWeeklyRevenue, peakWeek, salesShape } from './sales';
import { maxLoan, repayLoan, takeLoan, weeklyCosts } from './finance';
import { weekIndex } from './time';

const INPUT: ModelInput = { name: 'Тест', domain: 'vision', paradigm: 'rnn', platform: 'web', scale: 'pet', gpu: 'g0' };

/** новая партия с уже запущенным пет-проектом */
function started(seed = 1): GameState {
  const game = createGame('Тест', 'Основатель', seed);
  expect(validateModel(game, INPUT)).toBeNull();
  createModel(game, new Rng(game.rng), INPUT);
  return game;
}

/** прокручивает недели, пока не выполнится условие (или не кончится лимит) */
function runUntil(state: GameState, done: (g: GameState) => boolean, limit = 200): { state: GameState; events: SimEvent[]; weeks: number } {
  const events: SimEvent[] = [];
  let weeks = 0;
  while (!done(state) && weeks < limit) {
    const step = advanceWeek(state);
    events.push(...step.events);
    state = step.state;
    weeks++;
  }
  return { state, events, weeks };
}

/** подменяет набранные очки проекта: всего points, доля исследований в поле задаётся функцией */
function projectWith(game: GameState, shares: (field: FieldId) => number, points = expectedPoints('pet', 0)): GameState {
  const project = game.project;
  if (!project) throw new Error('нет проекта');
  const fields = { ...project.fields };
  for (const f of FIELDS) {
    const s = shares(f.id);
    fields[f.id] = { research: (points / FIELDS.length) * s, engineering: (points / FIELDS.length) * (1 - s) };
  }
  return { ...game, project: { ...project, fields } };
}

const score = (game: GameState) => (game.project ? scoreProject(game, game.project) : null);

function fakeModel(waves: SalesWave[]): ReleasedModel {
  return {
    id: 1,
    name: 'Тест',
    domain: 'vision',
    paradigm: 'rnn',
    platform: 'web',
    scale: 'pet',
    releasedWeek: waves[0]?.startWeek ?? 0,
    rating: 7,
    quality: 7,
    reviews: [],
    report: score(started())!,
    waves,
    weekly: [],
    totalRevenue: 0,
    lastRevenue: 0,
    fansGained: 0,
    versions: [],
    baseId: null,
    versionType: null,
  };
}

describe('контент', () => {
  it('объёмы не ниже заданных', () => {
    expect(DOMAINS.length).toBeGreaterThanOrEqual(36);
    expect(PARADIGMS.length).toBeGreaterThanOrEqual(12);
    expect(RESEARCH.length).toBeGreaterThanOrEqual(50);
    expect(PLATFORMS.length).toBe(5);
    expect(GPUS.length).toBeGreaterThanOrEqual(6);
    expect(AGENCIES.length).toBe(4);
    expect(SCALES.length).toBe(3);
  });

  it('все ссылки на исследования и зависимости существуют', () => {
    for (const node of RESEARCH) for (const req of node.requires) expect(RESEARCH_BY_ID[req], `${node.id} → ${req}`).toBeDefined();
    for (const d of DOMAINS) if (d.research) expect(RESEARCH_BY_ID[d.research], d.id).toBeDefined();
    for (const p of PARADIGMS) if (p.research) expect(RESEARCH_BY_ID[p.research], p.id).toBeDefined();
    for (const s of SCALES) if (s.research) expect(RESEARCH_BY_ID[s.research], s.id).toBeDefined();
  });

  it('у каждого агентства веса в сумме дают 1 и минимум по 4 цитаты на полосу', () => {
    for (const a of AGENCIES) {
      expect(Object.values(a.weights).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
      for (const band of ['awful', 'weak', 'decent', 'good', 'great'] as const) expect(a.quotes[band].length).toBeGreaterThanOrEqual(4);
    }
  });

  it('домены ссылаются на существующие парадигмы, идеальная доля в границах', () => {
    const ids = new Set(PARADIGMS.map((p) => p.id));
    for (const d of DOMAINS) for (const p of [...d.ideal, ...d.weird]) expect(ids.has(p), `${d.id}: ${p}`).toBe(true);
    for (const d of DOMAINS) {
      for (const p of PARADIGMS) {
        for (const f of FIELDS) {
          const share = idealShare(d.id, p.id, f.id);
          expect(share).toBeGreaterThanOrEqual(BALANCE.quality.shareMin);
          expect(share).toBeLessThanOrEqual(BALANCE.quality.shareMax);
        }
      }
    }
  });
});

describe('команда', () => {
  it('основатель в одиночку даёт мощность 11.25 и ровный состав', () => {
    const pools = teamPools(createGame('Т', 'О', 1));
    expect(pools.power).toBeCloseTo(BALANCE.project.fixReferencePower, 5);
    expect(pools.rf).toBeCloseTo(1, 5);
    expect(pools.ef).toBeCloseTo(1, 5);
  });

  it('фокус перераспределяет силу, не меняя суммарной мощности', () => {
    const game = createGame('Т', 'О', 1);
    const even = teamPools(game);
    game.staff[0].focus = 100;
    const research = teamPools(game);
    expect(research.power).toBeCloseTo(even.power, 5);
    expect(research.research).toBeGreaterThan(even.research);
    expect(research.engineering).toBeLessThan(even.engineering);
    expect(research.rf).toBeGreaterThan(1);
    expect(research.ef).toBeLessThan(1);
  });

  it('выгорание снижает мощность', () => {
    const game = createGame('Т', 'О', 1);
    const fresh = teamPools(game).power;
    game.staff[0].burnout = 100;
    expect(teamPools(game).power).toBeLessThan(fresh);
  });
});

describe('скоринг релиза', () => {
  it('ожидания рынка растут год от года и с масштабом', () => {
    expect(expectedPoints('pet', weekIndex(2013, 0))).toBeGreaterThan(expectedPoints('pet', 0));
    expect(expectedPoints('product', 0)).toBeGreaterThan(expectedPoints('pet', 0));
    expect(expectedPoints('flagship', 0)).toBeGreaterThan(expectedPoints('product', 0));
  });

  it('множитель выручки от оценки растёт и ограничен', () => {
    expect(ratingFactor(10)).toBeCloseTo(1, 6);
    expect(ratingFactor(9)).toBeGreaterThan(ratingFactor(6));
    expect(ratingFactor(6)).toBeGreaterThan(ratingFactor(3));
    expect(ratingFactor(1)).toBeGreaterThanOrEqual(BALANCE.sales.ratingMinFactor);
  });

  it('идеальный баланс лучше дефолтного, дефолтный лучше перекошенного', () => {
    const ideal = score(projectWith(started(), (f) => idealShare('vision', 'rnn', f)));
    const base = score(projectWith(started(), () => 0.5));
    const inverted = score(projectWith(started(), (f) => 1 - idealShare('vision', 'rnn', f)));
    expect(ideal!.balanceFactor).toBeCloseTo(1, 3);
    expect(ideal!.quality).toBeGreaterThan(base!.quality);
    expect(base!.quality).toBeGreaterThan(inverted!.quality);
  });

  it('совместимость домена и парадигмы: идеально > норм > странно', () => {
    const quality = (paradigm: string) => {
      const game = started();
      game.project!.paradigm = paradigm;
      return score(projectWith(game, (f) => idealShare('vision', paradigm, f)))!.quality;
    };
    expect(fitOf('vision', 'cnn')).toBe('ideal');
    expect(fitOf('vision', 'rnn')).toBe('ok');
    expect(fitOf('vision', 'symbolic')).toBe('weird');
    expect(quality('cnn')).toBeGreaterThan(quality('rnn'));
    expect(quality('rnn')).toBeGreaterThan(quality('symbolic'));
  });

  it('новая связка получает бонус, заезженная — штраф', () => {
    const first = score(projectWith(started(), () => 0.5))!;
    const game = started();
    game.comboMemory = { [comboKey('vision', 'rnn')]: { times: 8, fit: 'ok', bestRating: 5 } };
    const stale = score(projectWith(game, () => 0.5))!;
    expect(first.noveltyFactor).toBeGreaterThan(1);
    expect(stale.noveltyFactor).toBeLessThan(1);
    expect(first.quality).toBeGreaterThan(stale.quality);
  });

  it('неисправленные деградации штрафуют, исправленные — нет', () => {
    const clean = score(projectWith(started(), () => 0.5))!.quality;
    const dirty = started();
    dirty.project!.degradations = [
      { id: 1, type: 'overfit', severity: 'high', fixed: 0 },
      { id: 2, type: 'leak', severity: 'low', fixed: 0 },
    ];
    const fixed = started();
    fixed.project!.degradations = [{ id: 1, type: 'overfit', severity: 'high', fixed: 1 }];
    expect(score(projectWith(dirty, () => 0.5))!.quality).toBeLessThan(clean);
    expect(score(projectWith(fixed, () => 0.5))!.quality).toBeCloseTo(clean, 6);
  });

  it('хайп слегка поднимает качество', () => {
    const low = started();
    const high = started();
    high.hype = 90;
    const a = score(projectWith(low, () => 0.5))!.quality;
    const b = score(projectWith(high, () => 0.5))!.quality;
    expect(b).toBeGreaterThan(a);
    expect(b - a).toBeLessThan(1);
  });

  it('качество всегда в пределах 0…10', () => {
    expect(score(projectWith(started(), () => 0.5, 1e12))!.quality).toBeLessThanOrEqual(10);
    // идеальный баланс и идеальная связка на огромном запасе очков упираются в потолок
    const perfect = started();
    perfect.project!.paradigm = 'cnn';
    expect(score(projectWith(perfect, (f) => idealShare('vision', 'cnn', f), 1e12))!.quality).toBe(10);
    expect(score(projectWith(started(), () => 0.5, 0))!.quality).toBeGreaterThanOrEqual(0);
  });
});

describe('оценки агентств', () => {
  const reportOf = (points: number) => score(projectWith(started(), (f) => idealShare('vision', 'rnn', f), points))!;

  it('четыре независимых оценки в пределах шкалы, средняя — их среднее', () => {
    const { reviews, rating } = reviewModel(reportOf(1000), new Rng(3));
    expect(reviews.map((r) => r.agency)).toEqual(AGENCIES.map((a) => a.name));
    for (const r of reviews) {
      expect(r.score).toBeGreaterThanOrEqual(BALANCE.reviews.min);
      expect(r.score).toBeLessThanOrEqual(BALANCE.reviews.max);
      expect(r.quote.length).toBeGreaterThan(10);
    }
    const mean = reviews.reduce((s, r) => s + r.score, 0) / reviews.length;
    expect(rating).toBeCloseTo(Math.round(mean * 10) / 10, 6);
  });

  it('детерминирован по сиду генератора', () => {
    const report = reportOf(1500);
    expect(reviewModel(report, new Rng(7))).toEqual(reviewModel(report, new Rng(7)));
  });

  it('средняя оценка держится рядом с качеством, а не взлетает от аккуратности', () => {
    for (const points of [200, 500, 1000, 2000]) {
      const report = reportOf(points);
      const { rating } = reviewModel(report, new Rng(1));
      expect(Math.abs(rating - report.quality)).toBeLessThan(1.2);
    }
  });

  it('провальная модель получает разгромные цитаты, сильная — не ниже 7', () => {
    const weak = reviewModel(reportOf(100), new Rng(1));
    const strong = reviewModel(reportOf(2600), new Rng(1));
    for (const r of weak.reviews) {
      expect(r.score).toBeLessThan(3);
      expect(quoteBand(r.score)).toBe('awful');
    }
    expect(weak.rating).toBeLessThan(3);
    expect(strong.rating).toBeGreaterThanOrEqual(7);
    expect(strong.reviews.every((r) => quoteBand(r.score) !== 'awful')).toBe(true);
  });

  it('аудит безопасности строже прочих к открытым деградациям', () => {
    const game = started();
    game.project!.degradations = [
      { id: 1, type: 'toxicity', severity: 'high', fixed: 0 },
      { id: 2, type: 'leak', severity: 'high', fixed: 0 },
    ];
    const { reviews } = reviewModel(score(projectWith(game, () => 0.5))!, new Rng(2));
    const safety = reviews.find((r) => r.agency === 'Аудит Надёжного ИИ')!.score;
    const press = reviews.find((r) => r.agency === 'НейроЖурнал')!.score;
    expect(safety).toBeLessThan(press);
  });
});

describe('проект', () => {
  it('валидация не пускает второй проект и закрытые опции', () => {
    expect(validateModel(started(), INPUT)).toMatch(/завершите/);
    const fresh = createGame('Т', 'О', 1);
    expect(validateModel(fresh, { ...INPUT, platform: 'robots' })).toMatch(/лицензию/);
    expect(validateModel(fresh, { ...INPUT, gpu: 'g3' })).toMatch(/арендуйте/);
    expect(validateModel(fresh, { ...INPUT, scale: 'flagship' })).toMatch(/исследование/);
    expect(validateModel(fresh, { ...INPUT, domain: 'imgen' })).toMatch(/исследование/);
    expect(validateModel(fresh, { ...INPUT, paradigm: 'diffusion' })).toMatch(/исследование/);
    expect(validateModel(fresh, { ...INPUT, domain: 'agents' })).toMatch(/исследование/);
  });

  it('новый проект начинается с пустыми полями и слайдерами 50/50', () => {
    const p = started().project!;
    expect(Object.keys(p.fields)).toHaveLength(FIELDS.length);
    expect(Object.values(p.fields).every((f) => f.research === 0 && f.engineering === 0)).toBe(true);
    expect(Object.values(p.sliders).every((s) => s === 50)).toBe(true);
    expect(p.phase).toBe(0);
    expect(p.name).toBe('Тест');
  });

  it('очки копятся только в полях текущей фазы, фазы сменяются по расписанию', () => {
    const [w1, w2, w3] = SCALES[0].weeks;
    let state = advanceWeek(started()).state;
    const first = state.project!.fields;
    expect(first.architecture.research + first.architecture.engineering).toBeGreaterThan(0);
    expect(first.dataset.research + first.dataset.engineering).toBe(0);
    state = runUntil(state, (g) => g.project!.phase === 1).state;
    expect(state.week).toBe(w1);
    state = runUntil(state, (g) => g.project!.phase === 2).state;
    expect(state.week).toBe(w1 + w2);
    state = runUntil(state, (g) => g.project!.phase === 3).state;
    expect(state.week).toBe(w1 + w2 + w3);
    expect(state.project!.fields.interface.research + state.project!.fields.interface.engineering).toBeGreaterThan(0);
  });

  it('слайдер двигает распределение исследований и инженерии', () => {
    const research = started();
    const engineering = started();
    for (const f of FIELDS) {
      research.project!.sliders[f.id] = 100;
      engineering.project!.sliders[f.id] = 0;
    }
    const a = advanceWeek(research).state.project!.fields.architecture;
    const b = advanceWeek(engineering).state.project!.fields.architecture;
    expect(a.engineering).toBe(0);
    expect(a.research).toBeGreaterThan(0);
    expect(b.research).toBe(0);
    expect(b.engineering).toBeCloseTo(a.research, 6);
  });

  it('до стабилизации выпустить нельзя', () => {
    const game = started();
    const events: SimEvent[] = [];
    expect(releaseNow(game, new Rng(1), events)).toMatch(/трёх фаз/);
    expect(game.project).not.toBeNull();
    expect(game.models).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it('стабилизация чинит деградации и выпускает модель автоматически', () => {
    const atStabilization = runUntil(started(), (g) => g.project!.phase === 3).state;
    const open = atStabilization.project!.degradations.filter((d) => d.fixed < 1).length;
    const result = runUntil(atStabilization, (g) => g.project === null);
    expect(result.state.project).toBeNull();
    expect(result.state.models).toHaveLength(1);
    expect(result.state.models[0].report.degradationPenalty).toBe(0);
    expect(result.state.models[0].reviews).toHaveLength(4);
    expect(result.state.fans).toBeGreaterThan(0);
    expect(result.events.filter((e) => e.type === 'release')).toHaveLength(1);
    // каждой открытой деградации нужна хотя бы часть недели работы
    if (open > 0) expect(result.weeks).toBeGreaterThanOrEqual(1);
    expect(result.weeks).toBeLessThan(60);
  });

  it('досрочный выпуск оставляет деградации при себе', () => {
    const state = runUntil(started(), (g) => g.project!.phase === 3).state;
    state.project = { ...state.project!, degradations: [...state.project!.degradations, { id: 99, type: 'leak', severity: 'high', fixed: 0 }] };
    const events: SimEvent[] = [];
    expect(releaseNow(state, new Rng(5), events)).toBeNull();
    expect(state.project).toBeNull();
    expect(state.models[0].report.degradationPenalty).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'release')).toBe(true);
  });

  it('первый проект одиночки получает оценку в разумном коридоре', () => {
    const { state } = runUntil(started(1), (g) => g.project === null);
    expect(state.models[0].rating).toBeGreaterThan(4);
    expect(state.models[0].rating).toBeLessThan(9.5);
    expect(state.stats.releases).toBe(1);
    expect(state.achievements).toContain('first-release');
  });

  it('шаг недели не мутирует вложенные объекты прошлого состояния', () => {
    const done = runUntil(started(1), (g) => g.project === null).state;
    createModel(done, new Rng(1), INPUT);
    const snapshot = JSON.stringify(done);
    for (let i = 0; i < 6; i++) advanceWeek(done);
    expect(JSON.stringify(done)).toBe(snapshot);
  });
});

describe('продажи', () => {
  it('пик приходится на 2–3-ю неделю, дальше экспоненциальный хвост', () => {
    expect([2, 3]).toContain(peakWeek());
    expect(salesShape(1)).toBeGreaterThan(salesShape(0));
    expect(salesShape(peakWeek())).toBeCloseTo(1, 6);
    for (let t = peakWeek(); t < BALANCE.sales.activeWeeks; t++) expect(salesShape(t + 1)).toBeLessThan(salesShape(t));
    for (let t = 5; t <= 40; t++) {
      const ratio = salesShape(t + 1) / salesShape(t);
      expect(ratio).toBeGreaterThan(0.55);
      expect(ratio).toBeLessThan(0.9);
    }
  });

  it('за горизонтом продаж выручки нет', () => {
    expect(salesShape(-1)).toBe(0);
    expect(salesShape(BALANCE.sales.activeWeeks + 1)).toBe(0);
  });

  it('выручка равна потенциалу, умноженному на форму кривой', () => {
    const model = fakeModel([{ startWeek: 10, potential: 5000 }]);
    expect(modelWeeklyRevenue(model, 10)).toBeCloseTo(5000 * salesShape(0), 6);
    expect(modelWeeklyRevenue(model, 12)).toBeCloseTo(5000 * salesShape(2), 6);
    expect(modelWeeklyRevenue(model, 9)).toBe(0);
  });

  it('в первую неделю после релиза доход положительный', () => {
    const { state } = runUntil(started(1), (g) => g.project === null);
    const next = advanceWeek(state).state;
    expect(next.models[0].lastRevenue).toBeGreaterThan(0);
    expect(next.money).toBeGreaterThan(state.money);
    expect(next.stats.totalRevenue).toBeGreaterThan(0);
  });

  it('выручка за все недели — порядка семи пиковых', () => {
    let sum = 0;
    for (let t = 0; t <= BALANCE.sales.activeWeeks; t++) sum += salesShape(t);
    expect(sum).toBeGreaterThan(5);
    expect(sum).toBeLessThan(10);
  });
});

describe('финансы', () => {
  it('в гараже с ноутбуком еженедельные расходы нулевые', () => {
    const game = started();
    game.money = 1000;
    expect(weeklyCosts(game).total).toBe(0);
    expect(advanceWeek(game).state.money).toBe(1000);
  });

  it('аренда и проценты входят в недельные расходы', () => {
    const game = started();
    game.office = 'studio';
    expect(weeklyCosts(game).rent).toBeGreaterThan(0);
    expect(weeklyCosts(game).total).toBe(weeklyCosts(game).rent);
    takeLoan(game, 50000);
    const costs = weeklyCosts(game);
    expect(costs.interest).toBeCloseTo(50000 * BALANCE.finance.loanRateWeekly, 6);
    expect(costs.total).toBeCloseTo(costs.rent + costs.interest, 6);
  });

  it('кредит ограничен лимитом, возврат уменьшает долг', () => {
    const game = createGame('Т', 'О', 1);
    const money = game.money;
    expect(takeLoan(game, maxLoan(game) + 1)).toMatch(/лимит/);
    expect(game.money).toBe(money);
    expect(takeLoan(game, 40000)).toBeNull();
    expect(game.money).toBe(money + 40000);
    const id = game.loans[0].id;
    expect(repayLoan(game, id, 15000)).toBeNull();
    expect(game.loans[0].balance).toBe(25000);
    // вернуть нельзя больше, чем есть на счету
    const cash = game.money;
    game.money = 100;
    expect(repayLoan(game, id, 5000)).toMatch(/Недостаточно/);
    expect(game.loans[0].balance).toBe(25000);
    game.money = cash;
    // сумма больше остатка гасит кредит целиком
    expect(repayLoan(game, id, 999999)).toBeNull();
    expect(game.loans).toHaveLength(0);
    expect(game.money).toBe(cash - 25000);
  });

  it('три недели в минусе подряд — банкротство', () => {
    let state = createGame('Т', 'О', 1);
    state.money = -500;
    const first = advanceWeek(state);
    expect(first.state.insolvency).toBe(1);
    expect(first.events.filter((e) => e.type === 'insolvency')).toHaveLength(1);
    state = advanceWeek(first.state).state;
    expect(state.insolvency).toBe(2);
    expect(state.gameover).toBeNull();
    const last = advanceWeek(state);
    expect(last.state.gameover).not.toBeNull();
    expect(last.events.some((e) => e.type === 'gameover')).toBe(true);
    expect(last.state.speed).toBe(0);
  });

  it('выход в плюс снимает угрозу банкротства', () => {
    let state = createGame('Т', 'О', 1);
    state.money = -500;
    state = advanceWeek(state).state;
    state = advanceWeek(state).state;
    expect(state.insolvency).toBe(2);
    state.money = 1000;
    const fixed = advanceWeek(state);
    expect(fixed.state.insolvency).toBe(0);
    expect(fixed.state.gameover).toBeNull();
    expect(fixed.state.achievements).toContain('recovered');
  });

  it('история финансов не растёт бесконечно', () => {
    let state = createGame('Т', 'О', 1);
    for (let i = 0; i < BALANCE.market.financeHistory + 20; i++) state = advanceWeek(state).state;
    expect(state.finance).toHaveLength(BALANCE.market.financeHistory);
    expect(state.finance[state.finance.length - 1].week).toBe(state.week);
  });
});
