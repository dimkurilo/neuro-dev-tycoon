import type { Domain, DomainGroup, FieldId } from '../types';
import type { IconName } from '../ui/icons';

const NONE: Record<FieldId, number> = {
  architecture: 0,
  dataSources: 0,
  task: 0,
  dataset: 0,
  hyperparams: 0,
  augmentation: 0,
  loss: 0,
  alignment: 0,
  inference: 0,
  interface: 0,
};

/** типовой профиль группы: где нужна наука, а где инженерия */
const GROUP_BIAS: Record<DomainGroup, Partial<Record<FieldId, number>>> = {
  vision: { architecture: 0.15, dataSources: -0.15, dataset: -0.2, hyperparams: -0.15, augmentation: -0.3, loss: 0.05, alignment: -0.2, inference: -0.3, interface: -0.2 },
  language: { architecture: 0.2, dataSources: -0.1, task: 0.1, dataset: -0.15, augmentation: -0.15, loss: 0.15, alignment: 0.15, inference: -0.2, interface: -0.15 },
  speech: { architecture: 0.15, dataSources: -0.15, dataset: -0.2, hyperparams: -0.15, augmentation: -0.15, loss: 0.05, alignment: -0.15, inference: -0.3, interface: -0.15 },
  generative: { architecture: 0.3, dataSources: -0.1, task: 0.05, dataset: -0.1, augmentation: -0.1, loss: 0.3, alignment: 0.2, inference: -0.2, interface: -0.1 },
  tabular: { architecture: -0.15, dataSources: -0.3, task: 0.05, dataset: -0.3, hyperparams: -0.15, augmentation: -0.25, alignment: 0.05, inference: -0.2, interface: -0.15 },
  science: { architecture: 0.15, task: 0.3, dataset: -0.15, augmentation: -0.15, loss: 0.2, inference: -0.15, interface: -0.3 },
  embodied: { architecture: 0.15, dataSources: -0.15, task: 0.3, dataset: -0.15, augmentation: -0.15, loss: 0.2, alignment: 0.15, inference: -0.3, interface: -0.15 },
  creative: { architecture: 0.15, dataset: -0.1, augmentation: -0.1, loss: 0.15, inference: -0.2, interface: 0.1 },
};

function d(
  id: string,
  name: string,
  icon: IconName,
  group: DomainGroup,
  desc: string,
  research: string | null,
  year: number,
  bias: Partial<Record<FieldId, number>>,
  prefix: string,
  ideal: string[],
  weird: string[],
): Domain {
  return { id, name, icon, group, desc, research, year, bias: { ...NONE, ...GROUP_BIAS[group], ...bias }, prefix, ideal, weird };
}

