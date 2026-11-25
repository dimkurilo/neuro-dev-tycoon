import type { CourseDef } from '../../../types';
import { COURSES } from '../../../data/courses';
import { canTakeCourse, coursePrice, isCourseOpen } from '../../../sim/staff';
import { useGame } from '../../../store/useGame';
import { Btn, Card, Chip, IconBox, Notice, Sheet } from '../../primitives';
import { useAutoClose } from '../../useAutoClose';
import { useRun } from '../../useRun';
import { fmtCount, fmtMoney } from '../../format';

function effectChips(course: CourseDef): { label: string; tone: 'research' | 'engineering' | 'good' }[] {
  const out: { label: string; tone: 'research' | 'engineering' | 'good' }[] = [];
  if (course.research) out.push({ label: `+${course.research} наука`, tone: 'research' });
  if (course.engineering) out.push({ label: `+${course.engineering} инженерия`, tone: 'engineering' });
  if (course.speed) out.push({ label: `+${course.speed} скорость`, tone: 'good' });
  return out;
}

/** выбор курса для сотрудника */
export function CoursesSheet({ staffId, onClose }: { staffId: string; onClose: () => void }) {
  const game = useGame((s) => s.game);
  const staff = useGame((s) => s.game?.staff.find((x) => x.id === staffId));
  const sendTraining = useGame((s) => s.sendTraining);
  const run = useRun();
  useAutoClose(!game || !staff);
  if (!game || !staff) return null;

  const open = COURSES.filter((c) => isCourseOpen(game, c.id));
  return (
    <Sheet title={`Обучение: ${staff.name}`} onClose={onClose}>
      <p className="text-sm text-muted">На время курса сотрудник не работает и не участвует в проекте. Навык растёт по завершении.</p>
      {open.length === 0 && <Notice className="mt-3" tone="warn" icon="lock">Нет открытых курсов. Изучите «Основы глубокого обучения» в лаборатории.</Notice>}
      <div className="mt-3 flex flex-col gap-2">
        {open.map((course) => {
          const error = canTakeCourse(game, staff, course.id);
          return (
            <Card key={course.id} className="p-3">
              <div className="flex items-start gap-3">
                <IconBox icon={course.icon} tone="good" />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] leading-snug font-semibold">{course.name}</div>
                  <p className="mt-0.5 text-xs leading-snug text-muted">{course.desc}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {effectChips(course).map((chip) => (
                  <Chip key={chip.label} tone={chip.tone}>
                    {chip.label}
                  </Chip>
                ))}
              </div>
              <Btn full className="mt-2" icon="grad" disabled={error !== null} onClick={() => { run(() => sendTraining(staff.id, course.id), `${staff.name} отправлен(а) на курс`); onClose(); }}>
                {error ?? `Отправить · ${fmtCount(course.weeks, ['неделя', 'недели', 'недель'])} · ${fmtMoney(coursePrice(game, course))}`}
              </Btn>
            </Card>
          );
        })}
      </div>
    </Sheet>
  );
}
