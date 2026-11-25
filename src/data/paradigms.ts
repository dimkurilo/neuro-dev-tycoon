import type { FieldId, Paradigm } from '../types';
import type { IconName } from '../ui/icons';

// bias — сдвиг идеальной доли исследований по полям: «+» значит «здесь нужна наука», «−» — инженерия.
const NONE: Record<FieldId, number> = {
  architecture: 0,
  dataSources: 0,
  task: 0,
  dataset: 0,
  hyperparams: 0,
  augmentation: 0,
  loss: 0,
  alignment: 0,
  inference: 0,
  interface: 0,
};

function p(id: string, name: string, icon: IconName, desc: string, research: string | null, year: number, bias: Partial<Record<FieldId, number>>): Paradigm {
  return { id, name, icon, desc, research, year, bias: { ...NONE, ...bias } };
}

export const PARADIGMS: Paradigm[] = [
  p('classical', 'Классический ML', 'layers', 'Градиентный бустинг, случайный лес, метод опорных векторов. Старая школа, которая всё ещё работает.', null, 2012, {
    architecture: -0.2,
    dataset: -0.05,
    hyperparams: 0.1,
    loss: -0.1,
    alignment: -0.15,
    inference: 0.05,
    interface: 0,
  }),
  p('rnn', 'Рекуррентные сети', 'loop', 'RNN и seq2seq: сети, которые читают последовательность шаг за шагом.', null, 2012, {
    architecture: 0.05,
    hyperparams: 0.2,
    inference: -0.05,
  }),
  p('symbolic', 'Символьный ИИ', 'braces', 'Экспертные системы и логический вывод. Правила пишут люди, а не градиент.', null, 2012, {
    architecture: -0.3,
    dataset: -0.25,
    hyperparams: -0.3,
    augmentation: -0.3,
    loss: -0.25,
    task: 0.25,
    alignment: 0.1,
    inference: 0.1,
  }),
  p('bayes', 'Байесовские сети', 'curve', 'Вероятностные модели с явно заданными зависимостями между величинами.', null, 2012, {
    architecture: -0.1,
    dataset: -0.1,
    augmentation: -0.25,
    hyperparams: -0.1,
    task: 0.2,
    inference: 0.1,
  }),
  p('neuroevo', 'Нейроэволюция', 'tree', 'Архитектуры и веса отбираются эволюцией, а не обратным распространением.', null, 2012, {
    hyperparams: 0.2,
    loss: -0.15,
    alignment: -0.05,
  }),
  p('cnn', 'Свёрточные сети', 'grid', 'CNN: иерархии фильтров, которые учатся видеть.', 'p-cnn', 2012, {
    architecture: 0.05,
    augmentation: -0.15,
    inference: -0.1,
  }),
  p('rl', 'Обучение с подкреплением', 'flag', 'RL: агент учится на наградах методом проб и ошибок.', 'p-rl', 2012, {
    task: 0.25,
    loss: 0.1,
    alignment: 0.05,
  }),
  p('gan', 'Состязательные сети', 'compare', 'GAN: генератор и дискриминатор соревнуются друг с другом.', 'p-gan', 2014, {
    loss: 0.2,
    hyperparams: 0.2,
    alignment: 0.05,
  }),
  p('transformer', 'Трансформер', 'target', 'Внимание к контексту: одна архитектура для текста, картинки и звука.', 'p-transformer', 2017, {
    architecture: 0.2,
    dataset: -0.1,
    hyperparams: 0.05,
    loss: 0.05,
  }),
  p('gnn', 'Графовые сети', 'nodes', 'GNN: обучение на графах — молекулах, сетях, социальных связях.', 'p-gnn', 2017, {
    architecture: 0.15,
    task: 0.05,
    dataset: -0.1,
  }),
  p('moe', 'Смесь экспертов', 'mix', 'MoE: много узких моделей-«эксптов» под общим маршрутизатором.', 'p-moe', 2018, {
    architecture: 0.2,
    hyperparams: 0.1,
    inference: 0.1,
  }),
  p('ssl', 'Самоконтроль', 'stack', 'Самоконтролируемое обучение: модель учится на неразмеченных данных.', 'p-ssl', 2018, {
    dataset: -0.2,
    loss: 0.15,
    augmentation: 0.1,
  }),
  p('hybrid', 'Мультимодальный гибрид', 'blend', 'Текст, картинка и звук в одной общей модели.', 'p-hybrid', 2019, {
    architecture: 0.15,
    dataset: -0.1,
    alignment: 0.1,
    interface: 0.05,
  }),
  p('diffusion', 'Диффузия', 'droplet', 'Диффузионные модели: картинка «проявляется» из чистого шума.', 'p-diffusion', 2020, {
    architecture: 0.1,
    loss: 0.2,
    inference: -0.1,
  }),
  p('worldmodel', 'Мировые модели', 'cube', 'Модель предсказывает, что будет дальше, и учится в собственном «воображении».', 'p-world', 2023, {
    architecture: 0.2,
    task: 0.15,
    dataset: -0.1,
    inference: 0.1,
  }),
];

export const PARADIGM_BY_ID: Record<string, Paradigm> = Object.fromEntries(PARADIGMS.map((x) => [x.id, x]));

export function paradigmById(id: string): Paradigm {
  return PARADIGM_BY_ID[id] ?? PARADIGMS[0];
}
