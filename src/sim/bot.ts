import type { Candidate, ContractOffer, Domain, GameState, Platform, Project, ResearchNode, Scale, SimEvent } from '../types';
import { BALANCE } from '../data/balance';
import { SCALES, fitOf, idealShare } from '../data/compat';
import { DOMAINS } from '../data/domains';
import { EXPANSION_ORDER } from '../data/expansions';
import { DEV_PHASES, FIELD_IDS, phaseWeeksTotal } from '../data/fields';
import { GPUS, gpuById } from '../data/gpus';
import { MODULES } from '../data/modules';
import { OFFICES } from '../data/offices';
import { PARADIGMS } from '../data/paradigms';
import { PLATFORMS } from '../data/platforms';
import { RESEARCH } from '../data/research';
import { Rng } from './rng';
import { createGame } from './game';
import { advanceWeek } from './tick';
import { acceptGrant, acceptInvestor, contractMatches, rejectInvestor, takeContract } from './contracts';
import { canExpand, startExpansion } from './expansions';
import { loanOutstanding, maxLoan, repayLoan, takeLoan, weeklyCosts } from './finance';
import { availableFeatures, defaultFrameworkName, featureCost, startFramework } from './framework';
import { campaignsAvailable, canCampaign, campaignPrice, startCampaign } from './marketing';
import { licenseGpu, licensePlatform, licensePrice, moveOffice, useGpu } from './market';
import { buyObject, canBuyObject, objectPrice, officeRank } from './office';
import { createModel, gpuWeeklyCostOf, releaseNow, teamPools, validateModel, type ModelInput } from './project';
import { comboKey, expectedPoints, trendMultiplier } from './release';
import { canStartResearch, researchUnlocked, startResearch } from './research';
import { freeSeats, hire, isAvailable, postJobs, sendVacation } from './staff';
import { weekOfYear, yearOf } from './time';
import { isDomainOpen, isParadigmOpen, isResearchDone, isScaleOpen } from './unlock';
import { getMods } from './mods';

/**
 * Автоматический игрок для баланс-прохода: сам ведёт партию неделями и пользуется только тем,
 * что доступно человеку в интерфейсе. Числа ниже — его осторожность, а не баланс игры.
 */
const PLAY = {
  /** запас денег в недельных расходах, ниже которого бот берёт кредит */
  keepWeeks: 12,
  /** выгорание, с которого бот отправляет в отпуск */
  vacationBurnout: 70,
  /** на сколько недель зарплаты должно хватать, чтобы нанять */
  hireSalaryWeeks: 26,
  /** сколько недель бот чинит деградации в стабилизации, прежде чем выпустить модель с недоделками */
  stabilizationPatience: 8,
  /** запас недель на стабилизацию внутри срока заказа */
  contractSlackWeeks: 6,
  /** во сколько раз свободные деньги должны превышать цену покупки */
  licenseReserve: 4,
  moveReserve: 2,
  objectReserve: 6,
  campaignReserve: 10,
  /** сколько моделей выпустить между версиями фреймворка */
  modelsPerFramework: 2,
  /** доля проектов, в которых бот соглашается на заказ клиента; остальное — свои модели и версии */
  contractShare: 0.5,
  /** шанс заняться версией модели и оценка базовой модели, с которой это имеет смысл */
  expansionChance: 0.35,
  expansionRating: 8,
  /** во сколько раз очки команды должны превысить ожидания рынка, чтобы бот взял масштаб покрупнее */
  scaleTargetRatio: 1.8,
} as const;

/** что исследовать раньше остального; дальше — по ярусу и цене */
const PRIORITY_RESEARCH = [
  'lab-metrics', 'p-cnn', 'scale-product', 'fw-autodiff', 'office-studio', 'lab-matrix', 'mkt-social', 'biz-contract',
  'office-board', 'biz-grants', 'fw-track', 'biz-investor', 'lab-repro', 'office-coffee', 'office-library', 'scale-flagship',
];

export interface BotYear {
  year: number;
  money: number;
  fans: number;
  staff: number;
  office: string;
  releases: number;
  bestRating: number;
  /** средние доход и расход за неделю в этом году */
  income: number;
  costs: number;
  research: number;
  achievements: number;
}

export interface BotRun {
  game: GameState;
  /** срез на январь каждого года */
  years: BotYear[];
  /** неделя банкротства; null — партия дожила до конца */
  bankruptWeek: number | null;
  minMoney: number;
}

interface Memory {
  stabilizationWeeks: number;
  modelsSinceFramework: number;
}

