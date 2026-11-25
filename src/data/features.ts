import type { Feature } from '../types';

// Функции собственного фреймворка. weeks и cost — сколько недель и денег уходит на встраивание
// функции в новую версию фреймворка. speed и quality — прибавка к множителям, bugReduce и
// bugTags — доля снижения деградаций, gpuCost — доля снижения цены GPU-часов.
export const FEATURES: Feature[] = [
  { id: 'autodiff', name: 'Автодифф', icon: 'wrench', desc: 'Градиенты для любого графа вычислений.', research: 'fw-autodiff', weeks: 2, cost: 6000, speed: 0.06 },
  { id: 'track', name: 'Трекинг экспериментов', icon: 'doc', desc: 'Каждый прогон логируется: результаты не теряются.', research: 'fw-track', weeks: 1, cost: 4000, bugReduce: 0.06, rp: 0.08 },
  { id: 'earlystop', name: 'Ранняя остановка', icon: 'clock', desc: 'Обучение останавливается, пока модель не начала зубрить.', research: 'fw-earlystop', weeks: 1, cost: 6000, bugTags: { training: 0.3 } },
  { id: 'datapipeline', name: 'Пайплайны данных', icon: 'filter', desc: 'Загрузка и перемешивание данных без узких мест.', research: 'fw-datapipeline', weeks: 2, cost: 8000, speed: 0.06, bugTags: { data: 0.15 } },
  { id: 'mixed', name: 'Смешанная точность', icon: 'layers', desc: 'Половина бит — вдвое быстрее обучение.', research: 'fw-mixed', weeks: 2, cost: 20000, speed: 0.08, gpuCost: 0.1 },
  { id: 'dist', name: 'Распределённый трейнинг', icon: 'server', desc: 'Учимся на десятках ускорителей одновременно.', research: 'fw-dist', weeks: 3, cost: 45000, speed: 0.12, affinity: { paradigms: ['transformer', 'moe', 'diffusion', 'worldmodel'], bonus: 0.05 } },
  { id: 'compile', name: 'Компиляция графов', icon: 'code', desc: 'Граф модели превращается в быстрый машинный код.', research: 'fw-compile', weeks: 3, cost: 60000, speed: 0.12, quality: 0.04 },
  { id: 'quant', name: 'Квантование', icon: 'chip', desc: 'Веса в восемь бит: модель легче и быстрее.', research: 'fw-quant', weeks: 2, cost: 30000, gpuCost: 0.08, platforms: ['mobile', 'edge'] },
  { id: 'auglib', name: 'Библиотека аугментаций', icon: 'image', desc: 'Готовые преобразования для любых типов данных.', research: 'fw-auglib', weeks: 2, cost: 9000, quality: 0.05, affinity: { groups: ['vision', 'speech'], bonus: 0.05 } },
  { id: 'eval', name: 'Авто-бенчмарки', icon: 'target', desc: 'Набор тестов прогоняется после каждого изменения.', research: 'fw-eval', weeks: 2, cost: 18000, bugReduce: 0.1 },
  { id: 'prune', name: 'Прунинг', icon: 'filter', desc: 'Лишние связи отрезаются без потери качества.', research: 'fw-prune', weeks: 1, cost: 16000, gpuCost: 0.05, quality: 0.03 },
  { id: 'sched', name: 'Планировщик задач', icon: 'calendar', desc: 'Кластер никогда не простаивает.', research: 'fw-sched', weeks: 2, cost: 22000, speed: 0.08 },
  { id: 'export', name: 'Экспорт моделей', icon: 'download', desc: 'Одна модель упакуется под любую платформу.', research: 'fw-export', weeks: 2, cost: 24000, platforms: ['mobile', 'edge', 'robots'] },
  { id: 'serve', name: 'Оптимизированный сервинг', icon: 'cloud', desc: 'Батчирование запросов и прогретые ядра инференса.', research: 'fw-serve', weeks: 2, cost: 40000, quality: 0.08, bugTags: { serving: 0.25 } },
  { id: 'federated', name: 'Федеративное обучение', icon: 'globe', desc: 'Модель учится на данных клиентов, не покидая их серверы.', research: 'fw-federated', weeks: 3, cost: 70000, quality: 0.06, bugTags: { data: 0.15 }, affinity: { groups: ['science', 'tabular'], bonus: 0.05 } },
  { id: 'shard', name: 'Шардирование моделей', icon: 'mix', desc: 'Большая модель режется на части и живёт на многих узлах.', research: 'fw-shard', weeks: 3, cost: 90000, speed: 0.08, gpuCost: 0.08 },
  { id: 'synth', name: 'Синтетические данные', icon: 'spark', desc: 'Недостающие примеры генерирует сама лаборатория.', research: 'fw-synth', weeks: 3, cost: 80000, quality: 0.08, bugTags: { data: 0.2 } },
  { id: 'cache', name: 'Кэш инференса', icon: 'stack', desc: 'Повторяющиеся запросы не считаются заново.', research: 'fw-cache', weeks: 2, cost: 60000, quality: 0.1, gpuCost: 0.1, affinity: { paradigms: ['transformer', 'moe', 'hybrid'], bonus: 0.05 } },
  { id: 'distill', name: 'Дистилляция знаний', icon: 'copy', desc: 'Большая модель учит маленькую почти без потери качества. Открывает Mini-версии.', research: 'fw-distill', weeks: 3, cost: 110000, expansion: 'mini' },
  { id: 'guard', name: 'Фильтры вывода', icon: 'shield', desc: 'Вредные ответы не покидают контур модели.', research: 'fw-guard', weeks: 2, cost: 60000, bugTags: { safety: 0.3, product: 0.1 } },
  { id: 'lora', name: 'LoRA-адаптеры', icon: 'link', desc: 'Дообучение под задачу за часы вместо недель. Открывает файнтюны.', research: 'fw-lora', weeks: 3, cost: 120000, speed: 0.08, expansion: 'finetune' },
  { id: 'rlhf', name: 'Пайплайн RLHF', icon: 'shieldCheck', desc: 'Выравнивание по человеческим предпочтениям на конвейере.', research: 'fw-rlhf', weeks: 4, cost: 180000, quality: 0.15, bugTags: { safety: 0.4 }, affinity: { groups: ['language', 'generative'], bonus: 0.08 } },
];

export const FEATURE_BY_ID: Record<string, Feature> = Object.fromEntries(FEATURES.map((f) => [f.id, f]));

export function featureById(id: string): Feature | undefined {
  return FEATURE_BY_ID[id];
}
