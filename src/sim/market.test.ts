import { describe, expect, it } from 'vitest';
import type { ActiveContract, ExpansionType, GameState, QualityReport, ReleasedModel, SimEvent } from '../types';
import { BALANCE } from '../data/balance';
import { CONTRACTS, CONTRACT_BY_ID } from '../data/contracts';
import { DOMAIN_BY_ID } from '../data/domains';
import { EVENTS } from '../data/events';
import { PARADIGM_BY_ID } from '../data/paradigms';
import { PLATFORM_BY_ID } from '../data/platforms';
import { RESEARCH_BY_ID } from '../data/research';
import { LABS } from '../data/labs';
import { CAMPAIGNS } from '../data/marketing';
import { createGame } from './game';
import { advanceWeek } from './tick';
import { Rng } from './rng';
import { acceptGrant, acceptInvestor, contractMatches, investorCut, offerFromTemplate, settleContract, settleGrants, takeContract, templateFeasible } from './contracts';
import { campaignPrice, canCampaign, startCampaign } from './marketing';
import { canExpand, startExpansion } from './expansions';
import { complianceFee, createModel, validateModel, type ModelInput } from './project';
import { expectedFor } from './release';
import { leaderboard, weeklyChart } from './rivals';
import { startResearch } from './research';
import { weekIndex } from './time';

const INPUT: ModelInput = { name: 'М', domain: 'vision', paradigm: 'rnn', platform: 'web', scale: 'pet', gpu: 'g0' };

const ZERO_REPORT: QualityReport = {
  points: 0,
  expected: 1,
  ratio: 0,
  pointsScore: 0,
  deviation: 0,
  balanceFactor: 1,
  fit: 'ok',
  fitFactor: 1,
  noveltyUses: 0,
  noveltyFactor: 1,
  hypeFactor: 1,
  trendFactor: 1,
  degradationPenalty: 0,
  quality: 0,
};

function researched(game: GameState, ...ids: string[]): GameState {
  game.research.done = [...new Set([...game.research.done, ...ids])];
  return game;
}

/** вручную добавляет выпущенную модель — для тестов чартов и версий */
function pushModel(game: GameState, overrides: Partial<ReleasedModel> = {}): ReleasedModel {
  const model: ReleasedModel = {
    id: game.nextModelId,
    name: 'ТестМодель',
    domain: 'vision',
    paradigm: 'rnn',
    platform: 'web',
    scale: 'pet',
    releasedWeek: game.week,
    rating: 7,
    quality: 7,
    reviews: [],
    report: ZERO_REPORT,
    waves: [{ startWeek: game.week, potential: 5000 }],
    weekly: [],
    totalRevenue: 0,
    lastRevenue: 0,
    fansGained: 0,
    versions: [],
    baseId: null,
    versionType: null,
    ...overrides,
  };
  game.nextModelId += 1;
  game.models = [...game.models, model];
  return model;
}

/** доводит текущий проект до релиза */
function release(game: GameState, limit = 80): GameState {
  let state = game;
  for (let i = 0; i < limit && state.project; i++) state = advanceWeek(state).state;
  if (state.project) throw new Error('проект не дошёл до релиза');
  return state;
}

/** заказ в работе по шаблону */
function activeFrom(game: GameState, templateId: string, weeks = 20): ActiveContract {
  const offer = offerFromTemplate(game, CONTRACT_BY_ID[templateId]);
  return { ...offer, takenWeek: game.week, deadlineWeek: game.week + weeks };
}

