import type { GameState, SimEvent, Staff } from '../types';
import { BALANCE } from '../data/balance';
import { COURSES, courseById } from '../data/courses';
import { generateCandidates, LEVEL_ORDER, LEVELS, ROLE_BY_ID } from '../data/staff';
import { OFFICES, officeById } from '../data/offices';
import { RESEARCH_BY_ID } from '../data/research';
import { licensePrice } from './market';
import { getMods } from './mods';
import { burnoutFactor, deskBonus } from './office';
import type { Rng } from './rng';
import { clamp } from './util';

export function capacity(state: GameState): number {
  return officeById(state.office).capacity;
}

export function freeSeats(state: GameState): number {
  return Math.max(0, capacity(state) - state.staff.length);
}

export function weeklySalaries(state: GameState): number {
  let sum = 0;
  for (const s of state.staff) sum += s.salary;
  return sum;
}

export function staffById(state: GameState, id: string): Staff | undefined {
  return state.staff.find((s) => s.id === id);
}

/** работает ли сотрудник: не в отпуске и не на учёбе */
export function isAvailable(s: Staff): boolean {
  return s.vacationWeeks === 0 && s.training === null;
}

/** первый свободный стол в офисе */
export function freeDesk(state: GameState): number | null {
  const taken = new Set(state.staff.map((s) => s.desk).filter((d): d is number => d !== null));
  return officeById(state.office).desks.find((d) => !taken.has(d)) ?? null;
}

/** заполняет список кандидатов; qualityBias добавляет к силе рынка труда */
export function refreshCandidates(state: GameState, rng: Rng, qualityBias = 0): void {
  const officeRank = Math.max(0, OFFICES.findIndex((o) => o.id === state.office));
  const fresh = generateCandidates(BALANCE.team.candidateCount, state.week, state.fans, officeRank, qualityBias, rng);
  state.candidates = fresh.map((c, i) => ({ ...c, id: `c${state.week}-${i}-${Math.floor(rng.next() * 1e6)}` }));
  state.candidateRefreshIn = BALANCE.team.candidateRefresh;
  state.rng = rng.state;
}

/** платный поиск новых кандидатов */
export function postJobs(state: GameState, rng: Rng): string | null {
  const price = licensePrice(state, BALANCE.team.jobPostCost);
  if (state.money < price) return 'Недостаточно денег на размещение вакансий';
  state.money -= price;
  refreshCandidates(state, rng);
  return null;
}

export function hire(state: GameState, candidateId: string): string | null {
  const candidate = state.candidates.find((c) => c.id === candidateId);
  if (!candidate) return 'Этот кандидат уже нашёл работу';
  if (freeSeats(state) <= 0) return `В офисе нет свободных мест — переезд на вкладке «Офис»`;
  const staff: Staff = {
    id: `s${state.nextStaffId}`,
    name: candidate.name,
    role: candidate.role,
    level: candidate.level,
    research: candidate.research,
    engineering: candidate.engineering,
    speed: candidate.speed,
    salary: candidate.salary,
    burnout: 0,
    focus: ROLE_BY_ID[candidate.role].focus,
    onProject: true,
    founder: false,
    vacationWeeks: 0,
    training: null,
    desk: freeDesk(state),
    hiredWeek: state.week,
    burnouts: 0,
    color: candidate.color,
  };
  state.nextStaffId += 1;
  state.staff = [...state.staff, staff];
  state.candidates = state.candidates.filter((c) => c.id !== candidateId);
  state.stats = { ...state.stats, hired: state.stats.hired + 1 };
  return null;
}

export function fire(state: GameState, staffId: string): string | null {
  const staff = staffById(state, staffId);
  if (!staff) return 'Сотрудник не найден';
  if (staff.founder) return 'Основателя уволить нельзя';
  const severance = staff.salary * BALANCE.team.severanceWeeks;
  if (state.money < severance) return 'Не хватает денег на выходное пособие';
  state.money -= severance;
  state.staff = state.staff.filter((s) => s.id !== staffId);
  return null;
}

export function toggleProject(state: GameState, staffId: string): string | null {
  const staff = staffById(state, staffId);
  if (!staff) return 'Сотрудник не найден';
  if (!isAvailable(staff)) return 'Сотрудник сейчас отсутствует';
  state.staff = state.staff.map((s) => (s.id === staffId ? { ...s, onProject: !s.onProject } : s));
  return null;
}

export function setFocus(state: GameState, staffId: string, value: number): void {
  state.staff = state.staff.map((s) => (s.id === staffId ? { ...s, focus: clamp(Math.round(value), 0, 100) } : s));
}

/** курс открыт, если завершено исследование, которое его добавляет */
export function isCourseOpen(state: GameState, courseId: string): boolean {
  return state.research.done.some((id) => RESEARCH_BY_ID[id]?.effects.courses?.includes(courseId) ?? false);
}

/** почему курс не подходит; null — можно отправлять */
export function canTakeCourse(state: GameState, staff: Staff, courseId: string): string | null {
  const course = courseById(courseId);
  if (!course) return 'Курс не найден';
  if (!isCourseOpen(state, courseId)) return 'Курс ещё не открыт в лаборатории';
  if (staff.training) return 'Сотрудник уже учится';
  if (staff.vacationWeeks > 0) return 'Сотрудник в отпуске';
  const minLevel = course.minLevel ?? 'junior';
  if (LEVEL_ORDER.indexOf(staff.level) < LEVEL_ORDER.indexOf(minLevel)) return `Курс для сотрудников уровня «${LEVELS[minLevel].name}» и выше`;
  if (state.money < coursePrice(state, course)) return 'Недостаточно денег';
  return null;
}