const power = (c: Pick<Candidate, 'research' | 'engineering' | 'speed'>) => c.research + c.engineering + c.speed;
const noEvents: SimEvent[] = [];
const releasedIn = (state: GameState, domain: string) => state.models.filter((m) => m.domain === domain).length;

/** слайдеры — так, чтобы доля исследований в каждом поле совпала с идеальной при составе команды */
function tuneSliders(state: GameState, project: Project): void {
  if (project.kind === 'framework') return;
  const { rf, ef } = teamPools(state);
  for (const id of FIELD_IDS) {
    const ideal = idealShare(project.domain, project.paradigm, id);
    const share = (ideal * ef) / (rf * (1 - ideal) + ideal * ef);
    project.sliders = { ...project.sliders, [id]: Math.round(Math.min(0.95, Math.max(0.05, share)) * 100) };
  }
}

function manageMoney(state: GameState, reserve: number): void {
  if (state.money < reserve) {
    const room = maxLoan(state) - loanOutstanding(state);
    if (room > 1000) takeLoan(state, Math.min(room, Math.max(0, reserve * 2 - state.money)));
  } else if (state.money > reserve * 3) {
    for (const loan of [...state.loans]) repayLoan(state, loan.id, loan.balance);
  }
}

function manageTeam(state: GameState, rng: Rng, reserve: number): void {
  for (const s of state.staff) {
    if (isAvailable(s) && s.burnout >= PLAY.vacationBurnout) sendVacation(state, s.id);
  }
  while (freeSeats(state) > 0) {
    const budget = state.money - reserve;
    const options = state.candidates.filter((c) => c.salary * PLAY.hireSalaryWeeks < budget);
    if (options.length === 0) break;
    const best = options.reduce((a, b) => (power(b) > power(a) ? b : a));
    if (hire(state, best.id) !== null) break;
  }
  const jobPost = licensePrice(state, BALANCE.team.jobPostCost);
  if (freeSeats(state) > 0 && state.candidates.length === 0 && state.money > jobPost * PLAY.campaignReserve + reserve) postJobs(state, rng);
}

function manageResearch(state: GameState): void {
  if (state.research.current !== null) return;
  let best: ResearchNode | null = null;
  let bestScore = Infinity;
  for (const node of RESEARCH) {
    if (!researchUnlocked(state, node) || canStartResearch(state, node.id) !== null) continue;
    const priority = PRIORITY_RESEARCH.indexOf(node.id);
    const score = priority >= 0 ? priority : PRIORITY_RESEARCH.length + node.tier * 100 + node.cost;
    if (score < bestScore) {
      best = node;
      bestScore = score;
    }
  }
  if (best) startResearch(state, best.id);
}

/** разовые покупки: лицензии, переезд, объекты офиса, кампания, сделки */
function manageSpend(state: GameState, reserve: number): void {
  for (const platform of PLATFORMS) {
    if (!state.platforms.includes(platform.id) && yearOf(state.week) >= platform.year && state.money > licensePrice(state, platform.license) * PLAY.licenseReserve + reserve) {
      licensePlatform(state, platform.id);
    }
  }
  for (const gpu of GPUS) {
    if (!state.gpus.includes(gpu.id) && yearOf(state.week) >= gpu.year && state.money > licensePrice(state, gpu.license) * PLAY.licenseReserve + reserve) {
      licenseGpu(state, gpu.id);
    }
  }
  const strongest = GPUS.filter((g) => state.gpus.includes(g.id)).reduce<(typeof GPUS)[number] | null>((a, g) => (!a || g.compute > a.compute ? g : a), null);
  if (strongest && !state.project) useGpu(state, strongest.id);

  for (const office of OFFICES) {
    const price = licensePrice(state, office.moveCost);
    if (OFFICES.indexOf(office) > officeRank(state) && isResearchDone(state, office.research) && state.money > price * PLAY.moveReserve + reserve) moveOffice(state, office.id);
  }
  for (const def of MODULES) {
    if (canBuyObject(state, def.id) === null && state.money > objectPrice(state, def) * PLAY.objectReserve + reserve) buyObject(state, def.id);
  }
  if (!state.campaign) {
    const options = campaignsAvailable(state).filter((c) => canCampaign(state, c.id) === null && state.money > campaignPrice(state, c) * PLAY.campaignReserve + reserve);
    if (options.length > 0) startCampaign(state, options.reduce((a, b) => (b.cost > a.cost ? b : a)).id);
  }
  if (state.investorOffer) {
    if (state.money < reserve * 2) acceptInvestor(state);
    else rejectInvestor(state);
  }
  for (const grant of [...state.grantOffers]) acceptGrant(state, grant.id);
}

