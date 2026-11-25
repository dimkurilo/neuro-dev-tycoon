#!/usr/bin/env node
// Мобильный аудит собранной игры: обходит экраны, вкладки и листы на заданной ширине и собирает
// дефекты — горизонтальное переполнение, обрезанный текст, зоны нажатия меньше 44px, текст мельче 10px.
// Запуск: npm run build && node scripts/audit.mjs [ширина=360]
// Состояния игры берутся из партий бота (первый и восьмой год, банкротство).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openGame } from './chrome.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const width = Number(process.argv[2]) || 360;
const height = width < 390 ? 740 : 844;
const savesDir = path.join(root, 'test-results', 'saves');
mkdirSync(savesDir, { recursive: true });
const listed = execFileSync('npx', ['vitest', 'run', 'src/sim/balance.test.ts', '-t', 'визуальной'], {
  cwd: root,
  env: { ...process.env, BALANCE_SAVES: '1' },
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
for (const line of listed.split('\n')) {
  if (!line.startsWith('SAVE ')) continue;
  const space = line.indexOf(' ', 5);
  writeFileSync(path.join(savesDir, `${line.slice(5, space)}.json`), line.slice(space + 1));
}
const save = (name) => JSON.parse(readFileSync(path.join(savesDir, `${name}.json`), 'utf8'));

/** собирает дефекты видимой части приложения; при открытом листе — только внутри него */
const collect = () =>
  page.evaluate(() => {
    const vw = window.innerWidth;
    const scope = document.querySelector('[role="dialog"]') ?? document.querySelector('#root');
    const own = (el) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    const label = (el) => {
      const cls = String(el.getAttribute('class') ?? '').split(' ').slice(0, 3).join('.');
      const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\\s+/g, ' ').slice(0, 30);
      return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''} «${name}»`;
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
    };
    const out = { overflow: [], clipped: [], small: [], tiny: [], ellipsis: [] };
    const docOver = document.documentElement.scrollWidth - vw;
    if (!document.querySelector('[role="dialog"]') && docOver > 0) out.overflow.push(`страница шире экрана на ${docOver}px`);
    for (const el of scope.querySelectorAll('*')) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      if (!visible(el) || el.closest('[aria-hidden="true"]')) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const scroller = el.closest('.overflow-x-auto');
      if (!scroller && (r.right > vw + 1 || r.left < -1)) out.overflow.push(`${label(el)} → ${Math.round(Math.max(r.right - vw, -r.left))}px за краем`);
      if (own(el)) {
        if (cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.clipped.push(`${label(el)}: обрезано ${el.scrollWidth - el.clientWidth}px`);
        if (cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 1) out.clipped.push(`${label(el)}: обрезано по высоте ${el.scrollHeight - el.clientHeight}px`);
        if (parseFloat(cs.fontSize) < 10) out.tiny.push(`${label(el)}: ${cs.fontSize}`);
        // многоточие — законное сокращение, но в шапке и плитках оно прячет смысл: выдаём списком на обзор
        if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.ellipsis.push(`${label(el)}: не влезло ${el.scrollWidth - el.clientWidth}px`);
      }
    }
    for (const el of scope.querySelectorAll('button, [role="button"], a[href], input, select, textarea, [role="switch"]')) {
      if (!visible(el) || el.closest('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 44 || r.width < 44) out.small.push(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });

const KIND_NAMES = {
  overflow: 'Горизонтальное переполнение',
  clipped: 'Обрезанный текст',
  small: 'Зоны нажатия меньше 44px',
  tiny: 'Текст мельче 10px',
  unopened: 'Экран не удалось открыть',
  // информационно: законное сокращение, которое стоит просмотреть глазами
  ellipsis: 'Сокращено многоточием',
};
const issues = [];
const seen = new Set();
const errors = [];
let page;
let pageErrors = [];

/** проверяет текущий экран; один и тот же элемент на разных экранах считается один раз */
async function audit(label) {
  await page.waitForTimeout(300);
  const found = await collect();
  for (const [kind, list] of Object.entries(found)) {
    for (const item of list) {
      if (seen.has(item)) continue;
      seen.add(item);
      issues.push({ kind, label, item });
    }
  }
}

const dialog = () => page.getByRole('dialog');
async function closeSheet() {
  if (await dialog().count()) await dialog().getByRole('button', { name: 'Закрыть' }).tap({ timeout: 3000 });
  await page.waitForTimeout(250);
}
/** открывает лист, проверяет его и закрывает; если открыть не вышло — записывает причину */
async function sheet(label, open) {
  try {
    await open();
    await audit(label);
  } catch (err) {
    issues.push({ kind: 'unopened', label, item: String(err).split('\n')[0] });
  }
  await closeSheet().catch(() => {});
}

let browser = null;
try {
  ({ browser, page } = await openGame({ width, height }));
  page.setDefaultTimeout(6000);
  await audit('Меню');
  await page.getByRole('button', { name: 'Новая игра' }).tap();
  for (let i = 1; ; i++) {
    await audit(`Интро, слайд ${i}`);
    const next = page.getByRole('button', { name: 'Дальше' });
    if (!(await next.count())) break;
    await next.tap();
  }
  await page.getByRole('button', { name: 'Открыть лабораторию' }).tap();
  await page.getByRole('navigation').waitFor();
  await audit('Игра: первый экран');
  await browser.close();

  ({ browser, page, errors: pageErrors } = await openGame({ save: save('year8'), width, height }));
  errors.push(...pageErrors);
  page.setDefaultTimeout(6000);
  const nav = (name) => page.getByRole('navigation').getByRole('tab', { name }).tap();
  /** вкладки-«таблетки» внутри экрана: рынок и ярусы исследований */
  const pills = async (label) => {
    const group = page.getByRole('group', { name: label });
    const count = await group.getByRole('button').count();
    for (let i = 0; i < count; i++) {
      const pill = group.getByRole('button').nth(i);
      await pill.tap();
      await audit(`${label}: ${(await pill.innerText()).trim().replace(/\s+/g, ' ')}`);
    }
  };

  await nav('Проект');
  await audit('Проект');
  // в зрелой партии проект уже идёт: отменяем, чтобы открылись мастер и листы версий
  if (await page.getByRole('button', { name: 'Отменить', exact: true }).count()) {
    await page.getByRole('button', { name: 'Отменить', exact: true }).tap();
    await page.getByRole('button', { name: 'Отменить проект', exact: true }).tap();
    await page.waitForTimeout(300);
  }
  await sheet('Мастер модели', async () => {
    await page.getByRole('button', { name: 'Новая модель' }).tap();
    for (let i = 1; ; i++) {
      await audit(`Мастер модели, шаг ${i}`);
      const next = dialog().getByRole('button', { name: 'Дальше' });
      if (!(await next.count())) break;
      if (await next.isDisabled()) {
        // шаг требует выбора — берём первую доступную опцию
        const option = dialog().locator('button[aria-pressed]:not([aria-pressed="true"])').first();
        if (!(await option.count())) break;
        await option.tap();
      }
      await next.tap();
    }
  });
  await sheet('Фреймворк: сборка версии', () => page.getByRole('button', { name: /^(Собрать|Обновить)$/ }).tap());
  await sheet('Новая версия модели', () => page.getByRole('button', { name: 'Новая версия модели' }).tap());
  await sheet('Отчёт о релизе', async () => {
    await page.locator('main [role="button"]').first().tap();
    await dialog().getByRole('button', { name: 'К продажам' }).waitFor();
  });

  await nav('Лаборатория');
  await audit('Лаборатория');
  await pills('Разделы исследований');
  await sheet('Исследование', async () => {
    const buttons = page.locator('main button:not([disabled])');
    for (let i = 0; i < (await buttons.count()); i++) {
      if (await buttons.nth(i).evaluate((el) => el.closest('[role="group"]') !== null)) continue;
      await buttons.nth(i).tap();
      if (await dialog().count()) return;
    }
    throw new Error('ни один узел не открыл лист исследования');
  });

  await nav('Команда');
  await audit('Команда');
  await sheet('Курсы', () => page.getByRole('button', { name: 'Обучить' }).first().tap());

  await nav('Офис');
  await audit('Офис');
  await sheet('Офис: выбран сотрудник', async () => {
    const seat = page.getByRole('group', { name: 'План офиса' }).getByRole('button', { name: /: переставить$/ }).first();
    await seat.tap();
    await page.getByText(/Нажмите на другой стол/).waitFor();
    await seat.tap(); // снять выбор, чтобы следующий лист начинался с чистого плана
  });
  await sheet('Офис: выбран объект', async () => {
    const plan = page.getByRole('group', { name: 'План офиса' });
    const object = plan.locator('button:not([aria-label$=": переставить"])').first();
    await object.tap();
    await plan.getByRole('button', { name: 'Свободная клетка' }).first().waitFor();
  });

  await nav('Рынок');
  await audit('Рынок');
  await pills('Разделы рынка');

  await nav('Ещё');
  await audit('Ещё');
  await sheet('Достижения', () => page.locator('main [role="button"]', { hasText: 'Достижения' }).tap());
  await sheet('Сохранение: экспорт и импорт', async () => {
    await page.getByRole('button', { name: 'Сохранение и перенос' }).tap();
    await audit('Сохранение: экспорт');
    await dialog().getByRole('tab', { name: 'Импорт' }).tap();
  });

  await browser.close();
  ({ browser, page, errors: pageErrors } = await openGame({ save: save('broke'), width, height }));
  errors.push(...pageErrors);
  page.setDefaultTimeout(6000);
  await page.getByRole('button', { name: 'Ускорение ×4' }).tap();
  await page.getByRole('heading', { name: 'Банкротство' }).waitFor({ timeout: 20000 });
  await audit('Банкротство');
} finally {
  await browser?.close();
}

console.log(`\nМобильный аудит, ширина ${width}px`);
let hard = errors.length;
for (const kind of Object.keys(KIND_NAMES)) {
  const list = issues.filter((i) => i.kind === kind);
  if (kind === 'overflow') hard += list.length;
  console.log(`\n${KIND_NAMES[kind]}: ${list.length}`);
  for (const i of list) console.log(`  • [${i.label}] ${i.item}`);
}
if (errors.length) console.log(`\nОшибки страницы: ${errors.length}\n  ${errors.slice(0, 5).join('\n  ')}`);
console.log(`\n${hard === 0 ? 'Аудит пройден' : `Аудит НЕ пройден: жёстких дефектов ${hard}`}`);
process.exit(hard === 0 ? 0 : 1);