export function coursePrice(state: GameState, course: (typeof COURSES)[number]): number {
  return licensePrice(state, course.cost);
}

export function sendTraining(state: GameState, staffId: string, courseId: string): string | null {
  const staff = staffById(state, staffId);
  if (!staff) return 'Сотрудник не найден';
  const error = canTakeCourse(state, staff, courseId);
  if (error) return error;
  const course = courseById(courseId);
  if (!course) return 'Курс не найден';
  state.money -= coursePrice(state, course);
  state.staff = state.staff.map((s) => (s.id === staffId ? { ...s, training: { courseId, weeksLeft: course.weeks }, onProject: false } : s));
  return null;
}

export function sendVacation(state: GameState, staffId: string): string | null {
  const staff = staffById(state, staffId);
  if (!staff) return 'Сотрудник не найден';
  if (staff.training) return 'Сотрудник на курсах';
  if (staff.vacationWeeks > 0) return 'Сотрудник уже в отпуске';
  state.staff = state.staff.map((s) => (s.id === staffId ? { ...s, vacationWeeks: BALANCE.team.vacationWeeks, onProject: false } : s));
  return null;
}

/** исследовательские очки за неделю: сильнее у ресечеров, слабее у занятых в проекте */
export function rpPerWeek(state: GameState): number {
  let rp = 0;
  for (const s of state.staff) {
    if (!isAvailable(s)) continue;
    const onProject = s.onProject && state.project !== null;
    const roleBonus = s.role === 'researcher' ? BALANCE.team.roles.researcherRp : 1;
    const bonus = deskBonus(state, s.desk);
    rp += (s.research + bonus.research) * (1 + bonus.rp) * BALANCE.team.rpPerResearch * (onProject ? BALANCE.team.rpOnProject : 1) * roleBonus;
  }
  return rp * getMods(state).rp;
}

function bump(value: number, add?: number): number {
  return clamp(value + (add ?? 0), 1, BALANCE.team.statCap);
}

/** шаг команды за неделю: исследовательские очки, обучение, отпуска, выгорание, кандидаты */
export function runStaff(state: GameState, rng: Rng, events: SimEvent[]): void {
  state.rp += rpPerWeek(state);
  const mods = getMods(state);
  const next: Staff[] = [];

  for (const s of state.staff) {
    let staff = s;

    if (staff.training) {
      const weeksLeft = staff.training.weeksLeft - 1;
      if (weeksLeft > 0) {
        staff = { ...staff, training: { ...staff.training, weeksLeft } };
      } else {
        const course = courseById(staff.training.courseId);
        staff = {
          ...staff,
          training: null,
          onProject: true,
          research: bump(staff.research, course?.research),
          engineering: bump(staff.engineering, course?.engineering),
          speed: bump(staff.speed, course?.speed),
        };
        events.push({ type: 'toast', text: course ? `${staff.name} закончил(а) курс «${course.name}»` : `${staff.name} закончил(а) обучение`, tone: 'good' });
      }
    } else if (staff.vacationWeeks > 0) {
      const left = staff.vacationWeeks - 1;
      staff = left > 0 ? { ...staff, vacationWeeks: left } : { ...staff, vacationWeeks: 0, burnout: 10, onProject: true };
      if (left === 0) events.push({ type: 'toast', text: `${staff.name} вернулся из отпуска`, tone: 'info' });
    } else {
      const working = staff.onProject && state.project !== null;
      const change = working ? BALANCE.team.burnoutPerWeek * mods.burnout * burnoutFactor(deskBonus(state, staff.desk)) - mods.burnoutRelief : -BALANCE.team.burnoutIdleRecover;
      const burnout = clamp(staff.burnout + change, 0, 100);
      staff = { ...staff, burnout };

      if (burnout >= 100) {
        const burnouts = staff.burnouts + 1;
        if (burnouts >= 3) {
          events.push({ type: 'toast', text: `${staff.name} выгорел(а) и уволил(а)сь`, tone: 'bad' });
          state.stats = { ...state.stats, quit: state.stats.quit + 1 };
          continue;
        }
        staff = { ...staff, burnouts, vacationWeeks: BALANCE.team.forcedVacationWeeks, onProject: false };
        events.push({ type: 'toast', text: `${staff.name} выгорел(а): вынужденный отпуск на ${BALANCE.team.forcedVacationWeeks} недели`, tone: 'bad' });
      } else if (burnout >= BALANCE.team.highBurnout && rng.chance(BALANCE.team.quitChance)) {
        events.push({ type: 'toast', text: `${staff.name} уволил(а)сь из-за переработок`, tone: 'bad' });
        state.stats = { ...state.stats, quit: state.stats.quit + 1 };
        continue;
      }
    }
    next.push(staff);
  }
  state.staff = next;
  state.rng = rng.state;

  // истёкшие бусты больше не действуют
  state.boosts = state.boosts.filter((b) => state.week < b.endsWeek);

  if (state.candidateRefreshIn > 0) {
    const left = state.candidateRefreshIn - 1;
    if (left === 0) refreshCandidates(state, rng);
    else state.candidateRefreshIn = left;
  }
}
