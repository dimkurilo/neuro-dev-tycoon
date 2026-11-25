import type { ActiveContract, ContractOffer, ContractTemplate, GameState, GrantOffer, InvestorOffer, SimEvent } from '../types';
import { BALANCE } from '../data/balance';
import { CONTRACTS } from '../data/contracts';
import { DOMAINS, DOMAIN_BY_ID } from '../data/domains';
import { GRANT_FUNDS, INVESTORS } from '../data/labs';
import { PARADIGM_BY_ID } from '../data/paradigms';
import { scaleById } from '../data/compat';
import { yearsSince } from './time';
import type { Rng } from './rng';
import { maxContracts } from './perks';
import { isDomainOpen, isParadigmOpen, isScaleOpen } from './unlock';

/** план модели: для проверки соответствия заказу */
export interface ModelPlan {
  domain: string;
  paradigm: string;
  platform: string;
  scale: string;
}

const cr = (amount: number): string => `${Math.round(amount).toLocaleString('ru-RU')} Cr`;

/** суммы сделок растут вместе с рынком, но медленнее выручки */
export function dealScale(state: GameState): number {
  return Math.pow(BALANCE.growth.market, yearsSince(state.week) * BALANCE.market.dealGrowthExp);
}

function deal(state: GameState, amount: number): number {
  return Math.round((amount * dealScale(state)) / 500) * 500;
}

/** средняя недельная выручка за последние недели */
export function averageIncome(state: GameState, weeks = 8): number {
  const recent = state.finance.slice(-weeks);
  return recent.length > 0 ? recent.reduce((sum, p) => sum + p.income, 0) / recent.length : 0;
}

// ─── заказы клиентов ───

/** заказ выполним лабораторией сейчас: домен, парадигма, платформа и масштаб доступны */
export function templateFeasible(state: GameState, template: ContractTemplate): boolean {
  const domain = DOMAIN_BY_ID[template.domain];
  if (!domain || !isDomainOpen(state, domain)) return false;
  if (template.paradigm !== null) {
    const paradigm = PARADIGM_BY_ID[template.paradigm];
    if (!paradigm || !isParadigmOpen(state, paradigm)) return false;
  }
  if (template.platform !== null && !state.platforms.includes(template.platform)) return false;
  if (template.scale !== null && !isScaleOpen(state, scaleById(template.scale))) return false;
  return true;
}

export function offerFromTemplate(state: GameState, template: ContractTemplate): ContractOffer {
  return {
    uid: state.contracts.nextUid,
    templateId: template.id,
    client: template.client,
    title: template.title,
    text: template.text,
    domain: template.domain,
    paradigm: template.paradigm,
    platform: template.platform,
    scale: template.scale,
    weeks: template.weeks,
    pay: deal(state, template.pay),
    penalty: deal(state, template.penalty),
    minRating: template.minRating,
    offeredWeek: state.week,
    expiresWeek: state.week + BALANCE.market.contractOfferWeeks,
  };
}

/** соответствует ли план модели требованиям заказа */
export function contractMatches(contract: Pick<ContractOffer, 'domain' | 'paradigm' | 'platform' | 'scale'>, plan: ModelPlan): boolean {
  return (
    contract.domain === plan.domain &&
    (contract.paradigm === null || contract.paradigm === plan.paradigm) &&
    (contract.platform === null || contract.platform === plan.platform) &&
    (contract.scale === null || contract.scale === plan.scale)
  );
}

/** заказы в работе, под которые подходит план модели */
export function compatibleContracts(state: GameState, plan: ModelPlan): ActiveContract[] {
  return state.contracts.active.filter((contract) => contractMatches(contract, plan));
}

export function activeContract(state: GameState, uid: number | null): ActiveContract | undefined {
  return uid === null ? undefined : state.contracts.active.find((contract) => contract.uid === uid);
}

export function takeContract(state: GameState, uid: number): string | null {
  const offer = state.contracts.offers.find((c) => c.uid === uid);
  if (!offer) return 'Предложение больше не актуально';
  const limit = maxContracts(state);
  if (state.contracts.active.length >= limit) return `Можно вести не больше ${limit} ${limit === 1 ? 'заказа' : 'заказов'} одновременно`;
  state.contracts = {
    ...state.contracts,
    offers: state.contracts.offers.filter((c) => c.uid !== uid),
    active: [...state.contracts.active, { ...offer, takenWeek: state.week, deadlineWeek: state.week + offer.weeks }],
  };
  return null;
}

