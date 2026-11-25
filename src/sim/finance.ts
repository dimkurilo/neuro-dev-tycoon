import type { GameState, SimEvent } from '../types';
import { BALANCE } from '../data/balance';
import { officeById } from '../data/offices';
import { gpuWeeklyCost } from './project';
import { yearsSince } from './time';
import { unlockAchievement } from './achievements';
import { objectsUpkeep } from './office';

export interface Costs {
  salaries: number;
  rent: number;
  gpu: number;
  interest: number;
  upkeep: number;
  total: number;
}

/** еженедельные расходы лаборатории */
export function weeklyCosts(state: GameState): Costs {
  let salaries = 0;
  for (const s of state.staff) salaries += s.salary;
  let interest = 0;
  for (const loan of state.loans) interest += loan.balance * loan.rate;
  const rent = officeById(state.office).rent;
  const gpu = gpuWeeklyCost(state);
  const upkeep = objectsUpkeep(state);
  return { salaries, rent, gpu, interest, upkeep, total: salaries + rent + gpu + interest + upkeep };
}

/** кредитный лимит: растёт вместе с рынком и цитируемостью */
export function maxLoan(state: GameState): number {
  const scale = Math.pow(BALANCE.growth.market, yearsSince(state.week));
  return (BALANCE.finance.loanMaxBase + state.fans * BALANCE.finance.loanMaxPerFan) * scale;
}

export function loanOutstanding(state: GameState): number {
  let sum = 0;
  for (const loan of state.loans) sum += loan.balance;
  return sum;
}

/** кредит можно взять несколькими частями */
export function takeLoan(state: GameState, amount: number): string | null {
  if (amount <= 0) return 'Укажите сумму';
  const room = maxLoan(state) - loanOutstanding(state);
  if (amount > room + 0.001) return 'Кредитный лимит исчерпан';
  state.loans = [...state.loans, { id: state.nextLoanId, balance: amount, rate: BALANCE.finance.loanRateWeekly, takenWeek: state.week }];
  state.nextLoanId += 1;
  state.money += amount;
  return null;
}

export function repayLoan(state: GameState, loanId: number, amount: number): string | null {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) return 'Кредит не найден';
  const sum = Math.min(amount, loan.balance);
  if (sum <= 0) return 'Нечего возвращать';
  if (sum > state.money) return 'Недостаточно денег';
  state.money -= sum;
  const balance = loan.balance - sum;
  state.loans = balance > 0.5 ? state.loans.map((l) => (l.id === loanId ? { ...l, balance } : l)) : state.loans.filter((l) => l.id !== loanId);
  return null;
}

/**
 * Итог недели: выручка минус расходы, запись в финансовую историю и проверка на банкротство.
 * Три недели подряд с отрицательным балансом — конец игры.
 */
export function runFinance(state: GameState, events: SimEvent[], income: number): void {
  const costs = weeklyCosts(state);
  state.money += income - costs.total;

  const s = state.stats;
  state.stats = {
    ...s,
    totalRevenue: s.totalRevenue + income,
    totalExpenses: s.totalExpenses + costs.total,
    peakMoney: Math.max(s.peakMoney, state.money),
    worstWeeklyLoss: Math.min(s.worstWeeklyLoss, income - costs.total),
    peakFans: Math.max(s.peakFans, state.fans),
  };

  const limit = BALANCE.market.financeHistory;
  state.finance = [...state.finance.slice(-(limit - 1)), { week: state.week, income, expenses: costs.total, hype: state.hype, fans: state.fans }];

  if (state.money < 0) {
    if (state.insolvency === 0) events.push({ type: 'insolvency', weeksLeft: BALANCE.finance.insolvencyLimit - 1 });
    state.insolvency += 1;
    if (state.insolvency >= BALANCE.finance.insolvencyLimit) {
      state.gameover = {
        reason: `Кредиторы подали в суд: баланс оставался отрицательным ${BALANCE.finance.insolvencyLimit} недели подряд.`,
        week: state.week,
      };
      state.speed = 0;
      events.push({ type: 'gameover' });
    }
  } else if (state.insolvency > 0) {
    state.insolvency = 0;
    events.push({ type: 'toast', text: 'Баланс вышел в плюс — угроза банкротства снята', tone: 'good' });
    unlockAchievement(state, events, 'recovered');
  }
}
