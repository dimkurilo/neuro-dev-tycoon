// Игровой календарь: неделя — базовая единица времени, 52 недели в году.
export const START_YEAR = 2012;
export const WEEKS_PER_YEAR = 52;

export const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const MONTHS_FULL = [
  'январе',
  'феврале',
  'марте',
  'апреле',
  'мае',
  'июне',
  'июле',
  'августе',
  'сентябре',
  'октябре',
  'ноябре',
  'декабре',
];

/** год по абсолютному индексу недели от старта */
export function yearOf(week: number): number {
  return START_YEAR + Math.floor(week / WEEKS_PER_YEAR);
}

/** неделя внутри года, 0…51 */
export function weekOfYear(week: number): number {
  return ((week % WEEKS_PER_YEAR) + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;
}

/** месяц, 0…11 */
export function monthOf(week: number): number {
  return Math.min(11, Math.floor((weekOfYear(week) / WEEKS_PER_YEAR) * 12));
}

/** абсолютный индекс недели по году и номеру недели в нём */
export function weekIndex(year: number, weekInYear: number): number {
  return (year - START_YEAR) * WEEKS_PER_YEAR + weekInYear;
}

/** сколько лет прошло от старта, дробно */
export function yearsSince(week: number): number {
  return week / WEEKS_PER_YEAR;
}

/** «мар 2012 · нед. 10» */
export function formatDate(week: number): string {
  return `${MONTHS[monthOf(week)]} ${yearOf(week)} · нед. ${weekOfYear(week) + 1}`;
}

/** «В марте 2012 года…» */
export function formatMonthLong(week: number): string {
  return `В ${MONTHS_FULL[monthOf(week)]} ${yearOf(week)} года`;
}