/** отказ от заказа в работе: клиент получает неустойку */
export function dropContract(state: GameState, uid: number): string | null {
  const contract = activeContract(state, uid);
  if (!contract) return 'Заказ не найден';
  state.money -= contract.penalty;
  state.contracts = { ...state.contracts, active: state.contracts.active.filter((c) => c.uid !== uid) };
  state.stats = { ...state.stats, contractsFailed: state.stats.contractsFailed + 1 };
  return null;
}

/** итог заказа при выпуске модели: полная оплата, половина или неустойка */
export function settleContract(state: GameState, contract: ActiveContract, rating: number, events: SimEvent[]): void {
  state.contracts = { ...state.contracts, active: state.contracts.active.filter((c) => c.uid !== contract.uid) };
  const stats = state.stats;
  if (rating >= contract.minRating) {
    state.money += contract.pay;
    state.stats = { ...stats, contractsDone: stats.contractsDone + 1 };
    events.push({ type: 'toast', text: `${contract.client}: заказ «${contract.title}» выполнен, +${cr(contract.pay)}`, tone: 'good' });
  } else if (rating >= contract.minRating - 1.5) {
    const half = Math.round(contract.pay / 2);
    state.money += half;
    state.stats = { ...stats, contractsDone: stats.contractsDone + 1 };
    events.push({ type: 'toast', text: `${contract.client}: модель принята с замечаниями — половина оплаты, +${cr(half)}`, tone: 'info' });
  } else {
    state.money -= contract.penalty;
    state.stats = { ...stats, contractsFailed: stats.contractsFailed + 1 };
    events.push({ type: 'toast', text: `${contract.client}: модель отклонена, неустойка −${cr(contract.penalty)}`, tone: 'bad' });
  }
}

function makeOffer(state: GameState, rng: Rng): ContractOffer | null {
  const busy = new Set([...state.contracts.offers, ...state.contracts.active].map((c) => c.templateId));
  const pool = CONTRACTS.filter((t) => !busy.has(t.id) && templateFeasible(state, t));
  if (pool.length === 0) return null;
  return offerFromTemplate(state, rng.pick(pool));
}

// ─── инвесторы ───

export function investorOpen(state: GameState): boolean {
  return state.research.done.includes('biz-investor');
}

function makeInvestorOffer(state: GameState, rng: Rng): InvestorOffer {
  const backer = rng.pick(INVESTORS);
  const floor = BALANCE.market.investorMin * dealScale(state);
  const fromRevenue = averageIncome(state) * BALANCE.market.investorWeeksOfRevenue;
  return {
    id: state.nextDealId,
    investor: backer.name,
    desc: backer.desc,
    amount: Math.round(Math.max(floor, fromRevenue) / 1000) * 1000,
    share: Math.round(rng.range(0.22, 0.34) * 100) / 100,
    weeks: BALANCE.finance.investorWeeks,
    expiresWeek: state.week + 12,
  };
}

export function acceptInvestor(state: GameState): string | null {
  const offer = state.investorOffer;
  if (!offer) return 'Предложения от инвестора нет';
  if (state.investor) return 'У лаборатории уже есть инвестор';
  state.money += offer.amount;
  state.investor = { investor: offer.investor, amount: offer.amount, share: offer.share, startWeek: state.week, endWeek: state.week + offer.weeks, paid: 0 };
  state.investorOffer = null;
  return null;
}

export function rejectInvestor(state: GameState): void {
  state.investorOffer = null;
  state.investorCooldown = Math.round(BALANCE.market.investorEveryWeeks / 3);
}

/** доля инвестора из недельной выручки; возвращает сумму, уходящую инвестору */
export function investorCut(state: GameState, income: number): number {
  const deal = state.investor;
  if (!deal || state.week >= deal.endWeek) return 0;
  const cut = income * deal.share;
  state.investor = { ...deal, paid: deal.paid + cut };
  return cut;
}

// ─── гранты ───

export function grantOpen(state: GameState): boolean {
  return state.research.done.includes('biz-grants');
}

function makeGrantOffer(state: GameState, rng: Rng): GrantOffer {
  const fund = rng.pick(GRANT_FUNDS);
  const open = DOMAINS.filter((d) => isDomainOpen(state, d));
  const domain = open.length > 0 ? rng.pick(open) : null;
  const floor = BALANCE.market.grantMin * dealScale(state);
  const minRating = Math.round(rng.range(6, 7.5) * 2) / 2;
  return {
    id: state.nextDealId,
    fund: fund.name,
    title: domain ? `Модель в домене «${domain.name}»` : 'Модель с высокой оценкой',
    desc: `${fund.desc} Оплатим модель со средней оценкой не ниже ${minRating.toFixed(1).replace('.', ',')}.`,
    amount: Math.round(Math.max(floor, averageIncome(state) * 20) / 500) * 500,
    domain: domain?.id ?? null,
    minRating,
    weeks: rng.int(30, 46),
    expiresWeek: state.week + 10,
  };
}

