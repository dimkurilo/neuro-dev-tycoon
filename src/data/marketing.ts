import type { CampaignDef } from '../types';

// Маркетинговые кампании: разгоняют хайп до релиза. Одновременно идёт одна кампания.
// hype — прирост хайпа за неделю, fans — цитируемость за неделю, rp — исследовательские очки за неделю.
export const CAMPAIGNS: CampaignDef[] = [
  { id: 'teaser', name: 'Тизер в соцсетях', icon: 'megaphone', desc: 'Короткий ролик о будущей модели.', cost: 3000, weeks: 2, hype: 6, fans: 5, rp: 0, research: 'mkt-social', minFans: 0 },
  { id: 'paper', name: 'Препринт', icon: 'doc', desc: 'Технический отчёт для коллег по цеху.', cost: 6000, weeks: 2, hype: 5, fans: 30, rp: 10, research: 'mkt-social', minFans: 0 },
  { id: 'conf', name: 'Стенд на конференции', icon: 'globe', desc: 'Живые демонстрации для посетителей.', cost: 20000, weeks: 3, hype: 9, fans: 40, rp: 0, research: 'mkt-pr', minFans: 100 },
  { id: 'ads', name: 'Таргетированная реклама', icon: 'target', desc: 'Платная реклама в лентах и приложениях.', cost: 25000, weeks: 4, hype: 7, fans: 60, rp: 0, research: 'mkt-pr', minFans: 100 },
  { id: 'partner', name: 'Блогеры и обзоры', icon: 'chat', desc: 'Популярные авторы пробуют модель в деле.', cost: 40000, weeks: 3, hype: 11, fans: 90, rp: 0, research: 'mkt-pr', minFans: 300 },
  { id: 'talk', name: 'Ключевой доклад', icon: 'mic', desc: 'Выход на большую сцену перед всей отраслью.', cost: 45000, weeks: 3, hype: 14, fans: 120, rp: 5, research: 'mkt-show', minFans: 500 },
  { id: 'series', name: 'Серия публикаций', icon: 'news', desc: 'Цикл разборов в отраслевых изданиях.', cost: 30000, weeks: 4, hype: 8, fans: 150, rp: 15, research: 'mkt-show', minFans: 500 },
  { id: 'viral', name: 'Вирусное демо', icon: 'bolt', desc: 'Одно видео, которое расходится по всем чатам.', cost: 60000, weeks: 2, hype: 20, fans: 200, rp: 0, research: 'mkt-show', minFans: 1000 },
  { id: 'roadshow', name: 'Роуд-шоу', icon: 'pin', desc: 'Серия встреч с клиентами в десяти городах.', cost: 90000, weeks: 4, hype: 13, fans: 250, rp: 0, research: 'mkt-show', minFans: 2000 },
];

export const CAMPAIGN_BY_ID: Record<string, CampaignDef> = Object.fromEntries(CAMPAIGNS.map((c) => [c.id, c]));

export function campaignById(id: string): CampaignDef | undefined {
  return CAMPAIGN_BY_ID[id];
}
