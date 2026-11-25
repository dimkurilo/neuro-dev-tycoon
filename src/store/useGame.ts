import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { GameState, Modal, Screen, Speed, TabId, Toast, Tone } from '../types';
import { advanceWeek } from '../sim/tick';
import { createGame } from '../sim/game';
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
      /* память ниже всё равно чистится */
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
}

/** модалки-события останавливают мир, служебные листы — нет */
export function isBlocking(modal: Modal | null, queue: Modal[]): boolean {
  if (queue.length > 0) return true;
  if (!modal) return false;
  return modal.kind !== 'save';
}

const emptyUi = (): UiState => ({ tab: 'project', modal: null, modalQueue: [], toasts: [] });
let toastId = 0;

function withToast(ui: UiState, text: string, tone: Tone): UiState {
  const id = ++toastId;
  return { ...ui, toasts: [...ui.toasts.slice(-3), { id, text, tone }] };
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: 'menu',
      game: null,
      ui: emptyUi(),

      goIntro: () => set({ screen: 'intro', ui: emptyUi() }),

      startGame: (company, founder) =>
        set({ screen: 'game', game: createGame(company, founder), ui: emptyUi() }),

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
        const patch: Partial<GameStore> = { game: res.state };
        let ui = get().ui;
        const queue: Modal[] = [];
        const freshToasts: number[] = [];
        for (const ev of res.events) {
          switch (ev.type) {
            case 'toast':
              ui = withToast(ui, ev.text, ev.tone);
              freshToasts.push(toastId);
              break;
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
              break;
          }
        }
        if (res.state.gameover) {
          patch.screen = 'gameover';
          patch.game = { ...res.state, speed: 0 };
          ui = { ...ui, modal: null, modalQueue: [] };
        } else if (queue.length > 0) {
          ui = ui.modal ? { ...ui, modalQueue: [...ui.modalQueue, ...queue] } : { ...ui, modal: queue[0], modalQueue: queue.slice(1) };
        }
        patch.ui = ui;
        set(patch);
        for (const id of freshToasts) setTimeout(() => get().dismissToast(id), 3600);
      },

      setSpeed: (speed) => {
        const game = get().game;
        if (!game) return;
        set({ game: { ...game, speed } });
      },

      setTab: (tab) => set((s) => ({ ui: { ...s.ui, tab } })),

      openModal: (modal) =>
        set((s) => ({ ui: s.ui.modal ? { ...s.ui, modalQueue: [...s.ui.modalQueue, modal] } : { ...s.ui, modal } })),

      closeModal: () =>
        set((s) => ({ ui: { ...s.ui, modal: s.ui.modalQueue[0] ?? null, modalQueue: s.ui.modalQueue.slice(1) } })),

      toast: (text, tone = 'info') => {
        set((s) => ({ ui: withToast(s.ui, text, tone) }));
        const id = toastId;
        setTimeout(() => get().dismissToast(id), 3600);
      },

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
    }),
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
