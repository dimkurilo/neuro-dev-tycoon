import type { GameState } from '../types';
import { createGame } from './game';
import { reseat } from './office';

export const SAVE_MAGIC = 'NEURO-LAB-TYCOON';
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'neuro-lab-tycoon-save';

interface SaveFile {
  magic: string;
  version: number;
  savedAt: string;
  game: GameState;
}

/** текст сейва для пересылки: обычный JSON, читается любой версией игры не новее этой */
export function exportSave(game: GameState): string {
  const file: SaveFile = {
    magic: SAVE_MAGIC,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    game: { ...game, speed: 0 },
  };
  return JSON.stringify(file);
}

/**
 * Приводит сохранённое состояние к текущей схеме: недостающие поля берёт из новой игры,
 * неверные коллекции обнуляет. Возвращает null, если это вообще не сейв.
 */
export function normalizeGame(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.week !== 'number' || !Number.isFinite(r.week) || r.week < 0) return null;
  if (typeof r.money !== 'number' || !Number.isFinite(r.money)) return null;
  if (!Array.isArray(r.staff)) return null;
  if (!Array.isArray(r.models)) return null;

  const base = createGame(
    typeof r.companyName === 'string' ? r.companyName : 'Нейро Лабс',
    typeof r.founderName === 'string' ? r.founderName : 'Основатель',
    typeof r.seed === 'number' ? r.seed : 1,
  );
  const merged = { ...base, ...r } as GameState;
  const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  merged.research = { ...base.research, ...rec(r.research) };
  merged.framework = { ...base.framework, ...rec(r.framework) };
  merged.contracts = { ...base.contracts, ...rec(r.contracts) };
  merged.stats = { ...base.stats, ...rec(r.stats) };
  merged.tutorial = { ...base.tutorial, ...rec(r.tutorial) };
  merged.research.done = arr<string>(merged.research.done);
  merged.research.discounts = arr<string>(merged.research.discounts);
  merged.framework.features = arr<string>(merged.framework.features);
  merged.contracts.offers = arr(merged.contracts.offers);
  merged.contracts.active = arr(merged.contracts.active);
  merged.staff = arr<GameState['staff'][number]>(r.staff);
  merged.candidates = arr(merged.candidates);
  merged.models = arr(merged.models);
  merged.platforms = arr<string>(merged.platforms);
  merged.gpus = arr<string>(merged.gpus);
  merged.campaignsDone = arr<string>(merged.campaignsDone);
  merged.grantOffers = arr(merged.grantOffers);
  merged.grants = arr(merged.grants);
  merged.loans = arr(merged.loans);
  merged.boosts = arr(merged.boosts);
  merged.objects = arr(merged.objects);
  merged.trends = arr(merged.trends);
  merged.marketMods = arr(merged.marketMods);
  merged.seenEvents = arr<string>(merged.seenEvents);
  merged.compliance = arr(merged.compliance);
  merged.labs = arr(merged.labs);
  merged.competitors = arr(merged.competitors);
  merged.news = arr(merged.news);
  merged.inbox = arr(merged.inbox);
  merged.finance = arr(merged.finance);
  merged.comboMemory = rec(r.comboMemory) as GameState['comboMemory'];
  merged.achievements = arr<string>(merged.achievements);

  // в ранних сейвах основатель сидел вне стола, а после переезда мог остаться без места
  reseat(merged);

  // первая версия сейва не знала про согласования и обучение
  if (merged.tutorial.active === undefined) merged.tutorial.active = true;
  return merged;
}

export function parseSave(text: string): { ok: true; game: GameState } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Это не JSON — файл повреждён или скопирован не полностью.' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'В файле нет данных игры.' };
  const file = raw as Partial<SaveFile>;
  if (file.magic !== SAVE_MAGIC) return { ok: false, error: 'Это не сейв Neuro Lab Tycoon.' };
  if (typeof file.version !== 'number' || file.version > SAVE_VERSION) {
    return { ok: false, error: 'Сейв создан более новой версией игры.' };
  }
  if (file.version < 1) return { ok: false, error: 'Неизвестная версия сейва.' };
  const game = normalizeGame(file.game);
  if (!game) return { ok: false, error: 'Сейв повреждён: не хватает основных данных.' };
  return { ok: true, game: { ...game, speed: 0 } };
}
