import type { Gpu } from '../types';

// Поколения ускорителей вымышленных вендоров: «Вектор», «Тензория», «Фотон».
// compute — множитель очков, weeklyCost — цена GPU-часов за неделю обучения (для масштаба «продукт»).
export const GPUS: Gpu[] = [
  { id: 'g0', name: 'Ноутбук основателя', vendor: '—', year: 2012, license: 0, compute: 1.0, weeklyCost: 0, desc: 'Греется, шумит, зато бесплатный.' },
  { id: 'g1', name: 'Вектор-4', vendor: 'Вектор', year: 2013, license: 25000, compute: 1.3, weeklyCost: 400, desc: 'Университетский кластер в аренду по ночам.' },
  { id: 'g2', name: 'Вектор-8', vendor: 'Вектор', year: 2016, license: 90000, compute: 1.7, weeklyCost: 900, desc: 'Первый кластер, который не нужно делить с аспирантами.' },
  { id: 'g3', name: 'Тензория V', vendor: 'Тензория', year: 2019, license: 260000, compute: 2.2, weeklyCost: 2000, desc: 'Тензорные ядра: обучение больших моделей перестаёт быть лотереей.' },
  { id: 'g4', name: 'Тензория X', vendor: 'Тензория', year: 2021, license: 700000, compute: 2.8, weeklyCost: 4500, desc: 'Смешанная точность из коробки и впятеро больше памяти.' },
  { id: 'g5', name: 'Тензория Ultra', vendor: 'Тензория', year: 2024, license: 1800000, compute: 3.5, weeklyCost: 10000, desc: 'Кластер целиком под вас: очередь на обучение исчезает.' },
  { id: 'g6', name: 'Фотон-1', vendor: 'Фотон', year: 2028, license: 4500000, compute: 4.4, weeklyCost: 24000, desc: 'Оптические ускорители: свет считается быстрее электричества.' },
  { id: 'g7', name: 'Фотон-2', vendor: 'Фотон', year: 2032, license: 11000000, compute: 5.4, weeklyCost: 55000, desc: 'Криогенный фотонный кластер. Шумит, как гаражный ноутбук, только громче.' },
];

export const GPU_BY_ID: Record<string, Gpu> = Object.fromEntries(GPUS.map((x) => [x.id, x]));

export function gpuById(id: string): Gpu {
  return GPU_BY_ID[id] ?? GPUS[0];
}