/** платформа с наибольшей долей лаборатории среди купленных */
function choosePlatform(state: GameState): Platform | undefined {
  return PLATFORMS.filter((p) => state.platforms.includes(p.id)).reduce<Platform | null>((a, p) => (!a || p.share > a.share ? p : a), null) ?? undefined;
}

/** домен: тренд и новизна, с небольшой случайностью, чтобы не зациклиться на одном */
function chooseDomain(state: GameState, rng: Rng): Domain | undefined {
  const open = DOMAINS.filter((d) => isDomainOpen(state, d));
  if (open.length === 0) return undefined;
  const score = (d: Domain) => trendMultiplier(state, d.id) * (releasedIn(state, d.id) < 2 ? 1 : 0.7) * (1 + rng.next() * 0.3);
  return open.reduce((a, d) => (score(d) > score(a) ? d : a));
}

/** парадигма: идеальная совместимость и новизна связки */
function chooseParadigm(state: GameState, domain: Domain, rng: Rng): string | undefined {
  const open = PARADIGMS.filter((p) => isParadigmOpen(state, p));
  if (open.length === 0) return undefined;
  const score = (p: (typeof PARADIGMS)[number]) => {
    const uses = state.comboMemory[comboKey(domain.id, p.id)]?.times ?? 0;
    return BALANCE.quality.fit[fitOf(domain.id, p.id)] * (uses < 2 ? 1 : 0.8) * (1 + rng.next() * 0.2);
  };
  return open.reduce((a, p) => (score(p) > score(a) ? p : a)).id;
}

/** самый крупный масштаб, который команда перекроет с запасом, на который хватает денег и времени */
function chooseScale(state: GameState, maxWeeks: number, reserve: number): Scale {
  const open = SCALES.filter((s) => isScaleOpen(state, s));
  const inTime = open.filter((s) => phaseWeeksTotal(s.weeks) + PLAY.contractSlackWeeks <= maxWeeks);
  const pool = inTime.length > 0 ? inTime : open;
  const fallback = pool[0] ?? SCALES[0];
  const mods = getMods(state);
  const points = BALANCE.project.pointsPerWeek * teamPools(state).power * gpuById(state.gpu).compute * mods.speed;
  const weeks = (s: Scale) => phaseWeeksTotal(s.weeks);
  const reachable = (s: Scale) => expectedPoints(s.id, state.week) * PLAY.scaleTargetRatio <= points * weeks(s);
  const affordable = (s: Scale) => gpuWeeklyCostOf(gpuById(state.gpu), s.id) * weeks(s) * 2 < state.money - reserve;
  return [...pool].reverse().find((s) => reachable(s) && affordable(s)) ?? fallback;
}


/** план модели под заказ; null — требования заказа лаборатория сейчас не осилит */
function planForContract(state: GameState, offer: ContractOffer, rng: Rng, reserve: number): ModelInput | null {
  const domain = DOMAINS.find((d) => d.id === offer.domain);
  if (!domain || !isDomainOpen(state, domain)) return null;
  const paradigm = offer.paradigm ?? chooseParadigm(state, domain, rng);
  if (!paradigm) return null;
  const platform = offer.platform ?? choosePlatform(state)?.id;
  if (!platform || !state.platforms.includes(platform)) return null;
  const scale = offer.scale ?? chooseScale(state, offer.weeks, reserve).id;
  return { name: '', domain: domain.id, paradigm, platform, scale, gpu: state.gpu };
}

/** запускает модель и выставляет слайдеры под идеальный баланс */
function launch(state: GameState, rng: Rng, input: ModelInput): void {
  createModel(state, rng, input);
  const project = state.project;
  if (project) tuneSliders(state, project);
}

/** заказ: берём тот, что по силам и по срокам; план сверяем до того, как связываться обязательствами */
function startContract(state: GameState, rng: Rng, reserve: number): boolean {
  for (const offer of state.contracts.offers) {
    const plan = planForContract(state, offer, rng, reserve);
    if (!plan || offer.minRating > state.stats.bestRating - 0.3 || !contractMatches(offer, plan)) continue;
    if (validateModel(state, plan) !== null || takeContract(state, offer.uid) !== null) continue;
    launch(state, rng, { ...plan, contractId: offer.uid });
    return true;
  }
  return false;
}

