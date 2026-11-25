import type { Fit, Project } from '../../../types';
import { DEV_PHASES, FIELDS, phaseName, phaseWeeksTotal } from '../../../data/fields';
import { DEGRADATION_BY_ID, DEG_TAG_LABEL, SEVERITY_LABEL } from '../../../data/degradations';
import { EXPANSION_LABEL } from '../../../data/describe';
import { domainById } from '../../../data/domains';
import { FIT_LABEL, idealShare, scaleById } from '../../../data/compat';
import { paradigmById } from '../../../data/paradigms';
import { gpuById } from '../../../data/gpus';
import { expectedPoints } from '../../../sim/release';
import { degradationWeight, fixCapacity, gpuWeeklyCost, stabilizationProgress, teamPools, weeklyPoints } from '../../../sim/project';
import { getMods } from '../../../sim/mods';
import { knownFit, revealBalance } from '../../../sim/perks';
import { useGame } from '../../../store/useGame';
import { Icon } from '../../icons';
import { Bar, Btn, Card, Chip, cn } from '../../primitives';
import { ShareSlider, effectiveShare } from '../../widgets';
import { fmtInt, fmtMoney } from '../../format';
import { FrameworkView } from './FrameworkView';

const PHASE_INDEX = [0, 1, 2, 3] as const;

const FIT_TONE: Record<Fit, 'good' | 'default' | 'bad'> = { ideal: 'good', ok: 'default', weird: 'bad' };