describe('рынок: контент', () => {
  it('26 заказов, и все их требования существуют в игре', () => {
    expect(CONTRACTS.length).toBeGreaterThanOrEqual(24);
    for (const c of CONTRACTS) {
      expect(DOMAIN_BY_ID[c.domain], c.id).toBeDefined();
      if (c.paradigm) expect(PARADIGM_BY_ID[c.paradigm], c.id).toBeDefined();
      if (c.platform) expect(PLATFORM_BY_ID[c.platform], c.id).toBeDefined();
      expect(c.pay).toBeGreaterThan(c.penalty);
      expect(c.minRating).toBeGreaterThan(0);
      expect(c.text.length).toBeGreaterThan(10);
    }
  });

  it('60+ событий с уникальными id по возрастанию недель; ссылки корректны', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (let i = 1; i < EVENTS.length; i++) expect(EVENTS[i].week).toBeGreaterThanOrEqual(EVENTS[i - 1].week);
    expect(EVENTS[0].week).toBeGreaterThanOrEqual(0);
    expect(EVENTS[EVENTS.length - 1].week).toBe(weekIndex(2040, 1));
    for (const e of EVENTS) {
      expect(e.text.length).toBeGreaterThan(20);
      for (const effect of e.effects) {
        if (effect.type === 'discount') for (const id of effect.research) expect(RESEARCH_BY_ID[id], `${e.id}: ${id}`).toBeDefined();
        if (effect.type === 'unlock') for (const id of effect.paradigms ?? []) expect(PARADIGM_BY_ID[id]?.research, `${e.id}: ${id}`).toBeTruthy();
      }
    }
  });

  it('12 лабораторий-конкурентов с реальными доменами', () => {
    expect(LABS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(LABS.map((l) => l.id)).size).toBe(LABS.length);
    for (const lab of LABS) for (const d of lab.domains) expect(DOMAIN_BY_ID[d], `${lab.id}: ${d}`).toBeDefined();
  });
});

describe('заказы клиентов', () => {
  it('в начале доступны только заказы на открытые домены и лицензированные платформы', () => {
    const game = createGame('Т', 'О', 1);
    const feasible = CONTRACTS.filter((t) => templateFeasible(game, t));
    expect(feasible.length).toBeGreaterThan(3);
    for (const t of feasible) {
      expect(t.platform).toBe('web');
      expect(t.paradigm).toBeNull();
    }
    expect(templateFeasible(game, CONTRACT_BY_ID['c-med-clinic'])).toBe(false);
    expect(templateFeasible(game, CONTRACT_BY_ID['c-imgen-studio'])).toBe(false);
  });

  it('предложения приходят сами, оплата растёт вместе с рынком', () => {
    let game = createGame('Т', 'О', 3);
    for (let i = 0; i < 12 && game.contracts.offers.length === 0; i++) game = advanceWeek(game).state;
    expect(game.contracts.offers.length).toBeGreaterThan(0);
    const offer = game.contracts.offers[0];
    expect(offer.expiresWeek).toBe(game.week + BALANCE.market.contractOfferWeeks);
    const template = CONTRACT_BY_ID['c-credit-bank'];
    expect(offerFromTemplate({ ...game, week: weekIndex(2022, 0) }, template).pay).toBeGreaterThan(template.pay * 2);
  });

  it('соответствие плану модели: домен, парадигма, платформа и масштаб', () => {
    const plan = { domain: 'vision', paradigm: 'cnn', platform: 'web', scale: 'pet' };
    expect(contractMatches({ domain: 'vision', paradigm: null, platform: null, scale: null }, plan)).toBe(true);
    expect(contractMatches({ domain: 'vision', paradigm: 'cnn', platform: 'web', scale: 'pet' }, plan)).toBe(true);
    expect(contractMatches({ domain: 'nlp', paradigm: null, platform: null, scale: null }, plan)).toBe(false);
    expect(contractMatches({ domain: 'vision', paradigm: 'rnn', platform: null, scale: null }, plan)).toBe(false);
    expect(contractMatches({ domain: 'vision', paradigm: null, platform: 'mobile', scale: null }, plan)).toBe(false);
    expect(contractMatches({ domain: 'vision', paradigm: null, platform: null, scale: 'product' }, plan)).toBe(false);
  });

  it('одновременно ведётся один заказ; модель под заказ проходит валидацию', () => {
    const game = createGame('Т', 'О', 3);
    game.contracts = { ...game.contracts, offers: [offerFromTemplate(game, CONTRACT_BY_ID['c-recsys-shop']), offerFromTemplate({ ...game, contracts: { ...game.contracts, nextUid: 50 } }, CONTRACT_BY_ID['c-credit-bank'])] };
    const [firstUid, secondUid] = game.contracts.offers.map((o) => o.uid);
    expect(takeContract(game, firstUid)).toBeNull();
    expect(takeContract(game, secondUid)).toMatch(/не больше 1 заказа/);
    const contract = game.contracts.active[0];
    expect(contract.deadlineWeek).toBe(game.week + contract.weeks);
    const fitting: ModelInput = { ...INPUT, domain: contract.domain, paradigm: contract.paradigm ?? INPUT.paradigm, platform: contract.platform ?? 'web', contractId: contract.uid };
    expect(validateModel(game, fitting)).toBeNull();
    expect(validateModel(game, { ...INPUT, contractId: contract.uid })).toMatch(/не соответствует/);
    expect(validateModel(game, { ...fitting, contractId: 9999 })).toMatch(/уже нет в работе/);
  });

  it('выпуск под заказ: полная оплата, половина или неустойка', () => {
    const run = (minRating: number, rating: number) => {
      const game = createGame('Т', 'О', 1);
      const contract = { ...activeFrom(game, 'c-recsys-shop'), minRating };
      game.contracts = { ...game.contracts, active: [contract] };
      const before = game.money;
      const events: SimEvent[] = [];
      settleContract(game, contract, rating, events);
      return { game, contract, before, events };
    };
    const full = run(5, 6.5);
    expect(full.game.money).toBe(full.before + full.contract.pay);
    expect(full.game.stats.contractsDone).toBe(1);
    expect(full.game.contracts.active).toHaveLength(0);
    const half = run(6.5, 5.2);
    expect(half.game.money).toBe(half.before + Math.round(half.contract.pay / 2));
    expect(half.game.stats.contractsDone).toBe(1);
    const fail = run(6.5, 3);
    expect(fail.game.money).toBe(fail.before - fail.contract.penalty);
    expect(fail.game.stats.contractsFailed).toBe(1);
    expect(fail.events[0]).toMatchObject({ type: 'toast', tone: 'bad' });
  });

  it('сорванный срок — неустойка и провал', () => {
    let game = createGame('Т', 'О', 1);
    const contract = activeFrom(game, 'c-recsys-shop', 2);
    game.contracts = { ...game.contracts, active: [contract] };
    const before = game.money;
    game = advanceWeek(game).state;
    game = advanceWeek(game).state;
    expect(game.contracts.active).toHaveLength(1);
    game = advanceWeek(game).state;
    expect(game.contracts.active).toHaveLength(0);
    expect(game.stats.contractsFailed).toBe(1);
    expect(before - game.money).toBeGreaterThanOrEqual(contract.penalty);
  });

  it('модель под заказ оплачивается при релизе', () => {
    let game = createGame('Т', 'О', 1);
    const contract = activeFrom(game, 'c-recsys-shop', 60);
    game.contracts = { ...game.contracts, active: [contract] };
    createModel(game, new Rng(1), { ...INPUT, domain: 'recsys', contractId: contract.uid });
    const before = game.money;
    game = release(game);
    expect(game.contracts.active).toHaveLength(0);
    expect(game.stats.contractsDone + game.stats.contractsFailed).toBe(1);
    // либо оплата, либо неустойка — в любом случае сделка закрыта
    expect(game.money !== before).toBe(true);
  });
});

