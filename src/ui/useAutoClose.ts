import { useEffect } from 'react';
import { useGame } from '../store/useGame';

/** данные для модалки пропали (старый сейв, партия сброшена) — закрываем, чтобы не запереть игру */
export function useAutoClose(missing: boolean): void {
  const close = useGame((s) => s.closeModal);
  useEffect(() => {
    if (missing) close();
  }, [missing, close]);
}
