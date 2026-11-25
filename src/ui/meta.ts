import type { EventCategory, TabId } from '../types';
import type { IconName } from './icons';

export const CATEGORY_META: Record<EventCategory, { icon: IconName; label: string; color: string }> = {
  research: { icon: 'flask', label: 'Наука', color: '#b89dff' },
  market: { icon: 'trend', label: 'Рынок', color: '#3ddc84' },
  platform: { icon: 'layers', label: 'Платформы', color: '#41d4f0' },
  gpu: { icon: 'chip', label: 'Вычисления', color: '#ffb020' },
  regulation: { icon: 'scale', label: 'Регулирование', color: '#ff5a6e' },
  industry: { icon: 'factory', label: 'Индустрия', color: '#f2a65a' },
  hype: { icon: 'megaphone', label: 'Хайп', color: '#ff7eb6' },
};

export const TAB_LABELS: Record<TabId, string> = {
  project: 'Проект',
  lab: 'Лаборатория',
  team: 'Команда',
  office: 'Офис',
  market: 'Рынок',
  more: 'Ещё',
};
