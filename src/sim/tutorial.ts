import type { GameState, SimEvent } from '../types';
import { TUTORIAL } from '../data/tutorial';

/** номер первого невыполненного шага; TUTORIAL.length — все пройдены */
export function tutorialStep(state: GameState): number {
  const step = TUTORIAL.findIndex((item) => !item.done(state));
  return step === -1 ? TUTORIAL.length : step;
}

/** шаг обучения: отмечает прогресс, а после последнего шага завершает обучение */
export function runTutorial(state: GameState, events: SimEvent[]): void {
  if (!state.tutorial.active) return;
  const step = tutorialStep(state);
  if (step >= TUTORIAL.length) {
    state.tutorial = { active: false, step };
    events.push({ type: 'toast', text: 'Обучение пройдено. Дальше — сами: заказы, маркетинг и версии моделей на вкладке «Рынок».', tone: 'good' });
  } else if (step !== state.tutorial.step) {
    state.tutorial = { ...state.tutorial, step };
  }
}
