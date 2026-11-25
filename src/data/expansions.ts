import type { ExpansionType, ScaleId } from '../types';

export interface ExpansionDef {
  id: ExpansionType;
  name: string;
  desc: string;
  /** множители к неделям и ожиданиям базового масштаба */
  weeksMult: number;
  expectedMult: number;
  /** множитель новой волны продаж базовой модели */
  waveMult: number;
  fansMult: number;
  /** функции фреймворка, которые должны быть собраны */
  requires: string[];
  /** минимальный масштаб базовой модели */
  minScale?: ScaleId;
  suffix: string;
}

// Версии моделей — аналог дополнений: короткий проект поверх выпущенной модели.
// Добавляет ей новую волну продаж и отдельную строку в чартах.
export const EXPANSIONS: Record<ExpansionType, ExpansionDef> = {
  v2: { id: 'v2', name: 'Версия 2.0', desc: 'Улучшенное переобучение: быстрее оригинала, ожидания чуть выше.', weeksMult: 0.7, expectedMult: 1.15, waveMult: 1.25, fansMult: 1.3, requires: [], suffix: ' 2.0' },
  mini: { id: 'mini', name: 'Mini-версия', desc: 'Дистиллированная копия: дёшево в разработке, скромнее в продажах, зато расширяет аудиторию. Нужна функция «Дистилляция знаний».', weeksMult: 0.8, expectedMult: 0.5, waveMult: 0.6, fansMult: 0.9, requires: ['distill'], suffix: ' Mini' },
  xl: { id: 'xl', name: 'XL-версия', desc: 'Модель в полтора раза серьёзнее: разработка дольше и дороже, зато продажи растут почти вдвое. Нужна функция «Шардирование моделей» и базовая модель не ниже продуктовой.', weeksMult: 1.3, expectedMult: 1.5, waveMult: 1.8, fansMult: 1.2, requires: ['shard'], minScale: 'product', suffix: ' XL' },
  finetune: { id: 'finetune', name: 'Файнтюн', desc: 'Быстрое дообучение под новую задачу: пара недель — и свежая волна продаж. Нужны «LoRA-адаптеры».', weeksMult: 0.35, expectedMult: 0.3, waveMult: 0.5, fansMult: 0.6, requires: ['lora'], suffix: ' FT' },
};

export const EXPANSION_ORDER: ExpansionType[] = ['v2', 'finetune', 'mini', 'xl'];
