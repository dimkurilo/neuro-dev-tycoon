import type { CourseDef } from '../types';

// Курсы повышения квалификации. minLevel — минимальный уровень сотрудника: продвинутые курсы
// открываются тем, кто дорос; базовые доступны всем.
export const COURSES: CourseDef[] = [
  { id: 'c-ml', name: 'Основы глубокого обучения', icon: 'grad', desc: 'Слои, градиенты, регуляризация.', cost: 8000, weeks: 3, research: 12, minLevel: 'junior' },
  { id: 'c-eng', name: 'Инженерия данных', icon: 'wrench', desc: 'Пайплайны, хранилища, качество данных.', cost: 12000, weeks: 3, engineering: 12, speed: 4, minLevel: 'junior' },
  { id: 'c-stats', name: 'Математическая статистика', icon: 'curve', desc: 'Проверка гипотез и разбор экспериментов.', cost: 20000, weeks: 4, research: 15, minLevel: 'middle' },
  { id: 'c-mlops', name: 'Практики MLOps', icon: 'server', desc: 'Деплой, мониторинг, воспроизводимость.', cost: 18000, weeks: 4, speed: 10, engineering: 6, minLevel: 'middle' },
  { id: 'c-arch', name: 'Архитектура моделей', icon: 'nodes', desc: 'Как устроены современные сети и почему именно так.', cost: 45000, weeks: 5, research: 20, engineering: 10, minLevel: 'senior' },
  { id: 'c-scale', name: 'Масштабные системы', icon: 'chip', desc: 'Распределённое обучение на сотнях узлов.', cost: 70000, weeks: 6, speed: 18, engineering: 14, minLevel: 'senior' },
  { id: 'c-lead', name: 'Лидерство команд', icon: 'crown', desc: 'Процессы, ревью и планирование.', cost: 80000, weeks: 5, research: 10, engineering: 10, speed: 10, minLevel: 'senior' },
];

export const COURSE_BY_ID: Record<string, CourseDef> = Object.fromEntries(COURSES.map((c) => [c.id, c]));

export function courseById(id: string): CourseDef | undefined {
  return COURSE_BY_ID[id];
}