export const DOMAINS: Domain[] = [
  d('vision', 'Компьютерное зрение', 'eye', 'vision', 'Распознавание и анализ изображений и видео.', null, 2012, {}, 'Визи', ['cnn', 'transformer', 'hybrid'], ['symbolic', 'bayes', 'classical', 'neuroevo']),
  d('imgfilter', 'Обработка фото и видео', 'filter', 'vision', 'Шумоподавление, ретушь и эффекты для снимков.', 'd-vision2', 2014, {}, 'Пикс', ['cnn', 'diffusion', 'transformer'], ['symbolic', 'bayes', 'gnn']),
  d('meddiag', 'Медицинская диагностика', 'heart', 'science', 'Поиск патологий по снимкам и анализам.', 'd-life', 2014, { alignment: 0.1, interface: -0.05 }, 'Мед', ['cnn', 'hybrid', 'classical'], ['symbolic', 'gnn', 'worldmodel']),
  d('agro', 'Сельское хозяйство', 'leaf', 'vision', 'Мониторинг посевов и прогноз урожая по снимкам с дронов.', 'd-geo', 2014, {}, 'Агро', ['cnn', 'classical', 'gnn'], ['symbolic', 'gan', 'worldmodel']),
  d('space', 'Космические данные', 'rocket', 'vision', 'Обработка спутниковых снимков и телеметрии.', 'd-space', 2016, { task: 0.1 }, 'Орби', ['cnn', 'transformer', 'classical'], ['symbolic', 'gan', 'diffusion']),
  d('manufacturing', 'Контроль качества', 'factory', 'vision', 'Поиск дефектов продукции на конвейере.', 'd-industry', 2016, { interface: -0.05 }, 'Инсп', ['cnn', 'classical', 'ssl'], ['symbolic', 'gan', 'worldmodel']),

  d('nlp', 'Анализ текста', 'text', 'language', 'Классификация, извлечение сущностей и тональность текстов.', null, 2012, {}, 'Лингва', ['transformer', 'rnn', 'ssl'], ['cnn', 'symbolic', 'neuroevo']),
  d('translate', 'Машинный перевод', 'translate', 'language', 'Перевод текстов между языками.', null, 2012, { interface: -0.1 }, 'Мост', ['transformer', 'rnn', 'ssl'], ['symbolic', 'gnn', 'classical']),
  d('search', 'Поиск', 'search', 'language', 'Семантический поиск и ранжирование результатов.', null, 2012, { dataSources: 0.05 }, 'Финд', ['transformer', 'classical', 'hybrid'], ['symbolic', 'gan', 'diffusion']),
  d('legal', 'Юридический анализ', 'scale', 'language', 'Разбор договоров и судебной практики.', 'd-docs', 2014, { alignment: 0.1 }, 'Юр', ['transformer', 'symbolic', 'hybrid'], ['gan', 'diffusion', 'gnn']),
  d('education', 'Образование', 'grad', 'language', 'Адаптивные задания и автоматическая проверка ответов.', 'd-docs', 2015, { interface: 0.1 }, 'Лерн', ['transformer', 'hybrid', 'classical'], ['gan', 'diffusion', 'gnn']),
  d('content', 'Модерация контента', 'shieldCheck', 'language', 'Фильтрация токсичных текстов, картинок и комментариев.', 'd-docs', 2015, { alignment: 0.15 }, 'Щит', ['transformer', 'hybrid', 'cnn'], ['symbolic', 'neuroevo', 'worldmodel']),
  d('code', 'Генерация кода', 'code', 'language', 'Дополнение и генерация программного кода.', 'd-code', 2015, { alignment: -0.05, inference: -0.05 }, 'Код', ['transformer', 'symbolic', 'rl'], ['gan', 'diffusion', 'cnn']),
  d('dialog', 'Диалоговые ассистенты', 'chat', 'language', 'Помощники, которые понимают контекст разговора.', 'd-dialog', 2014, { alignment: 0.15, interface: 0.05 }, 'Диалог', ['transformer', 'hybrid', 'rl'], ['symbolic', 'gnn', 'cnn']),

  d('speech', 'Распознавание речи', 'mic', 'speech', 'Превращение устной речи в текст.', null, 2012, {}, 'Спич', ['transformer', 'cnn', 'rnn'], ['symbolic', 'bayes', 'gnn']),
  d('tts', 'Синтез речи', 'speaker', 'speech', 'Естественный голосовой вывод для любых текстов.', 'd-speech2', 2016, {}, 'Вокс', ['transformer', 'diffusion', 'rnn'], ['symbolic', 'bayes', 'classical']),
  d('audio', 'Обработка звука', 'wave', 'speech', 'Шумоподавление и разделение источников звука.', 'd-creative', 2015, {}, 'Аудио', ['cnn', 'transformer', 'diffusion'], ['symbolic', 'bayes', 'classical']),

  d('music', 'Генерация музыки', 'music', 'generative', 'Сочинение мелодий и аранжировок.', 'd-generative', 2015, {}, 'Мьюз', ['transformer', 'diffusion', 'rnn'], ['symbolic', 'classical', 'gnn']),
  d('imgen', 'Генерация изображений', 'image', 'generative', 'Картинки по текстовому описанию.', 'd-generative', 2015, {}, 'Арт', ['diffusion', 'gan', 'transformer'], ['symbolic', 'bayes', 'classical']),
  d('vidgen', 'Генерация видео', 'film', 'generative', 'Синтез и редактирование видеороликов.', 'd-video', 2017, { inference: -0.1 }, 'Кино', ['diffusion', 'transformer', 'worldmodel'], ['symbolic', 'bayes', 'classical']),
  d('avatar', 'Цифровые аватары', 'avatar', 'generative', 'Виртуальные ведущие с живым лицом и голосом.', 'd-video', 2018, { interface: 0.1 }, 'Ава', ['diffusion', 'gan', 'hybrid'], ['symbolic', 'bayes', 'classical']),

  d('recsys', 'Рекомендации', 'star', 'tabular', 'Персональные подборки товаров и контента.', null, 2012, { architecture: 0.05 }, 'Пик', ['classical', 'transformer', 'gnn'], ['gan', 'diffusion', 'symbolic']),
  d('credit', 'Кредитный скоринг', 'bank', 'tabular', 'Оценка платёжеспособности заёмщиков.', null, 2012, { alignment: 0.1 }, 'Скор', ['classical', 'bayes', 'transformer'], ['gan', 'diffusion', 'worldmodel']),
  d('fraud', 'Антифрод', 'card', 'tabular', 'Выявление мошеннических операций в реальном времени.', null, 2012, { inference: 0.1 }, 'Гард', ['classical', 'gnn', 'transformer'], ['gan', 'diffusion', 'symbolic']),
  d('forecast', 'Прогнозирование спроса', 'trend', 'tabular', 'Прогноз продаж и запасов для ритейла.', null, 2012, {}, 'Прог', ['classical', 'transformer', 'rnn'], ['gan', 'symbolic', 'neuroevo']),
  d('sport', 'Спортивная аналитика', 'ball', 'tabular', 'Разбор матчей и оценка игроков.', null, 2012, {}, 'Спорт', ['classical', 'transformer', 'cnn'], ['gan', 'diffusion', 'symbolic']),

  d('climate', 'Климат', 'thermo', 'science', 'Климатические модели и прогноз погоды.', 'd-science', 2016, { alignment: -0.15 }, 'Клим', ['classical', 'worldmodel', 'hybrid'], ['gan', 'symbolic', 'neuroevo']),
  d('energy', 'Энергетика', 'bolt', 'tabular', 'Прогноз нагрузки и баланс энергосетей.', 'd-industry', 2017, {}, 'Ватт', ['classical', 'transformer', 'rnn'], ['gan', 'diffusion', 'symbolic']),
  d('geology', 'Геологоразведка', 'mountain', 'science', 'Поиск месторождений по геофизическим данным.', 'd-geo', 2014, { interface: -0.1 }, 'Гео', ['cnn', 'classical', 'transformer'], ['symbolic', 'gan', 'diffusion']),
  d('chem', 'Молекулы и материалы', 'flask', 'science', 'Поиск новых молекул и веществ с нужными свойствами.', 'd-science', 2017, {}, 'Мол', ['gnn', 'diffusion', 'transformer'], ['symbolic', 'rnn', 'classical']),
  d('biotech', 'Геномика', 'dna', 'science', 'Анализ генома и предсказание структуры белков.', 'd-bio', 2018, { interface: -0.1 }, 'Ген', ['transformer', 'cnn', 'hybrid'], ['symbolic', 'gan', 'classical']),

  d('security', 'Кибербезопасность', 'shield', 'tabular', 'Обнаружение вторжений и вредоносного кода.', 'd-security', 2013, { alignment: 0.1 }, 'Секьюр', ['classical', 'transformer', 'gnn'], ['gan', 'diffusion', 'worldmodel']),
  d('robotics', 'Робототехника', 'bot', 'embodied', 'Управление манипуляторами и планирование движения.', 'd-robotics', 2015, {}, 'Робо', ['rl', 'cnn', 'hybrid'], ['symbolic', 'bayes', 'classical']),
  d('autodrive', 'Беспилотный транспорт', 'car', 'embodied', 'Восприятие дороги и решения за рулём.', 'd-robotics', 2016, { alignment: 0.15 }, 'Авто', ['cnn', 'transformer', 'rl'], ['symbolic', 'bayes', 'classical']),
  d('logistics', 'Логистика', 'truck', 'tabular', 'Маршруты, склады и сроки доставки.', 'd-industry', 2016, {}, 'Лог', ['classical', 'rl', 'transformer'], ['gan', 'diffusion', 'symbolic']),
  d('urban', 'Умный город', 'city', 'tabular', 'Транспортные потоки и городские сервисы.', 'd-city', 2017, {}, 'Сити', ['classical', 'transformer', 'gnn'], ['gan', 'diffusion', 'worldmodel']),
  d('agents', 'ИИ-агенты', 'cpu', 'embodied', 'Автономные помощники, которые сами планируют шаги.', 'd-agents', 2020, { alignment: 0.1 }, 'Агент', ['rl', 'transformer', 'hybrid'], ['symbolic', 'bayes', 'classical']),
  d('math', 'Математика и доказательства', 'sigma', 'science', 'Поиск доказательств и решение уравнений.', 'd-science', 2021, { interface: -0.2 }, 'Теор', ['symbolic', 'transformer', 'rl'], ['gan', 'diffusion', 'cnn']),
  d('games', 'Игровой ИИ', 'gamepad', 'embodied', 'Боты и персонажи с человеческим поведением.', 'd-games', 2014, { alignment: -0.2, interface: 0.1 }, 'Бот', ['rl', 'neuroevo', 'transformer'], ['bayes', 'diffusion', 'symbolic']),
  d('fitness', 'Здоровье и фитнес', 'pulse', 'tabular', 'Разбор тренировок и советы по самочувствию.', 'd-life', 2016, {}, 'Фит', ['classical', 'cnn', 'transformer'], ['gan', 'diffusion', 'symbolic']),
  d('arch', 'Архитектура и дизайн', 'ruler', 'creative', 'Генерация планировок и дизайн-концепций.', 'd-creative', 2017, {}, 'План', ['diffusion', 'transformer', 'hybrid'], ['symbolic', 'bayes', 'classical']),
];

export const DOMAIN_BY_ID: Record<string, Domain> = Object.fromEntries(DOMAINS.map((x) => [x.id, x]));

export function domainById(id: string): Domain {
  return DOMAIN_BY_ID[id] ?? DOMAINS[0];
}
