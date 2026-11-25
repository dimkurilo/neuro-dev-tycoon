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
/** вкладка нижней навигации (внутри страниц тоже есть кнопки-фильтры) */
const navTab = (name) => page.getByRole('navigation').getByRole('tab', { name });

const executablePath = process.env.SMOKE_EXECUTABLE || undefined;
// сторожевой таймер: зависший запуск браузера не должен держать терминал
const watchdog = setTimeout(() => {
  console.error('\nСмоук прерван: превышено общее время (180 с)');
  process.exit(2);
}, 180000);

/**
 * Запуск системного Chrome иногда зависает (процесс поднят, ответа нет), и таймаут Playwright
 * при этом не срабатывает. Поэтому гоняем запуск с собственным таймером и повторяем попытку;
 * поздно поднявшийся браузер закрываем, чтобы не оставлять сирот.
 */
async function launchBrowser(attempts = 3) {
  const options = { headless: true, timeout: 30000, ...(executablePath ? { executablePath } : { channel: 'chrome' }) };
  for (let attempt = 1; ; attempt++) {
    const pending = chromium.launch(options);
    const guard = new Promise((_, reject) =>
      setTimeout(() => {
        pending.then((b) => b.close().catch(() => {})).catch(() => {});
        reject(new Error(`запуск браузера не завершился за 45 с (попытка ${attempt})`));
      }, 45000),
    );
    try {
      return await Promise.race([pending, guard]);
    } catch (err) {
      if (attempt >= attempts) throw err;
      console.log(`  … ${err.message}; пробую ещё раз`);
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

/** закрывает очередь модалок-событий (достижения, новости, предупреждения), пока мир на паузе */
async function dismissModals(max = 6) {
  for (let i = 0; i < max; i++) {
    const btn = page.locator('[role="dialog"] button', { hasText: /^(Отлично|Понятно|Разобраться)$/ }).first();
    if ((await btn.count()) === 0) return;
    await btn.tap();
    await page.waitForTimeout(350);
  }
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
  await page.getByRole('button', { name: 'Новая игра' }).tap();
  await page.getByRole('button', { name: 'Дальше' }).waitFor();
  await page.waitForTimeout(300);
  await shot('02-intro');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Дальше' }).tap();
  await page.getByRole('button', { name: 'Открыть лабораторию' }).tap();
  await navTab('Проект').waitFor();
  check(await page.getByText('янв 2012 · нед. 1').isVisible(), 'игра начинается с января 2012 года');
  await shot('03-game');

  step('Движок времени');
  await page.getByText('янв 2012 · нед. 2').waitFor({ timeout: 8000 });
  check(true, 'на скорости 1× неделя проходит за пару секунд');
  await page.getByRole('button', { name: 'Пауза' }).tap();
  const pausedWeek = weekOf(await headerText());
  await page.waitForTimeout(3200);
  check(weekOf(await headerText()) === pausedWeek, 'на паузе время стоит');
  await page.getByRole('button', { name: 'Ускорение ×4' }).tap();
  await page.waitForFunction((before) => Number(/нед\. (\d+)/.exec(document.querySelector('header').innerText)?.[1]) > before, pausedWeek, { timeout: 6000 });
  await page.getByRole('button', { name: 'Пауза' }).tap();
  check(weekOf(await headerText()) > pausedWeek, 'скорость ×4 снова запускает время');

  step('Шесть вкладок нижней навигции');
  // [вкладка, заголовок экрана]
  const screens = [
    ['Проект', 'Первая модель — самая важная'],
    ['Лаборатория', 'Лаборатория'],
    ['Команда', 'Команда'],
    ['Офис', 'Офис'],
    ['Рынок', 'Платформы деплоя'],
    ['Ещё', 'Прошлая неделя'],
  ];
  for (const [tab, heading] of screens) {
    await navTab(tab).tap();
    check(await page.getByRole('heading', { name: heading }).first().isVisible(), `вкладка «${tab}» открывается`);
  }
  await shot('04-market');

  step('Минимальная ширина 360px');
  await page.setViewportSize({ width: 360, height: 740 });
  await navTab('Лаборатория').tap();
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
  await navTab('Проект').tap();
  const before = await headerText();
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить' }).tap();
  await navTab('Проект').waitFor();
  check(weekOf(await headerText()) === weekOf(before), 'неделя восстановлена из localStorage');
  check(await page.getByRole('button', { name: 'Пауза' }).getAttribute('aria-pressed') === 'true', 'после загрузки игра стоит на паузе');

  step('Мастер создания модели: домен и парадигма');
  await page.getByRole('button', { name: 'Новая модель' }).tap();
  await page.getByRole('heading', { name: 'Что будет делать модель?' }).waitFor();
  await page.getByRole('button', { name: 'Компьютерное зрение' }).tap();
  check(await page.getByText('Распознавание и анализ изображений и видео.').isVisible(), 'домен выбран, видно описание');
  await shot('06-wizard-domain');
  await page.getByRole('button', { name: 'Дальше' }).tap();
  await page.getByRole('button', { name: /Рекуррентные сети/ }).tap();
  await shot('07-wizard-paradigm');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Дальше' }).tap();
  await page.getByRole('heading', { name: 'Как назовём модель?' }).waitFor();
  const modelName = await page.getByLabel('Название модели').inputValue();
  check(modelName.length > 0, `название сгенерировано: «${modelName}»`);
  await shot('08-wizard-name');
  await page.getByRole('button', { name: 'Начать разработку' }).tap();
  await page.getByRole('heading', { name: modelName, level: 2 }).waitFor();
  check(await page.getByText('Замысел', { exact: true }).isVisible(), 'проект запущен, первая фаза — «Замысел»');
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
  await page.getByRole('button', { name: 'Ускорение ×4' }).tap();
  await page.getByRole('button', { name: 'Выпустить сейчас' }).waitFor({ timeout: 40000 });
  check(await page.getByRole('list', { name: 'Фазы проекта' }).getByText('Продукт', { exact: true }).isVisible(), 'фазы «Замысел», «Обучение» и «Продукт» пройдены');
  await shot('10-stabilization');
  await page.getByRole('button', { name: 'Выпустить сейчас' }).tap();

  step('Релиз: четыре оценки агентств');
  await page.getByText('Модель вышла в свет').waitFor({ timeout: 8000 });
  const scores = [];
  for (const agency of ['Открытый Лидерборд', 'Аудит Надёжного ИИ', 'Enterprise AI Review', 'НейроЖурнал']) {
    const row = page.locator('li', { hasText: agency }).first();
    check(await row.isVisible(), `оценка агентства «${agency}»`);
    const scoreLine = (await row.innerText()).split('\n').map((l) => l.trim()).find((l) => /^\d{1,2},\d$/.test(l));
    scores.push(scoreLine ? Number(scoreLine.replace(',', '.')) : NaN);
  }
  check(scores.every((s) => s >= 1 && s <= 10), `оценки в шкале 1–10: ${scores.join(', ')}`);
  await shot('11-release');
  await page.getByRole('button', { name: 'К продажам' }).tap();
  await page.getByText('Достижение').first().waitFor({ timeout: 4000 }).catch(() => {});
  check((await page.locator('[role="dialog"]').count()) > 0, 'за отчётом показано достижение «Первый релиз»');
  await dismissModals();

  step('Первая неделя продаж');
  let revenue = '';
  for (let i = 0; i < 40 && !revenue; i++) {
    await page.waitForTimeout(400);
    await dismissModals();
    const line = page.getByLabel(/Выручка за неделю/).first();
    if (await line.count()) revenue = await line.getAttribute('aria-label');
  }
  check(/Выручка за неделю: \+/.test(revenue), `первая неделя продаж принесла доход (${revenue.replace('Выручка за неделю: ', '')})`);
  const balance = /Баланс\s+(\S[\d\s.,]*\s(?:тыс\.|млн|млрд)?)/.exec(await headerText())?.[1] ?? '';
  check(balance !== '' && balance !== '70 тыс.', `баланс вырос после продаж (${balance})`);
  await shot('12-sales');

  step('Отчёт о релизе открывается из списка');
  await page.getByRole('button', { name: 'Пауза' }).tap();
  await page.getByText(modelName, { exact: true }).first().tap();
  await page.getByText('Что повлияло на оценки').waitFor();
  check(true, 'отчёт доступен после закрытия');
  await page.getByRole('button', { name: 'К продажам' }).tap();

  step('Рынок: кредит');
  await navTab('Рынок').tap();
  await page.getByRole('heading', { name: 'Кредит' }).scrollIntoViewIfNeeded();
  const loanButton = page.getByRole('button', { name: /^Взять в кредит/ }).first();
  await loanButton.tap();
  await page.getByText('долг', { exact: false }).first().waitFor();
  check(true, 'кредит оформлен, долг отображается');
  await shot('13-market');

  step('Команда: найм');
  await navTab('Команда').tap();
  await page.getByRole('heading', { name: 'Кандидаты' }).waitFor();
  await page.getByRole('button', { name: 'Нанять' }).first().tap();
  await page.getByText('2 из 3 мест').first().waitFor();
  check(true, 'кандидат нанят, занято 2 из 3 мест гаража');
  await dismissModals();
  await page.evaluate(() => document.querySelector('main').scrollTo(0, 0));
  await shot('14a-team-top');
  await page.getByRole('heading', { name: 'Бусты' }).scrollIntoViewIfNeeded();
  await shot('14-team');
  const focusSlider = page.getByLabel(/Фокус .*: доля исследований/).first();
  await focusSlider.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  check(Number(await focusSlider.inputValue()) === 55, 'слайдер фокуса сотрудника слушается (50% → 55%)');

  step('Лаборатория: первое исследование');
  await navTab('Лаборатория').tap();
  await page.getByRole('button', { name: 'Ускорение ×4' }).tap();
  const rpValue = async () => Number(/И-очки\s+(\d+)/.exec(await headerText())?.[1] ?? 0);
  for (let i = 0; i < 60 && (await rpValue()) < 20; i++) {
    await page.waitForTimeout(500);
    await dismissModals();
  }
  check((await rpValue()) >= 20, `исследовательские очки накопились (${await rpValue()})`);
  await page.getByRole('button', { name: /Глубокие свёртки/ }).tap();
  await page.getByText('Что даст').waitFor();
  await shot('15-research');
  await page.getByRole('button', { name: 'Начать исследование' }).tap();
  await page.getByRole('button', { name: /Глубокие свёртки[\s\S]*изучено/ }).waitFor({ timeout: 12000 });
  check(true, '«Глубокие свёртки» изучено — открыта парадигма свёрточных сетей');
  await shot('16-lab');
  await navTab('Проект').tap();
  await page.getByRole('button', { name: 'Новая модель' }).tap();
  await page.getByRole('button', { name: 'Компьютерное зрение' }).tap();
  await page.getByRole('button', { name: 'Дальше' }).tap();
  check(await page.getByRole('button', { name: /Свёрточные сети/ }).isVisible(), 'новая парадигма доступна в мастере');
  await dismissModals();
  await page.getByRole('button', { name: 'Закрыть' }).tap();
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
