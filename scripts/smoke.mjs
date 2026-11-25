#!/usr/bin/env node
// Playwright-смоук: открывает dist/index.html по file:// в мобильном вьюпорте 390×844
// и проигрывает сценарий настоящими тапами. Запуск: npm run build && npm run smoke
// Браузер — установленный Google Chrome (channel "chrome"); путь к другому Chromium
// можно передать в SMOKE_EXECUTABLE.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'test-results');
mkdirSync(shots, { recursive: true });

const failures = [];
function check(cond, label) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}
const step = (title) => console.log(`\n▸ ${title}`);
const shot = (name) => page.screenshot({ path: path.join(shots, `${name}.png`) });
const headerText = () => page.locator('header').innerText();
const weekOf = (text) => Number(/нед\. (\d+)/.exec(text)?.[1]);
const hypeOf = (text) => Number(/Хайп\s+(\d+)/.exec(text)?.[1]);
const rpValue = async () => Number(/И-очки\s+(\d+)/.exec(await headerText())?.[1] ?? 0);

/** вкладка нижней навигации (внутри страниц тоже есть кнопки-фильтры) */
const navTab = (name) => page.getByRole('navigation').getByRole('tab', { name });
/** подвкладка рынка */
const subTab = (name) => page.getByRole('group', { name: 'Разделы рынка' }).getByRole('button', { name });

const firstEventTitle = 'Краудсорсинговый датасет изображений';
const START_DOMAINS = ['Компьютерное зрение', 'Анализ текста', 'Распознавание речи', 'Рекомендации', 'Кредитный скоринг', 'Антифрод', 'Прогнозирование спроса', 'Поиск', 'Машинный перевод', 'Спортивная аналитика'];
const executablePath = process.env.SMOKE_EXECUTABLE || undefined;

/**
 * Запуск системного Chrome иногда зависает (процесс поднят, ответа нет), и таймаут Playwright
 * при этом не срабатывает. Поэтому гоняем запуск с собственным таймером и повторяем попытку;
 * поздно поднявшийся браузер закрываем, чтобы не оставлять сирот.
 */
async function launchBrowser(attempts = 3) {
  const options = { headless: true, timeout: 30000, ...(executablePath ? { executablePath } : { channel: 'chrome' }) };
  for (let attempt = 1; ; attempt++) {
    const pending = chromium.launch(options);
    let timer;
    const guard = new Promise((_, reject) => {
      timer = setTimeout(() => {
        pending.then((b) => b.close().catch(() => {})).catch(() => {});
        reject(new Error(`запуск браузера не завершился за 45 с (попытка ${attempt})`));
      }, 45000);
    });
    try {
      return await Promise.race([pending, guard]);
    } catch (err) {
      if (attempt >= attempts) throw err;
      console.log(`  … ${err.message}; пробую ещё раз`);
    } finally {
      // браузер поднялся — таймер больше не должен его закрывать
      clearTimeout(timer);
    }
  }
}

const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  locale: 'ru-RU',
});
const page = await context.newPage();
page.setDefaultTimeout(8000);

// сторожевой таймер: зависший шаг не должен держать терминал
const watchdog = setTimeout(() => {
  console.error('\nСмоук прерван: превышено общее время (240 с)');
  process.exit(2);
}, 240000);

const pageErrors = [];
const external = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') pageErrors.push(m.text());
});
page.on('request', (r) => {
  const u = r.url();
  if (!/^(file|data|blob|about):/.test(u)) external.push(u);
});

console.log(`Браузер: Chrome ${browser.version()}, вьюпорт 390×844, file://`);

/** закрывает очередь модалок-событий (новости, достижения, предупреждения), пока мир на паузе */
async function dismissModals(max = 6) {
  for (let i = 0; i < max; i++) {
    const dialog = page.getByRole('dialog').last();
    if ((await dialog.count()) === 0) return;
    // отчёты о релизе и фреймворке закрывает сам сценарий — их не трогаем
    const title = ((await dialog.locator('h2').first().innerText().catch(() => '')) ?? '').trim();
    if (!/^(Новости|Достижение|Баланс в минусе)$/.test(title)) return;
    await dialog.getByRole('button', { name: /^(Отлично|Понятно|Разобраться)$/ }).first().tap();
    await page.waitForTimeout(350);
  }
}

