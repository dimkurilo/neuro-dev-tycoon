import type { ResearchEffects, ResearchKind, ResearchNode } from '../types';
import type { IconName } from '../ui/icons';

// Дерево исследований: шесть ярусов, каждый следующий дороже и требует технологий с предыдущих.
// cost и weeks по умолчанию берутся из яруса; в effects перечислено, что открывает или усиливает узел.
const TIER_COST = [20, 45, 100, 220, 480, 900];
const TIER_WEEKS = [2, 3, 4, 5, 7, 9];

export const RESEARCH_TIERS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
export const RESEARCH_TIER_NAMES = ['Первые шаги', 'Основы', 'Инженерия', 'Зрелость', 'Масштаб', 'Передний край'];

export const RESEARCH_KIND_LABEL: Record<ResearchKind, string> = {
  paradigm: 'Парадигма',
  domain: 'Домен',
  framework: 'Фреймворк',
  office: 'Офис',
  course: 'Курс',
  scale: 'Масштаб',
  team: 'Команда',
  marketing: 'Маркетинг',
  contract: 'Клиенты',
  special: 'Лаборатория',
};

function n(
  id: string,
  name: string,
  desc: string,
  icon: IconName,
  kind: ResearchKind,
  tier: number,
  requires: string[],
  year: number,
  effects: ResearchEffects,
): ResearchNode {
  return { id, name, desc, icon, kind, tier, row: 0, cost: TIER_COST[tier], requires, year, weeks: TIER_WEEKS[tier], effects };
}

