import type { FieldDef, FieldId, Phase } from '../types';

/** три фазы разработки и фаза стабилизации */
export const PHASE_NAMES = ['Замысел', 'Обучение', 'Продукт'] as const;
export const STABILIZATION_NAME = 'Стабилизация';
export const DEV_PHASES = 3;

export const FIELDS: FieldDef[] = [
  { id: 'architecture', name: 'Архитектура', phase: 0, hint: 'Как устроена сеть: слои, связи, размеры', weight: 1.2 },
  { id: 'dataSources', name: 'Источники данных', phase: 0, hint: 'Откуда берутся данные и насколько они полны', weight: 1 },
  { id: 'task', name: 'Постановка задачи', phase: 0, hint: 'Что именно и по каким метрикам модель должна решать', weight: 1.2 },
  { id: 'dataset', name: 'Датасет', phase: 1, hint: 'Сборка, разметка и очистка обучающей выборки', weight: 1.1 },
  { id: 'hyperparams', name: 'Гиперпараметры', phase: 1, hint: 'Скорость обучения, размер батча, регуляризация', weight: 1 },
  { id: 'augmentation', name: 'Аугментации', phase: 1, hint: 'Искусственное разнообразие примеров', weight: 0.9 },
  { id: 'loss', name: 'Функция потерь', phase: 1, hint: 'Что модель считает ошибкой', weight: 1.1 },
  { id: 'alignment', name: 'RLHF и safety', phase: 2, hint: 'Выравнивание поведения и защита от вредного вывода', weight: 1 },
  { id: 'inference', name: 'Инференс', phase: 2, hint: 'Скорость и стоимость работы модели', weight: 1.1 },
  { id: 'interface', name: 'Интерфейс', phase: 2, hint: 'То, с чем сталкивается пользователь', weight: 1 },
];

export const FIELD_IDS: FieldId[] = FIELDS.map((f) => f.id);

export function fieldsOfPhase(phase: 0 | 1 | 2): FieldDef[] {
  return FIELDS.filter((f) => f.phase === phase);
}

/** общая длительность фаз разработки в неделях */
export function phaseWeeksTotal(weeks: [number, number, number]): number {
  return weeks[0] + weeks[1] + weeks[2];
}

/** название текущей фазы проекта */
export function phaseName(phase: Phase): string {
  return phase < DEV_PHASES ? PHASE_NAMES[phase as 0 | 1 | 2] : STABILIZATION_NAME;
}
