import { useGame, useCanContinue } from '../../store/useGame';
import { Btn } from '../primitives';

// декоративная сеть на фоне меню: фиксированные узлы и рёбра
const NODES = [
  [20, 30], [70, 12], [120, 40], [45, 70], [95, 86], [150, 70], [175, 20], [25, 110],
  [80, 120], [135, 128], [170, 104], [105, 150], [40, 160], [150, 165], [10, 190], [190, 175],
];
const EDGES = [
  [0, 1], [1, 2], [0, 3], [1, 4], [2, 5], [2, 6], [3, 4], [4, 5], [3, 7], [4, 8], [5, 9], [5, 10],
  [6, 10], [7, 8], [8, 9], [9, 10], [8, 11], [7, 12], [11, 12], [11, 13], [9, 13], [10, 15], [13, 15], [12, 14], [14, 15],
];

function MeshArt() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className="pointer-events-none absolute -top-6 -right-8 h-72 w-72 opacity-70">
      <defs>
        <radialGradient id="menu-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#8b7bff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b7bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#menu-glow)" />
      {EDGES.map(([a, b], i) => {
        const p = NODES[a];
        const q = NODES[b];
        if (!p || !q) return null;
        return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#8b7bff" strokeOpacity="0.35" strokeWidth="0.8" />;
      })}
      {NODES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 3.2 : 1.8} fill={i % 3 === 0 ? '#41d4f0' : '#b89dff'} />
      ))}
    </svg>
  );
}

export function MainMenu() {
  const goIntro = useGame((s) => s.goIntro);
  const continueGame = useGame((s) => s.continueGame);
  const openModal = useGame((s) => s.openModal);
  const canContinue = useCanContinue();
  const company = useGame((s) => (s.game ? s.game.companyName : null));
  const finished = useGame((s) => (s.game && s.game.gameover ? s.game.gameover : null));

  return (
    <div className="relative flex h-full flex-col overflow-y-auto px-5 safe-top safe-bottom">
      <MeshArt />
      <div className="relative mt-12 text-center">
        <div className="mx-auto max-w-[280px] text-xs font-semibold leading-relaxed tracking-[0.18em] text-muted uppercase">Симулятор лаборатории нейросетей</div>
        <h1 className="mt-3 text-[44px] leading-[1.05] font-extrabold tracking-tight">
          Neuro Lab
          <br />
          <span className="text-accent">Tycoon</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[300px] text-sm leading-relaxed text-muted">Гараж 2012 года — кампус 2040-го. Модели, команда, исследования и рынок.</p>
      </div>

      <div className="relative mt-auto flex flex-col gap-2 pt-8">
        {finished && <p className="mb-1 text-center text-xs text-muted">Прошлая партия закончилась банкротством. Попробуйте ещё раз.</p>}
        {canContinue && (
          <Btn variant="primary" full icon="play" onClick={continueGame}>
            Продолжить{company ? ` · ${company}` : ''}
          </Btn>
        )}
        <Btn variant={canContinue ? 'secondary' : 'primary'} full icon="plus" onClick={goIntro}>
          Новая игра
        </Btn>
        <Btn variant="ghost" full icon="upload" onClick={() => openModal({ kind: 'save' })}>
          Импорт сейва
        </Btn>
      </div>
      <div className="relative mt-4 text-center text-xs text-muted">работает офлайн, без интернета</div>
    </div>
  );
}
