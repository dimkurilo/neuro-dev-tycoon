import type { FieldId, Fit, Scale, ScaleId } from '../types';
import { BALANCE } from './balance';
import { domainById } from './domains';
import { paradigmById } from './paradigms';

/** матрица совместимости домен × парадигма: идеально / норм / странно */
export function fitOf(domainId: string, paradigmId: string): Fit {
  const dom = domainById(domainId);
  if (dom.ideal.includes(paradigmId)) return 'ideal';
  if (dom.weird.includes(paradigmId)) return 'weird';
  return 'ok';
}

export const FIT_LABEL: Record<Fit, string> = { ideal: 'Идеально', ok: 'Нормально', weird: 'Странно' };

/** идеальная доля исследований в поле: базовые 50 % + профиль домена + профиль парадигмы */
export function idealShare(domainId: string, paradigmId: string, field: FieldId): number {
  const value = BALANCE.quality.shareBase + domainById(domainId).bias[field] + paradigmById(paradigmId).bias[field];
  return Math.min(BALANCE.quality.shareMax, Math.max(BALANCE.quality.shareMin, value));
}

export const SCALES: Scale[] = [
  { id: 'pet', name: 'Пет-проект', desc: 'Небольшая модель: быстро и дёшево.', weeks: [3, 4, 3], expected: 1000, research: null },
  { id: 'product', name: 'Продуктовая модель', desc: 'Серьёзный релиз для клиентов.', weeks: [5, 6, 5], expected: 2800, research: 'scale-product' },
  { id: 'flagship', name: 'Флагман', desc: 'Модель, претендующая на вершину чартов.', weeks: [8, 10, 8], expected: 7200, research: 'scale-flagship' },
];

export const SCALE_BY_ID: Record<ScaleId, Scale> = {
  pet: SCALES[0],
  product: SCALES[1],
  flagship: SCALES[2],
};

export function scaleById(id: string): Scale {
  return SCALE_BY_ID[id as ScaleId] ?? SCALES[0];
}