/** дождаться элемента в идущем мире: событийные модалки, остановившие время, закрываем */
async function settle(locator, timeout = 20000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await locator.first().isVisible().catch(() => false)) return;
    if (Date.now() > deadline) throw new Error(`элемент не появился за ${timeout} мс: ${locator}`);
    await dismissModals();
    await page.waitForTimeout(250);
  }
}

/**
 * Тап по интерфейсу с повтором: событие таймлайна может открыть модалку между проверкой
 * и нажатием — тогда тап перехвачен. Закрываем модалки событий и пробуем снова.
 */
async function tap(locator, tries = 4) {
  for (let i = 0; i < tries; i++) {
    await dismissModals();
    try {
      await locator.tap({ timeout: 4000 });
      return;
    } catch (err) {
      if (i === tries - 1) throw err;
      await page.waitForTimeout(400);
    }
  }
}

/** переход по нижней навигации */
const nav = (name) => tap(navTab(name));

/** отпустить текущий проект: «Отменить» → подтверждение */
async function cancelProject() {
  await tap(page.getByRole('button', { name: 'Отменить', exact: true }));
  await tap(page.getByRole('button', { name: 'Отменить проект', exact: true }));
  await page.getByRole('button', { name: 'Новая модель' }).waitFor();
}

/** дождаться нужного числа исследовательских очков (мир должен идти) */
async function waitForRp(target) {
  for (let i = 0; i < 120 && (await rpValue()) < target; i++) {
    await page.waitForTimeout(500);
    await dismissModals();
  }
  return rpValue();
}

