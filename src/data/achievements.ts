import type { IconName } from '../ui/icons';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: IconName;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-release', name: 'Первый релиз', desc: 'Выпустить первую модель.', icon: 'rocket' },
  { id: 'first-money', name: 'Первые деньги', desc: 'Заработать на продаже модели.', icon: 'coin' },
  { id: 'rating-7', name: 'Выше среднего', desc: 'Получить среднюю оценку 7 и выше.', icon: 'star' },
  { id: 'rating-9', name: 'Горизонт', desc: 'Получить среднюю оценку 9 и выше.', icon: 'trophy' },
  { id: 'rating-10', name: 'Эталон', desc: 'Получить 10 от всех четырёх агентств.', icon: 'crown' },
  { id: 'millionaire', name: 'Миллионер', desc: 'Накопить 1 млн Cr.', icon: 'wallet' },
  { id: 'team-10', name: 'Десяток', desc: 'Собрать команду из 10 сотрудников.', icon: 'team' },
  { id: 'campus', name: 'Свой кампус', desc: 'Переехать в кампус.', icon: 'office' },
  { id: 'framework-1', name: 'Свой фреймворк', desc: 'Выпустить первую версию собственного фреймворка.', icon: 'wrench' },
  { id: 'framework-12', name: 'Полный стек', desc: 'Собрать 12 функций фреймворка.', icon: 'layers' },
  { id: 'scientist-20', name: 'Научная школа', desc: 'Завершить 20 исследований.', icon: 'grad' },
  { id: 'hype-100', name: 'Гиперболоид хайпа', desc: 'Разогнать хайп до 100.', icon: 'megaphone' },
  { id: 'chart-top', name: 'Вершина чарта', desc: 'Возглавить недельный чарт моделей.', icon: 'trend' },
  { id: 'contract-3', name: 'Надёжный подрядчик', desc: 'Выполнить 3 контракта клиентов.', icon: 'briefcase' },
  { id: 'flagship', name: 'Тяжёлая артиллерия', desc: 'Выпустить флагманскую модель.', icon: 'chip' },
  { id: 'versions-5', name: 'Линейка', desc: 'Выпустить 5 версий одной модели.', icon: 'copy' },
  { id: 'clean-release', name: 'Чистый релиз', desc: 'Выпустить модель без единой деградации.', icon: 'shieldCheck' },
  { id: 'paradigms-8', name: 'Энциклопедист', desc: 'Выпустить модели в восьми разных парадигмах.', icon: 'nodes' },
  { id: 'survive-2019', name: 'Сквозь зиму', desc: 'Дожить до 2019 года.', icon: 'thermo' },
  { id: 'recovered', name: 'На грани', desc: 'Выйти в плюс после предупреждения о банкротстве.', icon: 'pulse' },
  { id: 'veteran-2040', name: 'Ветеран отрасли', desc: 'Дожить до 2040 года.', icon: 'medal' },
];