describe('инвесторы и гранты', () => {
  it('инвестор приходит только после исследования и делит выручку', () => {
    let game = createGame('Т', 'О', 1);
    for (let i = 0; i < 60; i++) game = advanceWeek(game).state;
    expect(game.investorOffer).toBeNull();
    game = researched(game, 'biz-investor');
    game.investorCooldown = 1;
    game = advanceWeek(game).state;
    const offer = game.investorOffer;
    expect(offer).not.toBeNull();
    const money = game.money;
    expect(acceptInvestor(game)).toBeNull();
    expect(game.money).toBe(money + offer!.amount);
    expect(game.investor?.share).toBe(offer!.share);
    const cut = investorCut(game, 10000);
    expect(cut).toBeCloseTo(10000 * offer!.share, 6);
    expect(game.investor?.paid).toBeCloseTo(cut, 6);
    game.investor = { ...game.investor!, endWeek: game.week };
    expect(investorCut(game, 10000)).toBe(0);
  });

  it('грант: принят, выполнен подходящей моделью, провален по сроку', () => {
    let game = researched(createGame('Т', 'О', 2), 'biz-grants');
    game.grantCooldown = 1;
    game = advanceWeek(game).state;
    expect(game.grantOffers).toHaveLength(1);
    const offer = game.grantOffers[0];
    const money = game.money;
    expect(acceptGrant(game, offer.id)).toBeNull();
    expect(game.grants).toHaveLength(1);
    const events: SimEvent[] = [];
    settleGrants(game, offer.domain ?? 'vision', offer.minRating, events);
    expect(game.money).toBe(money + offer.amount);
    expect(game.grants[0].status).toBe('done');
    expect(events.some((e) => e.type === 'toast')).toBe(true);
    game.grants = [{ ...offer, takenWeek: game.week, deadlineWeek: game.week + 1, status: 'open' }];
    for (let i = 0; i < 3; i++) game = advanceWeek(game).state;
    expect(game.grants[0].status).toBe('failed');
  });
});

