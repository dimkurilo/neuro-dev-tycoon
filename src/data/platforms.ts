import type { Platform } from '../types';
import { START_YEAR, WEEKS_PER_YEAR, yearsSince } from '../sim/time';

// Платформы деплоя. license — разовая плата за лицензию, share — доля выручки,
// которая остаётся лаборатории, curve — охват (install base, 0–100) по годам.
export const PLATFORMS: Platform[] = [
  {
    id: 'web',
    name: 'Веб / API',
    icon: 'globe',
    desc: 'Модель как облачный сервис: быстро запустить, большая аудитория.',
    license: 0,
    share: 0.85,
    year: 2012,
    research: null,
    curve: [
      { year: 2012, reach: 25 },
      { year: 2016, reach: 48 },
      { year: 2020, reach: 72 },
      { year: 2024, reach: 90 },
      { year: 2028, reach: 100 },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: 'briefcase',
    desc: 'Локальное развёртывание в корпорациях: дорогие клиенты, строгие требования.',
    license: 60000,
    share: 0.95,
    year: 2013,
    research: null,
    curve: [
      { year: 2013, reach: 12 },
      { year: 2018, reach: 40 },
      { year: 2024, reach: 70 },
      { year: 2032, reach: 90 },
    ],
  },
  {
    id: 'mobile',
    name: 'Мобайл',
    icon: 'phone',
    desc: 'Нейросеть работает прямо на телефоне, без сети.',
    license: 40000,
    share: 0.7,
    year: 2014,
    research: null,
    curve: [
      { year: 2014, reach: 5 },
      { year: 2018, reach: 70 },
      { year: 2023, reach: 95 },
      { year: 2030, reach: 85 },
      { year: 2036, reach: 60 },
      { year: 2040, reach: 50 },
    ],
  },
  {
    id: 'edge',
    name: 'Edge / IoT',
    icon: 'cube',
    desc: 'Камеры, датчики и умные устройства на периферии.',
    license: 120000,
    share: 0.65,
    year: 2016,
    research: null,
    curve: [
      { year: 2016, reach: 2 },
      { year: 2020, reach: 25 },
      { year: 2026, reach: 60 },
      { year: 2034, reach: 88 },
      { year: 2040, reach: 100 },
    ],
  },
  {
    id: 'robots',
    name: 'Роботы',
    icon: 'bot',
    desc: 'Встраиваемые системы: машины, дроны, манипуляторы.',
    license: 450000,
    share: 0.75,
    year: 2019,
    research: null,
    curve: [
      { year: 2019, reach: 1 },
      { year: 2023, reach: 8 },
      { year: 2028, reach: 32 },
      { year: 2034, reach: 70 },
      { year: 2040, reach: 100 },
    ],
  },
];

export const PLATFORM_BY_ID: Record<string, Platform> = Object.fromEntries(PLATFORMS.map((x) => [x.id, x]));

export function platformById(id: string): Platform {
  return PLATFORM_BY_ID[id] ?? PLATFORMS[0];
}

/** охват платформы (install base) в заданный год с линейной интерполяцией между точками */
export function platformReach(platform: Platform, week: number): number {
  const year = START_YEAR + yearsSince(week);
  const c = platform.curve;
  if (year <= c[0].year) return c[0].reach;
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1];
    const b = c[i];
    if (year <= b.year) return a.reach + ((year - a.year) / (b.year - a.year)) * (b.reach - a.reach);
  }
  return c[c.length - 1].reach;
}

export type Lifecycle = 'start' | 'growth' | 'maturity' | 'decline';

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  start: 'Старт',
  growth: 'Рост',
  maturity: 'Зрелость',
  decline: 'Спад',
};

/** стадия жизненного цикла по наклону кривой охвата */
export function platformLifecycle(platform: Platform, week: number): Lifecycle {
  const now = platformReach(platform, week);
  const before = platformReach(platform, week - WEEKS_PER_YEAR);
  const delta = now - before;
  if (now < 12) return 'start';
  if (delta < -1) return 'decline';
  if (delta > 3) return 'growth';
  return 'maturity';
}
