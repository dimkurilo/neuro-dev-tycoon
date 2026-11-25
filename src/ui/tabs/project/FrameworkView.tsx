import type { Project } from '../../../types';
import { featureById } from '../../../data/features';
import { describeFeature } from '../../../data/describe';
import { useGame } from '../../../store/useGame';
import { Icon } from '../../icons';
import { Bar, Btn, Card, Chip, IconBox, Notice, Sheet } from '../../primitives';

/** ход разработки новой версии фреймворка */
export function FrameworkView({ project }: { project: Project }) {
  const game = useGame((s) => s.game);
  const openModal = useGame((s) => s.openModal);
  const cancelProject = useGame((s) => s.cancelProject);
  if (!game) return null;
  const weeks = project.weeksPerPhase[0];
  const done = project.weekInPhase;
  const features = project.features.map(featureById).filter((f) => f !== undefined);

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3">
        <div className="flex items-start gap-3">
          <IconBox icon="wrench" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg leading-tight font-bold">{project.name}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Chip tone="accent">версия {game.framework.version + 1}</Chip>
              <Chip icon="wrench">фреймворк</Chip>
            </div>
          </div>
        </div>
        <Bar value={done} max={weeks} className="mt-3" />
        <div className="num mt-1.5 flex justify-between gap-2 text-xs text-muted">
          <span>неделя {done} из {weeks}</span>
          <span>модели выпускать нельзя</span>
        </div>
      </Card>

      <Card className="p-3">
        <h3 className="text-[15px] font-semibold">Функции новой версии</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {features.map((feature) => (
            <li key={feature.id} className="flex items-start gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-panel2 text-accent">
                <Icon name={feature.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{feature.name}</span>
                <span className="block text-xs leading-snug text-muted">{describeFeature(feature)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Btn
        variant="ghost"
        icon="trash"
        onClick={() =>
          openModal({
            kind: 'confirm',
            title: 'Отменить разработку',
            text: 'Версия не будет собрана, потраченные на функции деньги не вернутся.',
            confirmLabel: 'Отменить',
            danger: true,
            onConfirm: cancelProject,
          })
        }
      >
        Отменить разработку
      </Btn>
    </div>
  );
}

/** версия собрана: что теперь умеет фреймворк */
export function FrameworkReport({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const framework = game.framework;
  const features = framework.features.map(featureById).filter((f) => f !== undefined);
  return (
    <Sheet title={`Фреймворк v${framework.version} готов`} onClose={onClose} footer={<Btn variant="primary" full onClick={onClose}>Отлично</Btn>}>
      <div className="flex flex-col items-center gap-1 py-2 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Icon name="wrench" className="h-8 w-8" />
        </span>
        <div className="text-xl font-bold">{framework.name}</div>
        <div className="num text-xs text-muted">версия {framework.version}</div>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {features.map((feature) => (
          <li key={feature.id} className="rounded-xl border border-line bg-panel2 p-2.5">
            <div className="text-sm font-medium">{feature.name}</div>
            <div className="text-xs leading-snug text-muted">{feature.desc}</div>
            <div className="mt-1 text-xs text-good">{describeFeature(feature)}</div>
          </li>
        ))}
      </ul>
      <Notice className="mt-3" tone="good" icon="check">
        Функции фреймворка действуют на все новые модели. Следующую версию можно собрать из новых исследованных функций.
      </Notice>
    </Sheet>
  );
}
