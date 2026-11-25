import { Component, type ReactNode } from 'react';
import { useEngine } from './ui/useEngine';
import { useGame } from './store/useGame';
import { MainMenu } from './ui/screens/MainMenu';
import { Intro } from './ui/screens/Intro';
import { GameShell } from './ui/screens/GameShell';
import { GameOver } from './ui/screens/GameOver';
import { ModalHost } from './ui/ModalHost';
import { Toasts } from './ui/Toasts';
import { Btn, Card } from './ui/primitives';
import { ProjectTab } from './ui/tabs/ProjectTab';
import { MarketTab } from './ui/tabs/MarketTab';
import { MoreTab } from './ui/tabs/MoreTab';
import { TeamTab } from './ui/tabs/TeamTab';
import { LabTab } from './ui/tabs/LabTab';
import { OfficeTab } from './ui/tabs/OfficeTab';

const TABS = {
  project: () => <ProjectTab />,
  lab: () => <LabTab />,
  team: () => <TeamTab />,
  office: () => <OfficeTab />,
  market: () => <MarketTab />,
  more: () => <MoreTab />,
};

/** повреждённый сейв не должен намертво вешать игру — показываем выход в меню */
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Card className="flex w-full max-w-sm flex-col gap-3 p-4">
          <div className="text-lg font-semibold">Интерфейс споткнулся</div>
          <p className="text-sm text-muted">Сейв не пострадал. Вернитесь в меню и продолжите партию — если ошибка повторяется, загрузите резервную копию.</p>
          <Btn variant="primary" onClick={() => this.setState({ failed: false })}>
            Попробовать снова
          </Btn>
          <Btn onClick={() => useGame.getState().toMenu()}>В меню</Btn>
        </Card>
      </div>
    );
  }
}

export default function App() {
  useEngine();
  const screen = useGame((s) => s.screen);
  return (
    <div className="relative mx-auto flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-bg text-text shadow-2xl">
      <Boundary>
        {screen === 'menu' && <MainMenu />}
        {screen === 'intro' && <Intro />}
        {screen === 'game' && <GameShell tabs={TABS} />}
        {screen === 'gameover' && <GameOver />}
      </Boundary>
      <ModalHost />
      {/* в игре тосты рендерит оболочка — под шапкой */}
      {screen !== 'game' && <Toasts />}
    </div>
  );
}
