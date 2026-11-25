import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { FieldId, GameState, Modal, Screen, SimEvent, Speed, TabId, Toast, Tone } from '../types';
import { advanceWeek } from '../sim/tick';
import { createGame } from '../sim/game';
import { Rng } from '../sim/rng';
import { createModel, releaseNow, validateModel, type ModelInput } from '../sim/project';
import { repayLoan, takeLoan } from '../sim/finance';
import { licenseGpu, licensePlatform, moveOffice, useGpu } from '../sim/market';
import { exportSave, normalizeGame, parseSave, SAVE_KEY, SAVE_VERSION } from '../sim/save';

// localStorage бывает недоступен (приватный режим, запрещённые куки) — тогда живём в памяти,
// а перенести игру можно экспортом.
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* хранилище и так недоступно */
    }
    memory.delete(name);
  },
};

export interface UiState {
  tab: TabId;
  modal: Modal | null;
  modalQueue: Modal[];
  toasts: Toast[];
}

export interface GameStore {
  screen: Screen;
  game: GameState | null;
  ui: UiState;
  goIntro(): void;
  startGame(company: string, founder: string): void;
  continueGame(): void;
  toMenu(): void;
  abandonGame(): void;
  tick(): void;
  setSpeed(speed: Speed): void;
  setTab(tab: TabId): void;
  openModal(modal: Modal): void;
  closeModal(): void;
  toast(text: string, tone?: Tone): void;
  dismissToast(id: number): void;
  exportSave(): string | null;
  importSave(text: string): { ok: true } | { ok: false; error: string };
  /** возвращает текст ошибки или null, если действие выполнено */
  startModel(input: ModelInput): string | null;
  setSlider(field: FieldId, value: number): void;
  releaseModel(): string | null;
  cancelProject(): void;
  licensePlatform(id: string): string | null;
  licenseGpu(id: string): string | null;
  useGpu(id: string): string | null;
  moveOffice(id: string): string | null;
  takeLoan(amount: number): string | null;
  repayLoan(loanId: number, amount: number): string | null;
}

/** листы, при открытии которых мир продолжает идти; остальные останавливают время */
const NON_BLOCKING: ReadonlySet<Modal['kind']> = new Set(['model', 'save']);

export function isBlocking(modal: Modal | null, queue: Modal[]): boolean {
  if (queue.length > 0) return true;
  return modal !== null && !NON_BLOCKING.has(modal.kind);
}

const emptyUi = (): UiState => ({ tab: 'project', modal: null, modalQueue: [], toasts: [] });
const TOAST_MS = 3600;
let toastId = 0;

function withToast(ui: UiState, text: string, tone: Tone): { ui: UiState; id: number } {
  const id = ++toastId;
  return { ui: { ...ui, toasts: [...ui.toasts.slice(-1), { id, text, tone }] }, id };
}

