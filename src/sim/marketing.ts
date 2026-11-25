import type { CampaignDef, GameState, SimEvent } from '../types';
import { CAMPAIGNS } from '../data/marketing';
import { licensePrice } from './market';
import { isResearchDone } from './unlock';

export function campaignById(id: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}

export function campaignPrice(state: GameState, def: CampaignDef): number {
  return licensePrice(state, def.cost);
}

/** кампании, открытые исследованиями */
export function campaignsAvailable(state: GameState): CampaignDef[] {
  return CAMPAIGNS.filter((c) => isResearchDone(state, c.research));
}

export function campaignWeeksLeft(state: GameState): number {
  return state.campaign ? Math.max(0, state.campaign.endsWeek - state.week) : 0;
}

/** почему кампанию нельзя запустить; null — можно */
export function canCampaign(state: GameState, id: string): string | null {
  const def = campaignById(id);
  if (!def) return 'Неизвестная кампания';
  if (state.campaign) return 'Уже идёт кампания — дождитесь её окончания';
  if (!isResearchDone(state, def.research)) return 'Кампания ещё не открыта в лаборатории';
  if (state.fans < def.minFans) return `Нужно цитирований: ${def.minFans.toLocaleString('ru-RU')}`;
  const price = campaignPrice(state, def);
  if (state.money < price) return 'Недостаточно денег';
  return null;
}

/** запускает кампанию: деньги списываются сразу, хайп растёт каждую неделю */
export function startCampaign(state: GameState, id: string): string | null {
  const error = canCampaign(state, id);
  if (error) return error;
  const def = campaignById(id);
  if (!def) return 'Неизвестная кампания';
  state.money -= campaignPrice(state, def);
  state.campaign = { id, startedWeek: state.week, endsWeek: state.week + def.weeks };
  state.stats = { ...state.stats, campaigns: state.stats.campaigns + 1 };
  return null;
}

/** недельный шаг: кампания даёт хайп и цитируемость, пока не закончится */
export function runMarketing(state: GameState, events: SimEvent[]): void {
  const active = state.campaign;
  if (!active) return;
  const def = campaignById(active.id);
  if (!def) {
    state.campaign = null;
    return;
  }
  state.hype = Math.min(100, state.hype + def.hype);
  state.fans += def.fans;
  state.rp += def.rp;
  if (state.week >= active.endsWeek) {
    state.campaign = null;
    state.campaignsDone = state.campaignsDone.includes(def.id) ? state.campaignsDone : [...state.campaignsDone, def.id];
    events.push({ type: 'toast', text: `Кампания «${def.name}» завершена`, tone: 'info' });
  }
}
