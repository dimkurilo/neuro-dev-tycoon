import type { Lab } from '../types';

// Лаборатории-конкуренты: время от времени выпускают модели и попадают в чарты и лидерборд.
// bias — насколько их модели в среднем сильнее (или слабее) рыночных.
export const LABS: Lab[] = [
  { id: 'l-cortex', name: 'Кортекс', color: '#5ad1a5', bias: 0.9, domains: ['vision', 'nlp', 'dialog'] },
  { id: 'l-synapse', name: 'Синапсити', color: '#6aa9ff', bias: 0.6, domains: ['nlp', 'translate', 'search'] },
  { id: 'l-gradient', name: 'Градиент', color: '#c39bff', bias: 0.4, domains: ['imgen', 'music', 'vidgen'] },
  { id: 'l-tensor', name: 'ТензорХаус', color: '#ffb36b', bias: 0.5, domains: ['recsys', 'forecast', 'credit'] },
  { id: 'l-impulse', name: 'Импульс', color: '#ff8c7a', bias: 0.1, domains: ['robotics', 'autodrive', 'agents'] },
  { id: 'l-axon', name: 'Аксон', color: '#4fd3e8', bias: 0.2, domains: ['speech', 'tts', 'audio'] },
  { id: 'l-dendrite', name: 'Дендрит', color: '#9bd35e', bias: -0.1, domains: ['agro', 'geology', 'climate'] },
  { id: 'l-loss', name: 'Функция Потерь', color: '#ffd866', bias: -0.3, domains: ['sport', 'games', 'fitness'] },
  { id: 'l-layer', name: 'Слои и Слои', color: '#e79bff', bias: 0.3, domains: ['meddiag', 'biotech', 'chem'] },
  { id: 'l-backprop', name: 'Бэктика', color: '#7fa7ff', bias: -0.2, domains: ['security', 'fraud', 'content'] },
  { id: 'l-softmax', name: 'Софтмакс', color: '#f2a65a', bias: 0.7, domains: ['code', 'education', 'legal'] },
  { id: 'l-latent', name: 'Латентное', color: '#ff7eb6', bias: 0, domains: ['imgfilter', 'avatar', 'arch'] },
];

export const LAB_BY_ID: Record<string, Lab> = Object.fromEntries(LABS.map((l) => [l.id, l]));

/** названия моделей конкурентов: имя лаборатории + поколение */
export function rivalModelName(lab: Lab, serial: number): string {
  return `${lab.name}-${serial}`;
}

export const INVESTORS = [
  { name: 'Фонд «Каскад»', desc: 'Венчурный фонд, любит ранние стадии.' },
  { name: 'Фонд «Градиент»', desc: 'Инвестирует в исследовательские лаборатории.' },
  { name: 'Бизнес-ангел Аркадий Лучин', desc: 'Бывший основатель, заходит своими деньгами.' },
  { name: 'Фонд «Импульс»', desc: 'Быстрые сделки, доля повыше.' },
  { name: 'Фонд «Аттеншн Капитал»', desc: 'Делает ставку на трансформеры и их наследников.' },
];

export const GRANT_FUNDS = [
  { name: 'Фонд «Содействие науке»', desc: 'Поддерживает открытые исследования.' },
  { name: 'Национальный грантовый офис', desc: 'Государственные гранты под конкретные задачи.' },
  { name: 'Фонд «Открытые данные»', desc: 'Финансирует модели в общественно значимых доменах.' },
  { name: 'Институт перспективных исследований', desc: 'Деньги на смелые связки доменов и парадигм.' },
];