export function acceptGrant(state: GameState, id: number): string | null {
  const offer = state.grantOffers.find((g) => g.id === id);
  if (!offer) return 'Предложения больше нет';
  if (state.grants.filter((g) => g.status === 'open').length >= BALANCE.market.grantMaxActive) return 'Слишком много открытых грантов';
  state.grantOffers = state.grantOffers.filter((g) => g.id !== id);
  state.grants = [...state.grants, { ...offer, takenWeek: state.week, deadlineWeek: state.week + offer.weeks, status: 'open' }];
  return null;
}

/** гранты, закрытые выпуском подходящей модели */
export function settleGrants(state: GameState, domain: string, rating: number, events: SimEvent[]): void {
  let paid = 0;
  const grants = state.grants.map((grant) => {
    const hit = grant.status === 'open' && (grant.domain === null || grant.domain === domain) && rating >= grant.minRating;
    if (!hit) return grant;
    paid += grant.amount;
    return { ...grant, status: 'done' as const };
  });
  if (paid === 0) return;
  state.grants = grants;
  state.money += paid;
  events.push({ type: 'toast', text: `Грант выполнен: +${cr(paid)}`, tone: 'good' });
}

// ─── недельный шаг ───

/** новые и устаревшие предложения, сорванные сроки, предложения инвесторов и гранты */
export function runContracts(state: GameState, rng: Rng, events: SimEvent[]): void {
  // предложения клиентов
  const live = state.contracts.offers.filter((c) => state.week < c.expiresWeek);
  const fresh = live.length < BALANCE.market.contractOfferMax && rng.chance(BALANCE.market.contractOfferChance) ? makeOffer(state, rng) : null;
  state.contracts = {
    ...state.contracts,
    offers: fresh ? [...live, fresh] : live,
    nextUid: fresh ? state.contracts.nextUid + 1 : state.contracts.nextUid,
  };

  // сорванные сроки
  const missed = state.contracts.active.filter((c) => state.week > c.deadlineWeek);
  if (missed.length > 0) {
    state.contracts = { ...state.contracts, active: state.contracts.active.filter((c) => state.week <= c.deadlineWeek) };
    let penalty = 0;
    for (const contract of missed) {
      penalty += contract.penalty;
      events.push({ type: 'toast', text: `${contract.client}: срок заказа «${contract.title}» истёк, неустойка −${cr(contract.penalty)}`, tone: 'bad' });
    }
    state.money -= penalty;
    state.stats = { ...state.stats, contractsFailed: state.stats.contractsFailed + missed.length };
  }

  // инвестор: доля закончилась
  if (state.investor && state.week >= state.investor.endWeek) {
    events.push({ type: 'toast', text: `Доля инвестора «${state.investor.investor}» в выручке закончилась`, tone: 'info' });
    state.investor = null;
  }
  state.investorOffer = state.investorOffer && state.week >= state.investorOffer.expiresWeek ? null : state.investorOffer;
  if (investorOpen(state) && !state.investor && !state.investorOffer) {
    const left = state.investorCooldown - 1;
    if (left > 0) state.investorCooldown = left;
    else {
      state.investorOffer = makeInvestorOffer(state, rng);
      state.nextDealId += 1;
      state.investorCooldown = BALANCE.market.investorEveryWeeks;
    }
  }

  // гранты: проваленные по сроку и новые предложения
  const lapsed = state.grants.filter((g) => g.status === 'open' && state.week > g.deadlineWeek);
  if (lapsed.length > 0) {
    state.grants = state.grants.map((g) => (lapsed.some((x) => x.id === g.id) ? { ...g, status: 'failed' as const } : g));
    for (const grant of lapsed) events.push({ type: 'toast', text: `Грант «${grant.title}» не выполнен в срок`, tone: 'bad' });
  }
  state.grantOffers = state.grantOffers.filter((g) => state.week < g.expiresWeek);
  if (grantOpen(state) && state.grantOffers.length === 0) {
    const left = state.grantCooldown - 1;
    if (left > 0) state.grantCooldown = left;
    else {
      state.grantOffers = [makeGrantOffer(state, rng)];
      state.nextDealId += 1;
      state.grantCooldown = BALANCE.market.grantEveryWeeks;
    }
  }

  state.rng = rng.state;
}
