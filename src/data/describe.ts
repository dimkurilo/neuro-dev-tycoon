import type { ResearchEffects, ResearchNode } from '../types';
import { DEG_TAG_LABEL } from './degradations';
import { domainById } from './domains';
import { paradigmById } from './paradigms';
import { featureById } from './features';
import { courseById } from './courses';
import { officeById } from './offices';
import { moduleById } from './modules';
import { campaignById } from './marketing';
import { boostById } from './boosts';
import { scaleById } from './compat';
import { platformById } from './platforms';
import type { Feature } from '../types';

const pct = (value: number) => `${Math.round(value * 100)}%`;

/** читаемое описание того, что даёт исследование */
export function describeEffects(node: ResearchNode): string[] {
  const e: ResearchEffects = node.effects;
  const out: string[] = [];
  const list = (label: string, names: readonly (string | undefined)[] | undefined) => {
    const clean = (names ?? []).filter((n): n is string => Boolean(n));
    if (clean.length > 0) out.push(`${label}: ${clean.join(', ')}`);
  };
  list('Парадигма', e.paradigms?.map((id) => paradigmById(id).name));
  list('Домен' + (e.domains && e.domains.length > 1 ? 'ы' : ''), e.domains?.map((id) => domainById(id).name));
  list('Функция фреймворка', e.features?.map((id) => featureById(id)?.name));
  list('Курс', e.courses?.map((id) => courseById(id)?.name));
  list('Офис', e.offices?.map((id) => officeById(id).name));
  list('Объект офиса', e.modules?.map((id) => moduleById(id)?.name));
  list('Масштаб', e.scales?.map((id) => scaleById(id).name));
  list('Кампания', e.campaigns?.map((id) => campaignById(id)?.name));
  list('Буст', e.boosts?.map((id) => boostById(id)?.name));
  if (e.speed) out.push(`Скорость разработки +${pct(e.speed)}`);
  if (e.quality) out.push(`Качество моделей +${pct(e.quality)}`);
  if (e.rp) out.push(`Исследовательские очки +${pct(e.rp)}`);
  if (e.bugReduce) out.push(`Деградаций меньше на ${pct(e.bugReduce)}`);
  if (e.bugTags) {
    for (const [tag, value] of Object.entries(e.bugTags)) {
      if (value) out.push(`Деградаций «${DEG_TAG_LABEL[tag as keyof typeof DEG_TAG_LABEL].toLowerCase()}» меньше на ${pct(value)}`);
    }
  }
  if (e.fixRate) out.push(`Скорость исправления +${pct(e.fixRate)}`);
  if (e.burnout) out.push(`Выгорание ${e.burnout > 0 ? '+' : '−'}${pct(Math.abs(e.burnout))}`);
  if (e.gpuCost) out.push(`Стоимость GPU-часов −${pct(e.gpuCost)}`);
  if (e.revenue) out.push(`Выручка +${pct(e.revenue)}`);
  if (e.maxContracts) out.push(`Контрактов одновременно: +${e.maxContracts}`);
  if (e.revealBalance === 1) out.push('Подсказки баланса для полей первой фазы');
  if (e.revealBalance === 2) out.push('Подсказки баланса для всех фаз');
  if (e.revealFit) out.push('Матрица совместимости доменов и парадигм');
  return out;
}

export const EXPANSION_LABEL: Record<'v2' | 'xl' | 'mini' | 'finetune', string> = {
  v2: 'Версия 2.0',
  xl: 'XL-версия',
  mini: 'Mini-версия',
  finetune: 'Файнтюн',
};

const pctFeature = (value: number) => `${Math.round(value * 100)}%`;

/** коротко: что даёт функция фреймворка */
export function describeFeature(feature: Feature): string {
  const out: string[] = [];
  if (feature.speed) out.push(`скорость +${pctFeature(feature.speed)}`);
  if (feature.quality) out.push(`качество +${pctFeature(feature.quality)}`);
  if (feature.rp) out.push(`И-очки +${pctFeature(feature.rp)}`);
  if (feature.bugReduce) out.push(`деградаций −${pctFeature(feature.bugReduce)}`);
  if (feature.gpuCost) out.push(`GPU-часы −${pctFeature(feature.gpuCost)}`);
  if (feature.bugTags) {
    for (const [tag, value] of Object.entries(feature.bugTags)) {
      if (value) out.push(`«${DEG_TAG_LABEL[tag as keyof typeof DEG_TAG_LABEL].toLowerCase()}» −${pctFeature(value)}`);
    }
  }
  if (feature.platforms) out.push(`бонус на: ${feature.platforms.map((id) => platformById(id).name.toLowerCase()).join(', ')}`);
  if (feature.affinity) out.push(`бонус для подходящих доменов и парадигм +${pctFeature(feature.affinity.bonus)}`);
  if (feature.expansion) out.push(`открывает версии: ${EXPANSION_LABEL[feature.expansion].toLowerCase()}`);
  return out.join(' · ');
}