export const RESEARCH: ResearchNode[] = [
  // ── ярус I: первые шаги ──
  n('p-cnn', 'Глубокие свёртки', 'Свёрточные сети: модели, которые учатся видеть.', 'grid', 'paradigm', 0, [], 2012, { paradigms: ['cnn'] }),
  n('p-rl', 'Обучение с подкреплением', 'Агент учится на наградах методом проб и ошибок.', 'flag', 'paradigm', 0, [], 2012, { paradigms: ['rl'] }),
  n('lab-metrics', 'Метрики качества', 'Подсказки: сколько исследований нужно полям первой фазы.', 'target', 'special', 0, [], 2012, { revealBalance: 1 }),
  n('scale-product', 'Продуктовые модели', 'Средние проекты: дольше делать, выше ожидания, больше отдача.', 'trend', 'scale', 0, [], 2012, { scales: ['product'] }),
  n('course-ml', 'Основы глубокого обучения', 'Курс для младших сотрудников: +12 к исследованиям.', 'grad', 'course', 0, [], 2012, { courses: ['c-ml'] }),
  n('boost-coffee', 'Кухня для команды', 'Кофе и пицца по пятницам — бусты скорости и настроения.', 'coffee', 'team', 0, [], 2012, { boosts: ['coffee', 'pizza'] }),

  // ── ярус II: основы ──
  n('lab-repro', 'Воспроизводимость', 'Каждый эксперимент можно повторить: +8% к скорости разработки.', 'stack', 'special', 1, ['lab-metrics'], 2012, { speed: 0.08 }),
  n('bug-hygiene', 'Гигиена данных', 'Проверки выборок до обучения: −30% деградаций с данными.', 'shieldCheck', 'special', 1, [], 2012, { bugTags: { data: 0.7 } }),
  n('lab-matrix', 'Матрица совместимости', 'В мастере видно, какие пары домен × парадигма удачны.', 'compare', 'special', 1, ['lab-metrics'], 2013, { revealFit: true }),
  n('team-scrum', 'Еженедельные ревью', 'Команда сверяет курс каждую неделю: +6% к скорости.', 'team', 'team', 1, [], 2012, { speed: 0.06 }),
  n('office-studio', 'Переезд в студию', 'Девять рабочих мест и место для офисных объектов.', 'office', 'office', 1, [], 2012, { offices: ['studio'] }),
  n('office-board', 'Доски для схем', 'Объект офиса: соседние столы получают +инженерия.', 'board', 'office', 1, ['office-studio'], 2012, { modules: ['m-board'] }),
  n('course-eng', 'Инженерия данных', 'Курс: +12 к инженерии и +4 к скорости.', 'wrench', 'course', 1, [], 2012, { courses: ['c-eng'] }),
  n('course-stats', 'Математическая статистика', 'Курс: +15 к исследованиям.', 'curve', 'course', 1, [], 2013, { courses: ['c-stats'] }),
  n('d-security', 'Защита периметра', 'Домен: модели, которые находят вторжения и вредоносный код.', 'shield', 'domain', 1, [], 2013, { domains: ['security'] }),
  n('d-games', 'Поведение ботов', 'Домен: персонажи, которых не отличить от живых игроков.', 'gamepad', 'domain', 1, ['p-rl'], 2013, { domains: ['games'] }),
  n('mkt-social', 'Работа с аудиторией', 'Кампании: тизер в соцсетях и препринт.', 'megaphone', 'marketing', 1, [], 2012, { campaigns: ['teaser', 'paper'] }),
  n('p-gan', 'Состязательные генераторы', 'Две сети соревнуются: одна рисует, другая разобличает.', 'compare', 'paradigm', 1, ['p-cnn'], 2014, { paradigms: ['gan'] }),
  n('d-vision2', 'Пиксельные фильтры', 'Домен: шумоподавление, ретушь и эффекты для снимков.', 'filter', 'domain', 1, ['p-cnn'], 2014, { domains: ['imgfilter'] }),
  n('d-life', 'Науки о жизни', 'Домены: медицинская диагностика и разбор тренировок.', 'heart', 'domain', 1, ['p-cnn'], 2014, { domains: ['meddiag', 'fitness'] }),
  n('d-geo', 'Геоданные', 'Домены: сельское хозяйство и поиск месторождений.', 'leaf', 'domain', 1, [], 2014, { domains: ['agro', 'geology'] }),
  n('d-docs', 'Анализ документов', 'Домены: договоры, образование и модерация контента.', 'doc', 'domain', 1, [], 2014, { domains: ['legal', 'education', 'content'] }),
  n('d-dialog', 'Разговорный интерфейс', 'Домен: ассистенты, которые держат контекст беседы.', 'chat', 'domain', 1, [], 2014, { domains: ['dialog'] }),
  n('fw-autodiff', 'Автоматическое дифференцирование', 'Функция фреймворка: градиенты для любого графа вычислений.', 'wrench', 'framework', 1, [], 2012, { features: ['autodiff'] }),
  n('fw-track', 'Трекинг экспериментов', 'Функция фреймворка: каждый прогон логируется.', 'doc', 'framework', 1, [], 2012, { features: ['track'] }),
  n('fw-earlystop', 'Ранняя остановка', 'Функция фреймворка: меньше деградаций обучения.', 'clock', 'framework', 1, [], 2013, { features: ['earlystop'] }),
  n('fw-datapipeline', 'Пайплайны данных', 'Функция фреймворка: загрузка данных без узких мест.', 'filter', 'framework', 1, [], 2013, { features: ['datapipeline'] }),

  // ── ярус III: инженерия ──
  n('lab-bench', 'Внутренний полигон', 'Собственная тестовая среда: +25% к скорости исправления.', 'target', 'special', 2, ['bug-hygiene'], 2014, { fixRate: 0.25 }),
  n('lab-audit', 'Аудит моделей', 'Подсказки идеального баланса для всех фаз, −10% деградаций.', 'search', 'special', 2, ['lab-metrics'], 2014, { revealBalance: 2, bugReduce: 0.1 }),
  n('team-pair', 'Парное программирование', 'Вдвоём ошибок меньше: +3% к качеству.', 'team', 'team', 2, ['team-scrum'], 2013, { quality: 0.03 }),
  n('team-onboard', 'Онбординг новичков', 'Новички втягиваются быстрее: +4% к скорости.', 'plus', 'team', 2, ['team-scrum'], 2014, { speed: 0.04 }),
  n('course-mlops', 'Практики MLOps', 'Курс: +10 к скорости и +6 к инженерии.', 'server', 'course', 2, ['course-eng'], 2014, { courses: ['c-mlops'] }),
  n('boost-club', 'Забота о команде', 'Бусты: выезд на природу, психолог и квартальные бонусы.', 'sofa', 'team', 2, ['boost-coffee'], 2014, { boosts: ['retreat', 'wellness', 'bonuses'] }),
  n('boost-cluster', 'Ночной кластер', 'Бусты: аренда мощностей и облачный кредит на вычисления.', 'server', 'team', 2, ['boost-coffee'], 2014, { boosts: ['gpu-boost', 'cloud'] }),
  n('office-coffee', 'Кофе-поинт', 'Объект офиса: соседние столы работают быстрее, но устают скорее.', 'coffee', 'office', 2, ['office-studio'], 2013, { modules: ['m-coffee'] }),
  n('office-library', 'Библиотека', 'Объект офиса: соседние столы получают +исследования.', 'library', 'office', 2, ['office-board'], 2013, { modules: ['m-library'] }),
  n('d-code', 'Языки программирования', 'Домен: модель, которая пишет и дополняет код.', 'code', 'domain', 2, ['d-docs'], 2015, { domains: ['code'] }),
  n('d-creative', 'Творческие инструменты', 'Домены: рекламные тексты, обработка звука, дизайн.', 'pen', 'domain', 2, ['d-docs'], 2015, { domains: ['copywrite', 'audio', 'arch'] }),
  n('d-generative', 'Генеративные модели', 'Домены: музыка и изображения по описанию.', 'image', 'domain', 2, ['p-gan'], 2015, { domains: ['music', 'imgen'] }),
  n('d-robotics', 'Управление телом', 'Домены: роботы-манипуляторы и беспилотный транспорт.', 'bot', 'domain', 2, ['p-rl'], 2015, { domains: ['robotics', 'autodrive'] }),
  n('d-speech2', 'Голосовой синтез', 'Домен: естественная речь из текста.', 'speaker', 'domain', 2, ['d-dialog'], 2016, { domains: ['tts'] }),
  n('d-space', 'Спутниковые данные', 'Домен: обработка снимков и телеметрии с орбиты.', 'rocket', 'domain', 2, ['d-geo'], 2016, { domains: ['space'] }),
  n('d-industry', 'Индустрия 4.0', 'Домены: контроль качества, энергетика и логистика.', 'factory', 'domain', 2, ['d-vision2'], 2016, { domains: ['manufacturing', 'energy', 'logistics'] }),
  n('p-transformer', 'Механизм внимания', 'Сеть смотрит на весь контекст сразу, а не по шагам.', 'target', 'paradigm', 2, ['p-cnn'], 2017, { paradigms: ['transformer'] }),
  n('p-gnn', 'Сети на графах', 'Обобщение на молекулы, дорожные сети и социальные связи.', 'nodes', 'paradigm', 2, ['p-cnn'], 2017, { paradigms: ['gnn'] }),
  n('fw-mixed', 'Смешанная точность', 'Функция фреймворка: вдвое быстрее обучение.', 'layers', 'framework', 2, ['fw-autodiff'], 2016, { features: ['mixed'] }),
  n('fw-dist', 'Распределённый трейнинг', 'Функция фреймворка: учимся на десятках ускорителей.', 'server', 'framework', 2, ['fw-autodiff'], 2016, { features: ['dist'] }),
  n('fw-compile', 'Компиляция графов', 'Функция фреймворка: граф модели превращается в быстрый код.', 'code', 'framework', 2, ['fw-mixed'], 2017, { features: ['compile'] }),
  n('fw-quant', 'Квантование', 'Функция фреймворка: модель легче, быстрее и дешевле.', 'chip', 'framework', 2, ['fw-autodiff'], 2017, { features: ['quant'] }),
  n('fw-auglib', 'Библиотека аугментаций', 'Функция фреймворка: готовые преобразования данных.', 'image', 'framework', 2, ['fw-datapipeline'], 2014, { features: ['auglib'] }),
  n('fw-eval', 'Автоматические бенчмарки', 'Функция фреймворка: тесты после каждого изменения.', 'target', 'framework', 2, ['fw-track'], 2015, { features: ['eval'] }),
  n('fw-prune', 'Прунинг', 'Функция фреймворка: лишние связи отрезаются без потери качества.', 'filter', 'framework', 2, ['fw-quant'], 2017, { features: ['prune'] }),
  n('fw-sched', 'Планировщик задач', 'Функция фреймворка: кластер никогда не простаивает.', 'calendar', 'framework', 2, ['fw-dist'], 2016, { features: ['sched'] }),
  n('fw-export', 'Экспорт моделей', 'Функция фреймворка: одна модель упакуется под любую платформу.', 'download', 'framework', 2, ['fw-quant'], 2016, { features: ['export'] }),
  n('mkt-pr', 'PR-отдел', 'Кампании: стенд на конференции, реклама и блогеры.', 'news', 'marketing', 2, ['mkt-social'], 2014, { campaigns: ['conf', 'ads', 'partner'] }),
  n('biz-contract', 'Договорной отдел', 'Можно вести два контракта клиентов одновременно.', 'briefcase', 'contract', 2, [], 2014, { maxContracts: 1 }),
  n('biz-investor', 'Фонд развития', 'Инвесторы предлагают деньги за долю в выручке.', 'hand', 'contract', 2, [], 2015, {}),
  n('biz-grants', 'Грантовый офис', 'Фонды дают деньги под исследовательские задачи.', 'gift', 'contract', 2, ['biz-investor'], 2016, {}),

  // ── ярус IV: зрелость ──
  n('scale-flagship', 'Флагманские модели', 'Большие проекты: месяцы работы и десятки тысяч очков.', 'trend', 'scale', 3, ['scale-product'], 2014, { scales: ['flagship'] }),
  n('office-campus', 'Переезд в кампус', 'Двадцать четыре рабочих места и собственная серверная.', 'office', 'office', 3, ['office-studio'], 2015, { offices: ['campus'] }),
  n('office-rest', 'Комната отдыха', 'Объект офиса: соседние столы выгорают медленнее.', 'sofa', 'office', 3, ['office-coffee'], 2015, { modules: ['m-rest'] }),
  n('office-server', 'Серверная', 'Объект офиса: соседние столы получают +скорость.', 'server', 'office', 3, ['office-library'], 2015, { modules: ['m-server'] }),
  n('course-arch', 'Архитектура моделей', 'Курс: +20 к исследованиям и +10 к инженерии.', 'nodes', 'course', 3, ['course-stats'], 2016, { courses: ['c-arch'] }),
  n('lab-tuning', 'Автоподбор гиперпараметров', 'Поиск конфигураций без рук: +6% качества и +8% скорости.', 'settings', 'special', 3, ['lab-repro'], 2016, { quality: 0.06, speed: 0.08 }),
  n('gpu-tuning', 'Тонкая настройка кластеров', 'Свои патчи к драйверам: −15% к стоимости вычислений.', 'chip', 'special', 3, ['fw-dist'], 2016, { gpuCost: 0.15 }),
  n('d-video', 'Синтез видео', 'Домены: генерация роликов и цифровые аватары.', 'film', 'domain', 3, ['d-generative'], 2017, { domains: ['vidgen', 'avatar'] }),
  n('d-city', 'Городская среда', 'Домен: транспортные потоки и городские сервисы.', 'city', 'domain', 3, ['d-industry'], 2017, { domains: ['urban'] }),
  n('d-science', 'ИИ для науки', 'Домены: климат, молекулы, материалы и теоремы.', 'flask', 'domain', 3, ['d-geo'], 2016, { domains: ['climate', 'chem', 'math'] }),
  n('d-bio', 'Биоинформатика', 'Домен: геномика и структура белков.', 'dna', 'domain', 3, ['d-life'], 2018, { domains: ['biotech'] }),
  n('p-moe', 'Маршрутизация экспертов', 'Запрос попадает к одному узкому эксперту, а не ко всей модели.', 'mix', 'paradigm', 3, ['p-transformer'], 2018, { paradigms: ['moe'] }),
  n('p-ssl', 'Предобучение без разметки', 'Модель учится на горах сырых данных.', 'stack', 'paradigm', 3, ['p-transformer'], 2018, { paradigms: ['ssl'] }),
  n('p-hybrid', 'Общие пространства модальностей', 'Текст, картинка и звук в одном векторном пространстве.', 'blend', 'paradigm', 3, ['p-transformer'], 2019, { paradigms: ['hybrid'] }),
  n('p-diffusion', 'Итеративная денойзация', 'Генерация как постепенное очищение от шума.', 'droplet', 'paradigm', 3, ['p-gan'], 2020, { paradigms: ['diffusion'] }),
  n('fw-shard', 'Шардирование моделей', 'Функция фреймворка: большая модель живёт на многих узлах.', 'mix', 'framework', 3, ['fw-dist'], 2019, { features: ['shard'] }),
  n('fw-synth', 'Синтетические данные', 'Функция фреймворка: недостающие примеры генерирует лаборатория.', 'spark', 'framework', 3, ['fw-auglib'], 2019, { features: ['synth'] }),
  n('fw-federated', 'Федеративное обучение', 'Функция фреймворка: обучение на данных клиентов.', 'globe', 'framework', 3, ['fw-dist'], 2018, { features: ['federated'] }),
  n('fw-serve', 'Оптимизированный сервинг', 'Функция фреймворка: батчирование и прогретые ядра инференса.', 'cloud', 'framework', 3, ['fw-quant'], 2018, { features: ['serve'] }),
  n('fw-cache', 'Кэш инференса', 'Функция фреймворка: повторные запросы не считаются заново.', 'stack', 'framework', 3, ['fw-serve'], 2020, { features: ['cache'] }),
  n('fw-distill', 'Дистилляция знаний', 'Функция фреймворка: открывает Mini-версии моделей.', 'copy', 'framework', 3, ['fw-quant'], 2020, { features: ['distill'] }),
  n('fw-guard', 'Фильтры вывода', 'Функция фреймворка: вредные ответы не покидают контур модели.', 'shield', 'framework', 3, ['fw-eval'], 2020, { features: ['guard'] }),
  n('mkt-show', 'Шоукастинг', 'Кампании: ключевой доклад, вирусное демо, серия публикаций и роуд-шоу.', 'megaphone', 'marketing', 3, ['mkt-pr'], 2016, { campaigns: ['talk', 'viral', 'series', 'roadshow'] }),

  // ── ярус V: масштаб ──
  n('d-agents', 'Агентные системы', 'Домен: автономные помощники, которые сами планируют шаги.', 'cpu', 'domain', 4, ['d-code', 'p-rl'], 2020, { domains: ['agents'] }),
  n('p-world', 'Предсказание следующих кадров', 'Мировые модели: обучение в собственном воображении.', 'cube', 'paradigm', 4, ['p-diffusion', 'p-transformer'], 2023, { paradigms: ['worldmodel'] }),
  n('fw-lora', 'LoRA-адаптеры', 'Функция фреймворка: дообучение за часы. Открывает файнтюны.', 'link', 'framework', 4, ['fw-quant', 'fw-cache'], 2021, { features: ['lora'] }),
  n('fw-rlhf', 'Пайплайн RLHF', 'Функция фреймворка: выравнивание по человеческим предпочтениям.', 'shieldCheck', 'framework', 4, ['fw-lora', 'fw-guard'], 2022, { features: ['rlhf'] }),
  n('course-scale', 'Масштабные системы', 'Курс: +18 к скорости и +14 к инженерии.', 'server', 'course', 4, ['course-mlops'], 2018, { courses: ['c-scale'] }),
  n('course-lead', 'Лидерство команд', 'Курс: +10 ко всем навыкам.', 'crown', 'course', 4, ['course-arch'], 2019, { courses: ['c-lead'] }),
  n('office-gym', 'Спортивный уголок', 'Объект офиса: соседние столы выгорают заметно медленнее.', 'dumbbell', 'office', 4, ['office-rest'], 2017, { modules: ['m-gym'] }),
  n('team-phd', 'Аспирантура', 'Своя аспирантура: +30% к исследовательским очкам.', 'grad', 'team', 4, ['team-pair'], 2018, { rp: 0.3 }),

  // ── ярус VI: передний край ──
  n('lab-frontier', 'Передовая лаборатория', 'Автономные эксперименты: +12% к скорости и качеству.', 'atom', 'special', 5, ['lab-tuning', 'team-phd'], 2024, { speed: 0.12, quality: 0.12 }),
  n('team-dream', 'Команда мечты', 'Лучшие в отрасли: +10% к качеству, −15% к выгоранию.', 'trophy', 'team', 5, ['course-lead', 'office-gym'], 2026, { quality: 0.1, burnout: -0.15 }),
  n('fw-omni', 'Омни-экспорт', 'Модель одновременно работает на всех платформах: +12% к выручке.', 'globe', 'framework', 5, ['fw-rlhf', 'fw-export'], 2028, { revenue: 0.12 }),
];

export const RESEARCH_BY_ID: Record<string, ResearchNode> = Object.fromEntries(RESEARCH.map((x) => [x.id, x]));

/** позиция узла внутри яруса — для раскладки дерева */
const perTier: number[] = [];
for (const node of RESEARCH) {
  node.row = perTier[node.tier] ?? 0;
  perTier[node.tier] = node.row + 1;
}

export function researchById(id: string): ResearchNode | null {
  return RESEARCH_BY_ID[id] ?? null;
}

/** название исследования для подсказок вида «нужно исследование: …» */
export function researchName(id: string | null): string | null {
  return id === null ? null : (RESEARCH_BY_ID[id]?.name ?? id);
}

export const RESEARCH_COUNT = RESEARCH.length;
