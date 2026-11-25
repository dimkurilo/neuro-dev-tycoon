import type { BoostDef } from '../types';

// Бусты — разовые или временные усилители за деньги. research открывает буст через лабораторию.
// speed и points — прибавка к множителю очков, gpuCost — доля снижения цены GPU-часов,
// burnout < 0 — на сколько пунктов в неделю снижается выгорание, burnoutRate — во сколько раз оно растёт быстрее.
export const BOOSTS: BoostDef[] = [
  { id: 'coffee', name: 'Кофемашина на неделю', icon: 'coffee', desc: '+10% к скорости на 4 недели, но команда выгорает в полтора раза быстрее.', cost: 1500, weeks: 4, research: null, speed: 0.1, burnoutRate: 0.5 },
  { id: 'pizza', name: 'Пицца по пятницам', icon: 'pizza', desc: 'Выгорание снижается на 2 пункта в неделю.', cost: 2500, weeks: 4, research: null, burnout: -2 },
  { id: 'standup', name: 'Стендапы', icon: 'chat', desc: '+6% к скорости на 6 недель.', cost: 6000, weeks: 6, research: null, speed: 0.06 },
  { id: 'journals', name: 'Подписка на журналы', icon: 'library', desc: '+20% к исследовательским очкам на 8 недель.', cost: 5000, weeks: 8, research: null, rp: 0.2 },
  { id: 'audit', name: 'Внешний аудит', icon: 'search', desc: 'Разово исправляет 4 единицы деградаций в текущем проекте.', cost: 15000, weeks: 0, research: null, instant: 'fix', instantValue: 4 },
  { id: 'hackathon', name: 'Внутренний хакатон', icon: 'bolt', desc: 'Разово даёт 30 исследовательских очков.', cost: 10000, weeks: 0, research: null, instant: 'rp', instantValue: 30 },
  { id: 'headhunt', name: 'Хедхантер', icon: 'team', desc: 'Разово подбирает кандидатов на уровень сильнее обычного.', cost: 12000, weeks: 0, research: null, instant: 'candidates', instantValue: 1 },
  { id: 'gpu-boost', name: 'Ночной кластер', icon: 'chip', desc: '+15% очков на 3 недели.', cost: 12000, weeks: 3, research: 'boost-cluster', speed: 0.15 },
  { id: 'cloud', name: 'Облачный кредит', icon: 'cloud', desc: '−30% к стоимости GPU-часов на 8 недель.', cost: 15000, weeks: 8, research: 'boost-cluster', gpuCost: 0.3 },
  { id: 'retreat', name: 'Выезд на природу', icon: 'leaf', desc: 'Выгорание снижается на 3 пункта в неделю.', cost: 20000, weeks: 3, research: 'boost-club', burnout: -3 },
  { id: 'wellness', name: 'Психолог для команды', icon: 'heart', desc: 'Выгорание снижается на 1,5 пункта в неделю.', cost: 18000, weeks: 6, research: 'boost-club', burnout: -1.5 },
  { id: 'bonuses', name: 'Квартальные бонусы', icon: 'coin', desc: '+8% к скорости и чуть меньше выгорания.', cost: 30000, weeks: 4, research: 'boost-club', speed: 0.08, burnout: -1 },
];

export const BOOST_BY_ID: Record<string, BoostDef> = Object.fromEntries(BOOSTS.map((b) => [b.id, b]));

export function boostById(id: string): BoostDef | undefined {
  return BOOST_BY_ID[id];
}

/** сколько недель ещё действует активный буст */
export function boostWeeksLeft(endsWeek: number, week: number): number {
  return Math.max(0, endsWeek - week);
}