try {
  step('Загрузка одного файла по file://');
  await page.goto(pathToFileURL(path.join(root, 'dist', 'index.html')).href);
  await page.getByRole('heading', { level: 1 }).waitFor();
  check((await page.title()) === 'Neuro Lab Tycoon', 'заголовок вкладки «Neuro Lab Tycoon»');
  check(await page.getByRole('button', { name: 'Новая игра' }).isVisible(), 'в меню есть «Новая игра»');
  check((await page.getByRole('button', { name: 'Продолжить' }).count()) === 0, 'без сейва кнопки «Продолжить» нет');
  await shot('01-menu');

  step('Интро и основание лаборатории');
  await tap(page.getByRole('button', { name: 'Новая игра' }));
  await page.getByRole('button', { name: 'Дальше' }).waitFor();
  await page.waitForTimeout(300);
  await shot('02-intro');
  for (let i = 0; i < 3; i++) await tap(page.getByRole('button', { name: 'Дальше' }));
  await tap(page.getByRole('button', { name: 'Открыть лабораторию' }));
  await navTab('Проект').waitFor();
  check(await page.getByText('янв 2012 · нед. 1').isVisible(), 'игра начинается с января 2012 года');
  await shot('03-game');

  step('Движок времени и первое событие таймлайна');
  await page.getByText('янв 2012 · нед. 2').waitFor({ timeout: 8000 });
  check(true, 'на скорости 1× неделя проходит за пару секунд');
  await tap(page.getByRole('button', { name: 'Пауза' }));
  const pausedWeek = weekOf(await headerText());
  await page.waitForTimeout(3200);
  check(weekOf(await headerText()) === pausedWeek, 'на паузе время стоит');
  await tap(page.getByRole('button', { name: 'Ускорение ×4' }));
  await page.waitForFunction((before) => Number(/нед\. (\d+)/.exec(document.querySelector('header').innerText)?.[1]) > before, pausedWeek, { timeout: 6000 });
  // на четвёртой неделе приходит новость — мир останавливается, пока её не закроют
  await page.getByText(firstEventTitle).first().waitFor({ timeout: 12000 });
  const frozenAt = weekOf(await headerText());
  await page.waitForTimeout(1500);
  check(weekOf(await headerText()) === frozenAt, 'открытая новость останавливает мир');
  await page.waitForTimeout(300);
  await shot('04-news-modal');
  await dismissModals();
  await tap(page.getByRole('button', { name: 'Пауза' }));
  check(weekOf(await headerText()) > pausedWeek, 'скорость ×4 снова запускает время');

  step('Шесть вкладок нижней навигации');
  // [вкладка, роль, что должно появиться]
  const screens = [
    ['Проект', 'heading', 'Первая модель — самая важная'],
    ['Лаборатория', 'heading', 'Лаборатория'],
    ['Команда', 'heading', 'Команда'],
    ['Офис', 'heading', 'Офис'],
    ['Рынок', 'button', 'Чарты'],
    ['Ещё', 'heading', 'Прошлая неделя'],
  ];
  for (const [tab, role, expected] of screens) {
    await nav(tab);
    check(await page.getByRole(role, { name: expected }).first().isVisible(), `вкладка «${tab}» открывается`);
  }
  await shot('04-market');

  step('Минимальная ширина 360px');
  await page.setViewportSize({ width: 360, height: 740 });
  await nav('Лаборатория');
  await page.waitForTimeout(250);
  await shot('05-min-360');
  const overflow = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('nav button, header *')) {
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis') bad.push(el.textContent);
    }
    return { bad, doc: document.documentElement.scrollWidth - window.innerWidth };
  });
  check(overflow.doc <= 0, 'страница не уезжает по горизонтали');
  check(overflow.bad.length === 0, `подписи навигации и топбара помещаются${overflow.bad.length ? `: ${overflow.bad.join(' | ')}` : ''}`);
  const boxes = await page.locator('nav button span').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
  let minGap = Infinity;
  for (let i = 1; i < boxes.length; i++) minGap = Math.min(minGap, boxes[i].left - boxes[i - 1].right);
  const navHeight = await page.locator('nav button').evaluateAll((els) => Math.min(...els.map((el) => el.getBoundingClientRect().height)));
  check(minGap >= 8, `промежуток между подписями вкладок ≥ 8px (фактически ${minGap.toFixed(1)}px)`);
  check(navHeight >= 44, `высота вкладок ≥ 44px (фактически ${navHeight}px)`);
  await page.setViewportSize({ width: 390, height: 844 });

  step('Сейв переживает перезагрузку файла');
  await nav('Проект');
  const before = await headerText();
  await page.reload();
  await tap(page.getByRole('button', { name: 'Продолжить' }));
  await navTab('Проект').waitFor();
  check(weekOf(await headerText()) === weekOf(before), 'неделя восстановлена из localStorage');
  check(await page.getByRole('button', { name: 'Пауза' }).getAttribute('aria-pressed') === 'true', 'после загрузки игра стоит на паузе');

  step('Мастер создания модели: домен и парадигма');
  await tap(page.getByRole('button', { name: 'Новая модель' }));
  await page.getByRole('heading', { name: 'Что будет делать модель?' }).waitFor();
  await tap(page.getByRole('button', { name: 'Компьютерное зрение' }));
  check(await page.getByText('Распознавание и анализ изображений и видео.').isVisible(), 'домен выбран, видно описание');
  await shot('06-wizard-domain');
  await tap(page.getByRole('button', { name: 'Дальше' }));
  await tap(page.getByRole('button', { name: /Рекуррентные сети/ }));
  await shot('07-wizard-paradigm');
  for (let i = 0; i < 4; i++) await tap(page.getByRole('button', { name: 'Дальше' }));
  await page.getByRole('heading', { name: 'Как назовём модель?' }).waitFor();
  const modelName = await page.getByLabel('Название модели').inputValue();
  check(modelName.length > 0, `название сгенерировано: «${modelName}»`);
  await shot('08-wizard-name');
  await tap(page.getByRole('button', { name: 'Начать разработку' }));
  await page.getByRole('heading', { name: modelName, level: 2 }).waitFor();
  check(await page.getByRole('list', { name: 'Фазы проекта' }).getByText('Замысел', { exact: true }).isVisible(), 'проект запущен, первая фаза — «Замысел»');
  await shot('09-project');

  step('Слайдер исследований и инженерии');
  const slider = page.getByLabel('Доля исследований в поле «Архитектура»');
  const start = Number(await slider.inputValue());
  await slider.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  const moved = Number(await slider.inputValue());
  check(moved === start + 10, `слайдер слушается: ${start}% → ${moved}%`);
  check(await page.getByText('Исследования 60%').first().isVisible(), 'подпись доли обновилась');

  step('Три фазы разработки и стабилизация');
  await tap(page.getByRole('button', { name: 'Ускорение ×4' }));
  await dismissModals();
  // если деградаций не было вовсе, модель выходит сама в начале стабилизации — раньше, чем кнопка
  const releaseButton = page.getByRole('button', { name: 'Выпустить сейчас' });
  const releaseTitle = page.getByText('Модель вышла в свет');
  await Promise.race([releaseButton.waitFor({ timeout: 40000 }), releaseTitle.waitFor({ timeout: 40000 })]).catch(() => {});
  const manual = (await releaseTitle.count()) === 0;
  check(
    manual
      ? await page.getByRole('list', { name: 'Фазы проекта' }).getByText('Продукт', { exact: true }).isVisible()
      : true,
    manual ? 'фазы «Замысел», «Обучение» и «Продукт» пройдены' : 'фазы пройдены, модель без деградаций вышла автоматически',
  );
  if (manual) {
    await shot('10-stabilization');
    await tap(releaseButton);
  }

  step('Релиз: четыре оценки агентств');
  await settle(page.getByText('Модель вышла в свет'));
  const scores = [];
  for (const agency of ['Открытый Лидерборд', 'Аудит Надёжного ИИ', 'Enterprise AI Review', 'НейроЖурнал']) {
    const row = page.locator('li', { hasText: agency }).first();
    check(await row.isVisible(), `оценка агентства «${agency}»`);
    const scoreLine = (await row.innerText()).split('\n').map((l) => l.trim()).find((l) => /^\d{1,2},\d$/.test(l));
    scores.push(scoreLine ? Number(scoreLine.replace(',', '.')) : NaN);
  }
  check(scores.every((s) => s >= 1 && s <= 10), `оценки в шкале 1–10: ${scores.join(', ')}`);
  await page.waitForTimeout(300);
  await shot('11-release');
  await tap(page.getByRole('button', { name: 'К продажам' }));
  await page.getByText('Достижение').first().waitFor({ timeout: 4000 }).catch(() => {});
  check((await page.locator('[role="dialog"]').count()) > 0, 'за отчётом показано достижение «Первый релиз»');
  await dismissModals();

  step('Первая неделя продаж');
  let revenue = '';
  for (let i = 0; i < 40 && !revenue; i++) {
    await page.waitForTimeout(400);
    await dismissModals();
    const line = page.getByLabel(/Выручка за неделю/).first();
    if (await line.count()) revenue = (await line.getAttribute('aria-label')) ?? '';
  }
  check(/Выручка за неделю: \+/.test(revenue), `первая неделя продаж принесла доход (${revenue.replace('Выручка за неделю: ', '')})`);
  const balance = /Баланс\s+(\S[\d\s.,]*\s(?:тыс\.|млн|млрд)?)/.exec(await headerText())?.[1] ?? '';
  check(balance !== '' && balance !== '70 тыс.', `баланс вырос после продаж (${balance})`);
  await shot('12-sales');

  step('Отчёт о релизе открывается из списка');
  await tap(page.getByRole('button', { name: 'Пауза' }));
  await tap(page.getByText(modelName, { exact: true }).first());
  await page.getByText('Что повлияло на оценки').waitFor();
  check(true, 'отчёт доступен после закрытия');
  await tap(page.getByRole('button', { name: 'К продажам' }));

  step('Рынок: кредит');
  await nav('Рынок');
  await tap(subTab('Деньги'));
  await page.getByRole('heading', { name: 'Кредит' }).scrollIntoViewIfNeeded();
  await tap(page.getByRole('button', { name: /^Взять в кредит/ }).first());
  await page.getByText('долг', { exact: false }).first().waitFor();
  check(true, 'кредит оформлен, долг отображается');
  await page.waitForTimeout(300);
  await shot('13-market');

  step('Команда: найм');
  await nav('Команда');
  await page.getByRole('heading', { name: 'Кандидаты' }).waitFor();
  await tap(page.getByRole('button', { name: 'Нанять' }).first());
  await page.getByText('2 из 3 мест').first().waitFor();
  check(true, 'кандидат нанят, занято 2 из 3 мест гаража');
  await dismissModals();
  await page.evaluate(() => document.querySelector('main').scrollTo(0, 0));
  await shot('14a-team-top');
  const focusSlider = page.getByLabel(/Фокус .*: доля исследований/).first();
  await focusSlider.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  check(Number(await focusSlider.inputValue()) === 55, 'слайдер фокуса сотрудника слушается (50% → 55%)');

  step('Лаборатория: исследования');
  await nav('Лаборатория');
  await tap(page.getByRole('button', { name: 'Ускорение ×4' }));
  check((await waitForRp(20)) >= 20, 'исследовательские очки накопились на первое исследование');
  await tap(page.getByRole('button', { name: /Глубокие свёртки/ }));
  await page.getByText('Что даст').waitFor();
  await shot('15-research');
  await tap(page.getByRole('button', { name: 'Начать исследование' }));
  await settle(page.getByRole('button', { name: /Глубокие свёртки[\s\S]*изучено/ }));
  check(true, '«Глубокие свёртки» изучено — открыта парадигма свёрточных сетей');
  await waitForRp(45);
  await tap(page.getByRole('button', { name: /Автоматическое дифференцирование/ }));
  await tap(page.getByRole('button', { name: 'Начать исследование' }));
  await settle(page.getByRole('button', { name: /Автоматическое дифференцирование[\s\S]*изучено/ }));
  check(true, '«Автоматическое дифференцирование» изучено');

  step('Свой фреймворк: сборка версии');
  await nav('Проект');
  await tap(page.getByRole('button', { name: 'Собрать' }));
  await page.getByRole('heading', { name: 'Свой фреймворк' }).waitFor();
  await tap(page.getByRole('button', { name: /Автодифф/ }));
  const buildButton = page.getByRole('button', { name: /^Собрать v1/ });
  await buildButton.waitFor();
  await page.waitForTimeout(300);
  await shot('17-framework');
  await tap(buildButton);
  // сильная команда собирает версию за одну неделю — экран проекта может промелькнуть
  const buildView = page.getByText('Функции новой версии');
  const buildDone = page.getByText(/Фреймворк v1 готов/);
  await Promise.race([buildView.waitFor({ timeout: 8000 }), buildDone.waitFor({ timeout: 8000 })]).catch(() => {});
  check((await buildDone.count()) > 0 || (await buildView.count()) > 0, 'проект фреймворка запущен');
  await settle(buildDone);
  check(await page.getByText('Градиенты для любого графа вычислений.').isVisible(), 'в отчёте перечислены функции новой версии');
  await tap(page.getByRole('dialog').getByRole('button', { name: 'Отлично' }));
  check(await page.getByText(/v1/).first().isVisible(), 'карточка фреймворка показывает версию 1');

  step('Версия модели');
  await tap(page.getByRole('button', { name: 'Новая версия модели' }));
  await page.getByRole('heading', { name: 'Новая версия модели' }).waitFor();
  const dialog = page.getByRole('dialog');
  await tap(dialog.getByRole('button', { name: new RegExp(modelName) }).first());
  await tap(dialog.getByRole('button', { name: /^Версия 2\.0/ }).first());
  await tap(page.getByRole('button', { name: /^Начать разработку ·/ }));
  await page.getByText('Версия 2.0', { exact: true }).first().waitFor();
  check(true, 'проект «Версия 2.0» запущен поверх выпущенной модели');
  await cancelProject();
  check(true, 'проект версии можно отменить');

  step('Рынок: новости и чарты');
  await nav('Рынок');
  await tap(subTab('Новости'));
  check(await page.getByText(firstEventTitle).first().isVisible(), 'событие таймлайна есть в новостной ленте');
  await page.waitForTimeout(250);
  await shot('18-news');
  await tap(subTab('Чарты'));
  check(await page.getByText(modelName, { exact: true }).first().isVisible(), 'модель игрока присутствует в чарте недели');
  await tap(page.getByRole('button', { name: 'Лидерборд' }));
  check(await page.getByRole('button', { name: 'Лидерборд' }).getAttribute('aria-pressed') === 'true', 'лидерборд переключается');
  await page.waitForTimeout(250);
  await shot('19-charts');

  step('Маркетинг: кампания разгоняет хайп');
  await nav('Лаборатория');
  await waitForRp(45);
  await tap(page.getByRole('button', { name: /Работа с аудиторией/ }));
  await tap(page.getByRole('button', { name: 'Начать исследование' }));
  await settle(page.getByRole('button', { name: /Работа с аудиторией[\s\S]*изучено/ }));
  check(true, '«Работа с аудиторией» изучено — кампании открыты');
  await nav('Рынок');
  await tap(subTab('Маркетинг'));
  const hypeBefore = hypeOf(await headerText());
  await tap(page.getByRole('button', { name: 'Запустить кампанию «Тизер в соцсетях»' }));
  let hypeAfter = hypeBefore;
  for (let i = 0; i < 20 && hypeAfter <= hypeBefore; i++) {
    await page.waitForTimeout(400);
    await dismissModals();
    hypeAfter = hypeOf(await headerText());
  }
  check(hypeAfter > hypeBefore, `кампания подняла хайп: ${hypeBefore} → ${hypeAfter}`);
  await page.waitForTimeout(250);
  await shot('20-marketing');

  step('Клиенты: заказ через мастер');
  await tap(subTab('Клиенты'));
  let offered = false;
  for (let i = 0; i < 50 && !offered; i++) {
    await page.waitForTimeout(400);
    await dismissModals();
    offered = (await page.getByRole('button', { name: 'Взять заказ' }).count()) > 0;
  }
  if (offered) {
    const takeButton = page.getByRole('button', { name: 'Взять заказ' }).first();
    const offerText = await takeButton.locator('xpath=ancestor::div[contains(@class,"rounded-card")][1]').innerText();
    const contractTitle = offerText.split('\n')[0].trim();
    const domain = START_DOMAINS.find((name) => offerText.includes(name));
    await tap(takeButton);
    await page.getByText('В работе', { exact: true }).waitFor();
    check(true, `заказ «${contractTitle}» взят в работу`);
    await page.waitForTimeout(250);
    await shot('21-clients');
    await nav('Проект');
    await tap(page.getByRole('button', { name: 'Новая модель' }));
    await tap(page.getByRole('button', { name: domain }));
    await tap(page.getByRole('button', { name: 'Дальше' }));
    await tap(page.getByRole('button', { name: /Рекуррентные сети/ }));
    for (let i = 0; i < 4; i++) await tap(page.getByRole('button', { name: 'Дальше' }));
    await page.getByRole('heading', { name: 'Заказ клиента' }).waitFor();
    const contractOption = page.getByRole('button', { name: new RegExp(contractTitle) });
    await tap(contractOption);
    check((await contractOption.getAttribute('aria-pressed')) === 'true', 'заказ выбирается в мастере');
    await tap(page.getByRole('button', { name: 'Начать разработку' }));
    await nav('Рынок');
    await tap(subTab('Клиенты'));
    check(await page.getByText('Модель под этот заказ уже в разработке').isVisible(), 'модель под заказ связана с заказом');
    // модель без деградаций могла выйти сама, пока шли предыдущие шаги, — тогда закрываем отчёт, а не отменяем
    let outcome = '';
    for (let i = 0; i < 6 && !outcome; i++) {
      const reportClose = page.getByRole('dialog').getByRole('button', { name: 'К продажам' });
      if (await reportClose.count()) await tap(reportClose);
      await dismissModals();
      await nav('Проект');
      if (await page.getByRole('button', { name: 'Новая модель' }).first().isVisible()) outcome = 'модель по заказу вышла в свет раньше отмены';
      else if (await page.getByRole('button', { name: 'Отменить', exact: true }).first().isVisible()) {
        await cancelProject();
        outcome = 'проект по заказу можно отменить';
      }
    }
    check(outcome !== '', outcome || 'на вкладке «Проект» нет ни проекта, ни кнопки «Новая модель»');
  } else {
    console.log('  • предложения клиентов не поступили за отведённое время — шаг пропущен');
  }
} catch (err) {
  failures.push(`сценарий прерван: ${String(err).split('\n')[0]}`);
  console.log(`  ✗ сценарий прерван: ${String(err).split('\n').slice(0, 6).join('\n')}`);
  await shot('99-crash').catch(() => {});
}

step('Гигиена');
check(pageErrors.length === 0, `ошибок в консоли нет${pageErrors.length ? `: ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
check(external.length === 0, `внешних запросов нет${external.length ? `: ${external.slice(0, 5).join(', ')}` : ''}`);

await browser.close();
clearTimeout(watchdog);
console.log(`\n${failures.length === 0 ? 'Смоук пройден' : `Смоук НЕ пройден: ${failures.length}`}`);
process.exit(failures.length === 0 ? 0 : 1);