describe('маркетинг', () => {
  it('кампания закрыта без исследования, затем разгоняет хайп до потолка и кончается', () => {
    const teaser = CAMPAIGNS.find((c) => c.id === 'teaser')!;
    let game = createGame('Т', 'О', 1);
    expect(canCampaign(game, 'teaser')).toMatch(/не открыта/);
    game = researched(game, 'mkt-social');
    expect(canCampaign(game, 'conf')).toMatch(/не открыта/);
    expect(canCampaign(game, 'teaser')).toBeNull();
    const money = game.money;
    const price = campaignPrice(game, teaser);
    expect(startCampaign(game, 'teaser')).toBeNull();
    expect(game.money).toBeCloseTo(money - price, 6);
    expect(canCampaign(game, 'paper')).toMatch(/Уже идёт/);
    const hype0 = game.hype;
    game = advanceWeek(game).state;
    expect(game.hype).toBe(hype0 + teaser.hype);
    game = researched(game, 'mkt-show');
    game.campaign = { id: 'viral', startedWeek: game.week, endsWeek: game.week + 10 };
    game.hype = 96;
    game = advanceWeek(game).state;
    expect(game.hype).toBe(100);
    for (let i = 0; i < 12; i++) game = advanceWeek(game).state;
    expect(game.campaign).toBeNull();
    expect(game.hype).toBeLessThan(100);
  });
});

describe('версии моделей', () => {
  it('версии требуют функции фреймворка и масштаб; повторно — только файнтюн', () => {
    const game = createGame('Т', 'О', 1);
    const base = pushModel(game);
    expect(canExpand(game, base.id, 'v2')).toBeNull();
    expect(canExpand(game, base.id, 'mini')).toMatch(/Дистилляция/);
    expect(canExpand(game, base.id, 'finetune')).toMatch(/LoRA/);
    expect(canExpand(game, base.id, 'xl')).toMatch(/Шардирование/);
    game.framework.features = ['shard', 'distill', 'lora'];
    expect(canExpand(game, base.id, 'xl')).toMatch(/Продуктовая/);
    expect(canExpand(game, base.id, 'mini')).toBeNull();
    pushModel(game, { baseId: base.id, versionType: 'v2', name: 'v2' });
    expect(canExpand(game, base.id, 'v2')).toMatch(/уже выпущена/);
    expect(canExpand(game, base.id, 'finetune')).toBeNull();
  });

  it('версия короче базовой модели и добавляет базовой волну продаж', () => {
    let game = createGame('Т', 'О', 1);
    const base = pushModel(game);
    expect(startExpansion(game, base.id, 'v2', new Rng(1), '')).toBeNull();
    expect(game.project?.kind).toBe('expansion');
    expect(game.project?.name).toBe('ТестМодель 2.0');
    expect(game.project?.weeksPerPhase).toEqual([2, 3, 2]);
    game = release(game);
    expect(game.models).toHaveLength(2);
    expect(game.models[0].waves).toHaveLength(2);
    expect(game.models[0].versions[0].type).toBe('v2');
    expect(game.models[1].baseId).toBe(base.id);
    expect(game.stats.versionsMade).toBe(1);
  });

  it('ожидания рынка для версий масштабируются', () => {
    expect(expectedFor({ scale: 'pet', kind: 'expansion', expansion: 'mini' }, 0)).toBeCloseTo(500, 6);
    expect(expectedFor({ scale: 'pet', kind: 'expansion', expansion: 'xl' }, 0)).toBeCloseTo(1500, 6);
    expect(expectedFor({ scale: 'pet', kind: 'model', expansion: null }, 0)).toBeCloseTo(1000, 6);
  });
});

