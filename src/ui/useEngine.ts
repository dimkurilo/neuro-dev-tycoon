import { useEffect, useRef } from 'react';
import { BALANCE } from '../data/balance';
import { useGame, isBlocking } from '../store/useGame';
import { TickClock } from '../sim/tick';

/**
 * Движок времени: каждые intervalMs отдаёт часам прошедшее реальное время и прокручивает
 * столько недель, сколько накопилось. Пока приложение скрыто, модалка события открыта
 * или партия не в игре — время стоит.
 */
export function useEngine(): void {
  const tick = useGame((s) => s.tick);
  const clockRef = useRef<TickClock>(new TickClock());

  useEffect(() => {
    let last = performance.now();
    const sync = () => {
      last = performance.now();
      clockRef.current.reset();
    };
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const store = useGame.getState();
      const speed = store.game && !store.game.gameover && store.screen === 'game' ? store.game.speed : 0;
      const ticks = isBlocking(store.ui.modal, store.ui.modalQueue) ? 0 : clockRef.current.advance(dt, speed);
      for (let i = 0; i < ticks; i++) {
        tick();
        const after = useGame.getState();
        if (!after.game || after.game.gameover || isBlocking(after.ui.modal, after.ui.modalQueue)) {
          clockRef.current.reset();
          break;
        }
      }
    }, BALANCE.time.intervalMs);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [tick]);
}