function startFrameworkVersion(state: GameState, memory: Memory, reserve: number): boolean {
  if (state.framework.version > 0 && memory.modelsSinceFramework < PLAY.modelsPerFramework) return false;
  const ids: string[] = [];
  let cost = 0;
  for (const feature of availableFeatures(state)) {
    const price = featureCost(state, feature);
    if (cost + price <= state.money - reserve) {
      ids.push(feature.id);
      cost += price;
    }
  }
  if (ids.length === 0 || startFramework(state, ids, defaultFrameworkName(state)) !== null) return false;
  memory.modelsSinceFramework = 0;
  return true;
}

function startVersion(state: GameState, rng: Rng): boolean {
  if (state.framework.features.length === 0 || !rng.chance(PLAY.expansionChance)) return false;
  for (const type of EXPANSION_ORDER) {
    for (const base of state.models) {
      if (base.rating < PLAY.expansionRating || canExpand(state, base.id, type) !== null) continue;
      if (startExpansion(state, base.id, type, rng, '') !== null) continue;
      const project = state.project;
      if (project) tuneSliders(state, project);
      return true;
    }
  }
  return false;
}

function startModel(state: GameState, rng: Rng, reserve: number): void {
  const domain = chooseDomain(state, rng);
  if (!domain) return;
  const paradigm = chooseParadigm(state, domain, rng);
  const platform = choosePlatform(state)?.id;
  if (!paradigm || !platform) return;
  const input: ModelInput = { name: '', domain: domain.id, paradigm, platform, scale: chooseScale(state, Infinity, reserve).id, gpu: state.gpu };
  if (validateModel(state, input) === null) launch(state, rng, input);
}

function manageProject(state: GameState, rng: Rng, memory: Memory, reserve: number): void {
  const project = state.project;
  if (project) {
    // стабилизация: бот чинит деградации, но не засиживается; заказ и так впритык — выпускает сразу
    if (project.kind !== 'framework' && project.phase >= DEV_PHASES) {
      const open = project.degradations.some((d) => d.fixed < 1);
      const contract = project.contractId === null ? undefined : state.contracts.active.find((c) => c.uid === project.contractId);
      const due = contract ? contract.deadlineWeek - state.week : Infinity;
      if (open && (memory.stabilizationWeeks >= PLAY.stabilizationPatience || due <= 1)) releaseNow(state, rng, noEvents);
    }
    return;
  }
  if (rng.chance(PLAY.contractShare) && startContract(state, rng, reserve)) return;
  if (startFrameworkVersion(state, memory, reserve)) return;
  if (startVersion(state, rng)) return;
  startModel(state, rng, reserve);
}

function act(state: GameState, rng: Rng, memory: Memory, reserve: number): void {
  manageMoney(state, reserve);
  manageTeam(state, rng, reserve);
  manageResearch(state);
  manageSpend(state, reserve);
  manageProject(state, rng, memory, reserve);
}

function snapshot(state: GameState, income: number, costs: number): BotYear {
  const s = state.stats;
  return {
    year: yearOf(state.week),
    money: state.money,
    fans: state.fans,
    staff: state.staff.length,
    office: state.office,
    releases: s.releases,
    bestRating: s.bestRating,
    income,
    costs,
    research: s.researchDone,
    achievements: state.achievements.length,
  };
}

/** играет партию от 2012 года заданное число недель; возвращает итог и срез по годам */
export function runBot(seed: number, weeks = 28 * 52): BotRun {
  let game = createGame('Бот Лабс', 'Бот', seed);
  game.tutorial = { active: false, step: 0 };
  const years: BotYear[] = [];
  const memory: Memory = { stabilizationWeeks: 0, modelsSinceFramework: 0 };
  let minMoney = game.money;
  let income = 0;
  let costs = 0;
  let yearWeeks = 0;

  for (let i = 0; i < weeks && !game.gameover; i++) {
    const project = game.project;
    if (project && project.kind !== 'framework' && project.phase >= DEV_PHASES) memory.stabilizationWeeks++;
    else memory.stabilizationWeeks = 0;

    const rng = new Rng(game.rng);
    act(game, rng, memory, weeklyCosts(game).total * PLAY.keepWeeks);
    game.rng = rng.state;

    game = advanceWeek(game).state;
    if (project && project.kind !== 'framework' && game.project === null) memory.modelsSinceFramework++;

    const last = game.finance[game.finance.length - 1];
    if (last) {
      income += last.income;
      costs += last.expenses;
      yearWeeks++;
    }
    minMoney = Math.min(minMoney, game.money);
    if (weekOfYear(game.week) === 0 && yearWeeks > 0) {
      years.push(snapshot(game, income / yearWeeks, costs / yearWeeks));
      income = 0;
      costs = 0;
      yearWeeks = 0;
    }
  }
  return { game, years, bankruptWeek: game.gameover?.week ?? null, minMoney };
}
