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

const executablePath = process.env.SMOKE_EXECUTABLE || undefined;
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : { channel: 'chrome' }) });
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

const version = browser.version();
console.log(`Браузер: Chrome ${version}, вьюпорт 390×844, file://`);

try {
  step('Загрузка одного файла по file://');
  await page.goto(pathToFileURL(path.join(root, 'dist', 'index.html')).href);
  await page.getByRole('heading', { level: 1 }).waitFor();
  check((await page.title()) === 'Neuro Lab Tycoon', 'заголовок вкладки «Neuro Lab Tycoon»');
  check(await page.getByRole('button', { name: 'Новая игра' }).isVisible(), 'в меню есть «Новая игра»');
  check(!(await page.getByRole('button', { name: 'Продолжить' }).first().isVisible()), 'без сейва кнопки «Продолжить» нет');
  await shot('01-menu');

  step('Интро и основание лаборатории');
  await page.getByRole('button', { name: 'Новая игра' }).tap();
  await page.getByRole('button', { name: 'Дальше' }).waitFor();
  await shot('02-intro');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Дальше' }).tap();
  await page.getByRole('button', { name: 'Открыть лабораторию' }).tap();
  await page.getByRole('tab', { name: 'Проект' }).waitFor();
  check(await page.getByText('янв 2012 · нед. 1').isVisible(), 'игра начинается с января 2012 года');
  await shot('03-game');

  step('Движок времени');
  await page.getByText('янв 2012 · нед. 2').waitFor({ timeout: 8000 });
  check(true, 'на скорости 1× неделя проходит за пару секунд');
  await page.getByRole('button', { name: 'Пауза' }).tap();
  const pausedAt = await page.locator('header').innerText();
  await page.waitForTimeout(3200);
  check((await page.locator('header').innerText()).includes(pausedAt.match(/нед\. \d+/)[0]), 'на паузе время стоит');
  await page.getByRole('button', { name: 'Ускорение ×4' }).tap();
  await page.waitForFunction((before) => /нед\. (\d+)/.exec(document.querySelector('header').innerText)?.[0] !== before, pausedAt.match(/нед\. \d+/)[0], { timeout: 6000 });
  check(true, 'скорость ×4 снова запускает время');
  await page.getByRole('button', { name: 'Пауза' }).tap();

  step('Шесть вкладок нижней навигции');
  for (const label of ['Проект', 'Лаборатория', 'Команда', 'Офис', 'Рынок', 'Ещё']) {
    await page.getByRole('tab', { name: label }).tap();
    check(await page.getByRole('heading', { name: label, level: 2 }).isVisible(), `вкладка «${label}» открывается`);
  }
  await shot('04-tab');

  step('Минимальная ширина 360px');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.getByRole('tab', { name: 'Лаборатория' }).tap();
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
  // подписи вкладок не должны слипаться в одну строку
  const boxes = await page.locator('nav button span').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
  let minGap = Infinity;
  for (let i = 1; i < boxes.length; i++) minGap = Math.min(minGap, boxes[i].left - boxes[i - 1].right);
  const targets = await page.locator('nav button').evaluateAll((els) => Math.min(...els.map((el) => el.getBoundingClientRect().height)));
  check(minGap >= 8, `промежуток между подписями вкладок ≥ 8px (фактически ${minGap.toFixed(1)}px)`);
  check(targets >= 44, `высота вкладок ≥ 44px (фактически ${targets}px)`);
  await page.setViewportSize({ width: 390, height: 844 });

  step('Сейв переживает перезагрузку файла');
  const before = await page.locator('header').innerText();
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить' }).waitFor();
  check(true, 'после перезагрузки в меню есть «Продолжить»');
  await page.getByRole('button', { name: 'Продолжить' }).tap();
  await page.getByRole('tab', { name: 'Проект' }).waitFor();
  const after = await page.locator('header').innerText();
  check(after.match(/нед\. \d+/)[0] === before.match(/нед\. \d+/)[0], 'неделя и лаборатория восстановлены из localStorage');
  check(await page.getByRole('button', { name: 'Пауза' }).getAttribute('aria-pressed') === 'true', 'после загрузки игра стоит на паузе');
} catch (err) {
  failures.push(`сценарий прерван: ${String(err).split('\n')[0]}`);
  console.log(`  ✗ сценарий прерван: ${String(err).split('\n').slice(0, 6).join('\n')}`);
  await shot('99-crash').catch(() => {});
}

step('Гигиена');
check(pageErrors.length === 0, `ошибок в консоли нет${pageErrors.length ? `: ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
check(external.length === 0, `внешних запросов нет${external.length ? `: ${external.slice(0, 5).join(', ')}` : ''}`);

await browser.close();
console.log(`\n${failures.length === 0 ? 'Смоук пройден' : `Смоук НЕ пройден: ${failures.length}`}`);
process.exit(failures.length === 0 ? 0 : 1);