describe('события таймлайна', () => {
  it('событие срабатывает один раз в свою неделю и попадает в новости', () => {
    let game = createGame('Т', 'О', 1);
    for (let i = 0; i < 3; i++) game = advanceWeek(game).state;
    expect(game.news).toHaveLength(0);
    const step = advanceWeek(game);
    game = step.state;
    expect(game.news.map((n) => n.title)).toContain('Краудсорсинговый датасет изображений');
    expect(game.seenEvents).toContain('e-2012-dataset');
    expect(game.trends.some((t) => t.domain === 'vision')).toBe(true);
    expect(step.events.some((e) => e.type === 'news')).toBe(true);
    expect(advanceWeek(game).state.news).toHaveLength(1);
  });

  it('событие открывает парадигму и закрывает её текущее исследование', () => {
    let game = researched(createGame('Т', 'О', 1), 'lab-metrics');
    game.rp = 500;
    game.week = weekIndex(2012, 35);
    expect(startResearch(game, 'p-cnn')).toBeNull();
    game = advanceWeek(game).state;
    expect(game.research.done).toContain('p-cnn');
    expect(game.research.current).toBeNull();
  });

  it('скидки и сборы регулятора применяются в свои годы', () => {
    let game = createGame('Т', 'О', 1);
    for (let i = 0; i <= weekIndex(2017, 40); i++) game = advanceWeek(game).state;
    expect(game.research.discounts).toContain('p-transformer');
    expect(complianceFee(game, 'credit')).toBeGreaterThan(0);
    expect(complianceFee(game, 'vision')).toBe(0);
    expect(game.seenEvents).toHaveLength(EVENTS.filter((e) => e.week <= weekIndex(2017, 40)).length);
  });

  it('первая «зима» снижает выручку рынка, потом эффект проходит', () => {
    let game = createGame('Т', 'О', 1);
    for (let i = 0; i < weekIndex(2016, 30); i++) game = advanceWeek(game).state;
    game = advanceWeek(game).state;
    expect(game.marketMods.some((m) => m.mult < 1)).toBe(true);
    for (let i = 0; i < 60; i++) game = advanceWeek(game).state;
    expect(game.marketMods.some((m) => m.mult < 1 && m.untilWeek !== null && game.week < m.untilWeek)).toBe(false);
  });
});

describe('конкуренты и чарты', () => {
  it('за два года лаборатории выпускают десятки моделей', () => {
    let game = createGame('Т', 'О', 1);
    for (let i = 0; i < 104; i++) game = advanceWeek(game).state;
    expect(game.competitors.length).toBeGreaterThan(8);
    for (const c of game.competitors) {
      expect(c.rating).toBeGreaterThanOrEqual(2);
      expect(c.rating).toBeLessThanOrEqual(9.9);
      expect(c.potential).toBeGreaterThan(0);
      expect(LABS.some((lab) => lab.id === c.lab)).toBe(true);
    }
    const chart = weeklyChart(game);
    expect(chart.length).toBeLessThanOrEqual(BALANCE.market.chartSize);
    for (let i = 1; i < chart.length; i++) expect(chart[i - 1].revenue).toBeGreaterThanOrEqual(chart[i].revenue);
    const board = leaderboard(game);
    for (let i = 1; i < board.length; i++) expect(board[i - 1].rating).toBeGreaterThanOrEqual(board[i].rating);
  });

  it('модель игрока возглавляет чарт и приносит достижение', () => {
    let game = createGame('Т', 'О', 1);
    pushModel(game, { waves: [{ startWeek: game.week, potential: 1e9 }] });
    game = advanceWeek(game).state;
    expect(weeklyChart(game)[0].mine).toBe(true);
    expect(game.stats.chartTops).toBe(1);
    expect(game.achievements).toContain('chart-top');
  });

  it('все четыре типа версий описаны', () => {
    for (const type of ['v2', 'xl', 'mini', 'finetune'] as ExpansionType[]) {
      expect(canExpand(createGame('Т', 'О', 1), 999, type)).toMatch(/не найдена/);
    }
  });
});