/** превращает события симуляции в изменения интерфейса */
function applyEvents(ui: UiState, events: SimEvent[]): { ui: UiState; freshToasts: number[]; gameOver: boolean } {
  const queue: Modal[] = [];
  const freshToasts: number[] = [];
  let next = ui;
  let gameOver = false;
  for (const ev of events) {
    switch (ev.type) {
      case 'toast': {
        const t = withToast(next, ev.text, ev.tone);
        next = t.ui;
        freshToasts.push(t.id);
        break;
      }
      case 'news':
        queue.push({ kind: 'news', newsId: ev.newsId });
        break;
      case 'release':
        queue.push({ kind: 'release', modelId: ev.modelId });
        break;
      case 'insolvency':
        queue.push({ kind: 'insolvency', weeksLeft: ev.weeksLeft });
        break;
      case 'achievement':
        queue.push({ kind: 'achievement', id: ev.id });
        break;
      case 'gameover':
        gameOver = true;
        break;
    }
  }
  if (queue.length > 0) {
    next = next.modal ? { ...next, modalQueue: [...next.modalQueue, ...queue] } : { ...next, modal: queue[0], modalQueue: queue.slice(1) };
  }
  if (gameOver) next = { ...next, modal: null, modalQueue: [] };
  return { ui: next, freshToasts, gameOver };
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => {
      /** применяет действие игрока к копии состояния и показывает его события */
      const act = (fn: (draft: GameState, rng: Rng, events: SimEvent[]) => string | null): string | null => {
        const game = get().game;
        if (!game || game.gameover) return 'Партия закончена';
        const draft = structuredClone(game);
        const rng = new Rng(draft.rng);
        const events: SimEvent[] = [];
        const error = fn(draft, rng, events);
        if (error) return error;
        draft.rng = rng.state;
        const applied = applyEvents(get().ui, events);
        set({ game: applied.gameOver ? { ...draft, speed: 0 } : draft, ui: applied.ui, screen: applied.gameOver ? 'gameover' : get().screen });
        for (const id of applied.freshToasts) setTimeout(() => get().dismissToast(id), TOAST_MS);
        return null;
      };

      const toast = (text: string, tone: Tone = 'info') => {
        const t = withToast(get().ui, text, tone);
        set({ ui: t.ui });
        setTimeout(() => get().dismissToast(t.id), TOAST_MS);
      };

      return {
        screen: 'menu',
        game: null,
        ui: emptyUi(),

        goIntro: () => set({ screen: 'intro', ui: emptyUi() }),

        startGame: (company, founder) => set({ screen: 'game', game: createGame(company, founder), ui: emptyUi() }),

        continueGame: () => {
          const game = get().game;
          if (!game) return;
          set({ screen: 'game', game: { ...game, speed: 0 }, ui: emptyUi() });
        },

        toMenu: () => {
          const game = get().game;
          set({ screen: 'menu', game: game ? { ...game, speed: 0 } : null, ui: emptyUi() });
        },

        abandonGame: () => set({ screen: 'menu', game: null, ui: emptyUi() }),

        tick: () => {
          const game = get().game;
          if (!game || game.gameover) return;
          const res = advanceWeek(game);
          const applied = applyEvents(get().ui, res.events);
          set({
            game: applied.gameOver ? { ...res.state, speed: 0 } : res.state,
            ui: applied.ui,
            screen: applied.gameOver ? 'gameover' : get().screen,
          });
          for (const id of applied.freshToasts) setTimeout(() => get().dismissToast(id), TOAST_MS);
        },

        setSpeed: (speed) => {
          const game = get().game;
          if (!game) return;
          set({ game: { ...game, speed } });
        },

        setTab: (tab) => set((s) => ({ ui: { ...s.ui, tab } })),

        openModal: (modal) => set((s) => ({ ui: s.ui.modal ? { ...s.ui, modalQueue: [...s.ui.modalQueue, modal] } : { ...s.ui, modal } })),

        closeModal: () => set((s) => ({ ui: { ...s.ui, modal: s.ui.modalQueue[0] ?? null, modalQueue: s.ui.modalQueue.slice(1) } })),

        toast,

        dismissToast: (id) => set((s) => ({ ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } })),

        exportSave: () => {
          const game = get().game;
          return game ? exportSave(game) : null;
        },

        importSave: (text) => {
          const res = parseSave(text);
          if (!res.ok) return res;
          set({ screen: 'game', game: res.game, ui: emptyUi() });
          return { ok: true };
        },

        startModel: (input) => act((draft, rng) => (validateModel(draft, input) ?? (createModel(draft, rng, input), null))),
        setSlider: (field, value) => act((draft) => {
          if (draft.project) draft.project.sliders = { ...draft.project.sliders, [field]: Math.min(100, Math.max(0, Math.round(value))) };
          return null;
        }),
        releaseModel: () => act((draft, rng, events) => releaseNow(draft, rng, events)),
        cancelProject: () => act((draft) => {
          draft.project = null;
          return null;
        }),
        licensePlatform: (id) => act((draft) => licensePlatform(draft, id)),
        licenseGpu: (id) => act((draft) => licenseGpu(draft, id)),
        useGpu: (id) => act((draft) => useGpu(draft, id)),
        moveOffice: (id) => act((draft) => moveOffice(draft, id)),
        takeLoan: (amount) => act((draft) => takeLoan(draft, amount)),
        repayLoan: (loanId, amount) => act((draft) => repayLoan(draft, loanId, amount)),
      };
    },
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ game: s.game }),
      merge: (persisted, current) => {
        const p = persisted as { game?: unknown } | undefined;
        const game = p && p.game ? normalizeGame(p.game) : null;
        return { ...current, game };
      },
    },
  ),
);

/** сохранённая незавершённая партия, которую можно продолжить */
export function useCanContinue(): boolean {
  return useGame((s) => s.game !== null && s.game.gameover === null);
}
