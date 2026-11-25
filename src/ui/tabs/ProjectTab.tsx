import { useGame } from '../../store/useGame';
import { Icon } from '../icons';
import { Btn, Card } from '../primitives';
import { ProjectView } from './project/ProjectView';
import { ReleasesList } from './project/ReleasesList';

export function ProjectTab() {
  const project = useGame((s) => s.game?.project ?? null);
  const released = useGame((s) => s.game?.models.length ?? 0);
  const openModal = useGame((s) => s.openModal);
  const first = released === 0;
  return (
    <div className="flex flex-col gap-4">
      {project ? (
        <ProjectView project={project} />
      ) : (
        <Card className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Icon name="plus" className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-semibold">{first ? 'Первая модель — самая важная' : 'Лаборатория ждёт проект'}</h2>
          <p className="text-sm text-muted">{first ? 'Выберите домен, парадигму и платформу — и запустите обучение.' : 'Разработки нет: команда простаивает, продажи идут.'}</p>
          <Btn variant="primary" full icon="plus" className="mt-2" onClick={() => openModal({ kind: 'newModel' })}>
            Новая модель
          </Btn>
        </Card>
      )}
      <ReleasesList />
    </div>
  );
}
