import { useCallback } from 'react';
import { useGame } from '../store/useGame';

/** выполняет действие игрока и показывает ошибку или подтверждение тостом */
export function useRun(): (action: () => string | null, done?: string) => void {
  const toast = useGame((s) => s.toast);
  return useCallback(
    (action, done) => {
      const error = action();
      if (error) toast(error, 'bad');
      else if (done) toast(done, 'good');
    },
    [toast],
  );
}