export function ProjectView({ project }: { project: Project }) {
  const game = useGame((s) => s.game);
  const setSlider = useGame((s) => s.setSlider);
  const releaseModel = useGame((s) => s.releaseModel);
  const toast = useGame((s) => s.toast);
  const openModal = useGame((s) => s.openModal);
  const cancelProject = useGame((s) => s.cancelProject);
  if (!game) return null;
  if (project.kind === 'framework') return <FrameworkView project={project} />;

  const domain = domainById(project.domain);
  const paradigm = paradigmById(project.paradigm);
  const scale = scaleById(project.scale);
  const gpu = gpuById(project.gpu);
  const mods = getMods(game);
  const pools = teamPools(game);
  const stabilizing = project.phase >= DEV_PHASES;
  const phase = Math.min(project.phase, 2) as 0 | 1 | 2;
  const fields = FIELDS.filter((f) => f.phase === phase);
  const perWeek = stabilizing ? 0 : weeklyPoints(game, pools, mods);
  const capacity = fixCapacity(game, mods);
  const gpuCost = gpuWeeklyCost(game);

  // пройдено недель: все прошлые фазы целиком плюс текущая
  const done = project.weeksPerPhase.slice(0, project.phase).reduce((sum, w) => sum + w, 0) + project.weekInPhase;
  const total = phaseWeeksTotal(project.weeksPerPhase);
  const earned = Object.values(project.fields).reduce((sum, f) => sum + f.research + f.engineering, 0);
  const expected = expectedPoints(project.scale, game.week);
  const teamResearch = Math.round(((pools.rf / (pools.rf + pools.ef)) * 100));
  const teamEngineering = 100 - teamResearch;
  const idealKnown = revealBalance(game) >= phase + 1;
  const fit = knownFit(game, project.domain, project.paradigm);
  const open = project.degradations.length;

  const release = () => {
    const error = releaseModel();
    if (error) toast(error, 'bad');
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-panel2">
            <Icon name={domain.icon} className="h-6 w-6 text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg leading-tight font-bold">{project.name}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Chip icon={paradigm.icon}>{paradigm.name}</Chip>
              {fit && <Chip tone={FIT_TONE[fit]}>{FIT_LABEL[fit]}</Chip>}
              {project.kind === 'expansion' && project.expansion && (
                <Chip tone="accent" icon="copy">
                  {EXPANSION_LABEL[project.expansion]}
                </Chip>
              )}
            </div>
          </div>
        </div>

        <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Фазы проекта">
          {PHASE_INDEX.map((i) => {
            const state = i < project.phase ? 'done' : i === project.phase ? 'now' : 'next';
            const note = state === 'done' ? 'готово' : state === 'now' ? (i === 3 ? 'идёт' : `${project.weekInPhase}/${project.weeksPerPhase.slice(0, 3)[i]}`) : '';
            return (
              <li
                key={i}
                className={cn(
                  'rounded-lg px-1 py-1.5 text-center text-[10px] leading-tight font-medium tracking-tight',
                  state === 'done' && 'bg-good/15 text-good',
                  state === 'now' && 'bg-accent/20 text-[#cdc5ff]',
                  state === 'next' && 'bg-panel2 text-muted',
                )}
              >
                <div className="truncate">{phaseName(i)}</div>
                <div className="num mt-0.5 text-[10px] opacity-90">{note}</div>
              </li>
            );
          })}
        </ol>
        <Bar value={stabilizing ? total : done} max={total} className="mt-2" />
        <div className="num mt-1.5 flex justify-between gap-2 text-xs text-muted">
          <span>
            {scale.name} · {gpu.name}
          </span>
          <span>
            неделя {done} из {total}
          </span>
        </div>
      </Card>

      {stabilizing ? (
        <Card className="p-3">
          <h3 className="text-[15px] font-semibold">Стабилизация</h3>
          <p className="mt-1 text-sm text-muted">
            {open > 0
              ? 'Открытые деградации снижают оценки агентств. Можно подождать, пока команда всё исправит, — или выпустить модель сейчас.'
              : 'Все деградации устранены. Модель выйдет автоматически на следующей неделе.'}
          </p>
          <Btn variant="primary" full icon="rocket" className="mt-3" onClick={release}>
            Выпустить сейчас
          </Btn>
        </Card>
      ) : (
        <Card className="p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">Очки против ожиданий рынка</span>
            <span className="num shrink-0 text-xs text-muted">
              {fmtInt(earned)} из {fmtInt(expected)}
            </span>
          </div>
          <Bar value={earned} max={expected} className="mt-2" />
          <p className="num mt-1.5 text-xs text-muted">
            Команда набирает около <b className="text-text">{fmtInt(perWeek)}</b> очков за неделю. Ожидания рынка растут каждый год.
          </p>
          <p className="num mt-1 text-xs text-muted">
            Сила команды: исследования {teamResearch}% · инженерия {teamEngineering}%. Состав команды сдвигает фактическую долю.
          </p>
        </Card>
      )}

      {!stabilizing &&
        fields.map((f) => {
          const value = project.sliders[f.id];
          const pts = project.fields[f.id];
          const share = Math.round(effectiveShare(value, pools.rf, pools.ef) * 100);
          const ideal = idealKnown ? idealShare(project.domain, project.paradigm, f.id) : undefined;
          return (
            <Card key={f.id} className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold">{f.name}</span>
                <span className="num text-xs text-muted">{fmtInt(pts.research + pts.engineering)} очк.</span>
              </div>
              <div className="num mt-1 flex justify-between text-xs font-medium">
                <span className="text-research">Исследования {share}%</span>
                <span className="text-engineering">Инженерия {100 - share}%</span>
              </div>
              <div className={ideal === undefined ? 'mt-1' : 'mt-4'}>
                <ShareSlider value={value} ideal={ideal} label={`Доля исследований в поле «${f.name}»`} onChange={(v) => setSlider(f.id, v)} />
              </div>
              <div className="num mt-0.5 flex justify-between text-[11px] text-muted">
                <span>{fmtInt(pts.research)}</span>
                <span>{fmtInt(pts.engineering)}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">{f.hint}</p>
            </Card>
          );
        })}

      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-semibold">Деградации</span>
          <Chip tone={open > 0 ? 'warn' : 'good'} icon={open > 0 ? 'alert' : 'check'}>
            {open === 0 ? 'чисто' : `${open} открыто`}
          </Chip>
        </div>
        {open === 0 ? (
          <p className="mt-2 text-sm text-muted">{stabilizing ? 'Модель готова к выпуску.' : 'Модель пока ведёт себя предсказуемо.'}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {[...project.degradations].sort((a, b) => degradationWeight(b) - degradationWeight(a)).map((d) => {
              const type = DEGRADATION_BY_ID[d.type];
              if (!type) return null;
              return (
                <li key={d.id} className="rounded-xl border border-line bg-panel2 p-2.5">
                  <div className="flex items-start gap-2">
                    <Chip className="mt-0.5" tone={d.severity === 'high' ? 'bad' : d.severity === 'mid' ? 'warn' : 'default'}>{SEVERITY_LABEL[d.severity]}</Chip>
                    <span className="min-w-0 flex-1 text-sm leading-snug font-medium">{type.name}</span>
                  </div>
                  <div className="num mt-1 text-xs text-muted">
                    {DEG_TAG_LABEL[type.tag]}
                    {stabilizing && d.fixed < 1 && ` · исправлено ${Math.round(d.fixed * 100)}%`}
                  </div>
                  {stabilizing && d.fixed < 1 && <Bar value={d.fixed} max={1} color="var(--color-good)" className="mt-1.5" />}
                </li>
              );
            })}
          </ul>
        )}
        {stabilizing && open > 0 && (
          <p className="num mt-2 text-xs text-muted">
            Команда исправляет около {capacity.toFixed(1)} ед. за неделю · готово {Math.round(stabilizationProgress(project) * 100)}%
          </p>
        )}
      </Card>

      <div className="num flex items-center justify-between gap-2 text-xs text-muted">
        <span>{stabilizing ? `Потрачено на GPU: ${fmtMoney(project.spent)}` : `GPU-часы: ${gpuCost > 0 ? `${fmtMoney(gpuCost)} в неделю` : 'бесплатны'}`}</span>
        <Btn
          variant="ghost"
          icon="trash"
          className="-my-1 px-2 text-xs text-muted"
          onClick={() =>
            openModal({
              kind: 'confirm',
              title: 'Отменить проект',
              text: 'Набранные очки будут потеряны, потраченные GPU-часы не вернутся.',
              confirmLabel: 'Отменить проект',
              danger: true,
              onConfirm: cancelProject,
            })
          }
        >
          Отменить
        </Btn>
      </div>
    </div>
  );
}
