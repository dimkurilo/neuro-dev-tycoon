import type { DegTag, DegradationType, Severity } from '../types';
import { BALANCE } from './balance';

// Деградации — то, что ломается в модели по ходу разработки (аналог багов).
// fields — сродство к полям: откуда деградация чаще всего вылезает.
export const DEGRADATIONS: DegradationType[] = [
  { id: 'hallucination', name: 'Галлюцинации', tag: 'product', desc: 'Модель уверенно выдумывает то, чего нет в данных.', fields: { task: 3, loss: 2, alignment: 2, interface: 1 } },
  { id: 'overfit', name: 'Переобучение', tag: 'training', desc: 'На обучающей выборке идеально, на новых данных — плохо.', fields: { dataset: 2, hyperparams: 3, augmentation: 3, architecture: 1 } },
  { id: 'leak', name: 'Утечка данных', tag: 'data', desc: 'В весах модели остались фрагменты приватных данных.', fields: { dataSources: 3, dataset: 3, alignment: 1 } },
  { id: 'forgetting', name: 'Катастрофическое забывание', tag: 'training', desc: 'Дообучили на новом — модель разучилась со старым.', fields: { architecture: 2, hyperparams: 2, task: 2 } },
  { id: 'drift', name: 'Дрейф распределения', tag: 'serving', desc: 'В продакшене данные не такие, как в обучении: качество плывёт.', fields: { dataset: 2, inference: 3, dataSources: 1 } },
  { id: 'bias', name: 'Смещение выборки', tag: 'data', desc: 'Данные перекошены: модель систематически ошибается на части случаев.', fields: { dataSources: 3, dataset: 3, task: 1 } },
  { id: 'latency', name: 'Задержки инференса', tag: 'serving', desc: 'Отвечает слишком медленно для продакшена.', fields: { inference: 3, architecture: 1, interface: 1 } },
  { id: 'nondet', name: 'Недетерминированность', tag: 'product', desc: 'На один и тот же запрос — разные ответы.', fields: { inference: 2, interface: 2, augmentation: 1, hyperparams: 1 } },
  { id: 'toxicity', name: 'Токсичный вывод', tag: 'safety', desc: 'Модель может выдать вредный или оскорбительный ответ.', fields: { alignment: 3, dataSources: 1, loss: 1 } },
  { id: 'explode', name: 'Взрыв градиентов', tag: 'training', desc: 'Обучение падает: потери улетают в бесконечность.', fields: { hyperparams: 3, loss: 2, architecture: 1 } },
  { id: 'oom', name: 'Переполнение памяти', tag: 'serving', desc: 'Модель не влезает в память ускорителя.', fields: { architecture: 2, inference: 2, dataset: 1 } },
  { id: 'evalleak', name: 'Подтекание теста', tag: 'data', desc: 'Данные бенчмарка случайно попали в обучение.', fields: { dataset: 3, task: 2, dataSources: 1 } },
];

export const DEGRADATION_BY_ID: Record<string, DegradationType> = Object.fromEntries(DEGRADATIONS.map((x) => [x.id, x]));

export const DEG_TAGS: DegTag[] = ['data', 'training', 'safety', 'serving', 'product'];

export const DEG_TAG_LABEL: Record<DegTag, string> = {
  data: 'Данные',
  training: 'Обучение',
  safety: 'Безопасность',
  serving: 'Обслуживание',
  product: 'Продукт',
};

export const SEVERITY_LABEL: Record<Severity, string> = { low: 'лёгкая', mid: 'средняя', high: 'тяжёлая' };

/** сколько «очков исправления» стоит деградация такой тяжести */
export function severityPoints(severity: Severity): number {
  return BALANCE.project.severityPoints[severity];
}

/** штраф к качеству за неисправленную деградацию */
export function degradationPenalty(severity: Severity): number {
  return BALANCE.quality.degradationPenalty[severity];
}
