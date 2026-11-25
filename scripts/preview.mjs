#!/usr/bin/env node
// Скриншот вкладки на собранной игре с подставленным сейвом — для визуальной проверки.
// Запуск: npm run build && node scripts/preview.mjs <сейв.json> <вкладка> <скриншот.png> [ширина]
// Сейв — файл из «Сохранение → Скачать файл». Вкладка: Проект, Лаборатория, Команда, Офис, Рынок, Ещё.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { openGame } from './chrome.mjs';


const [savePath, tabName, outPath, widthArg] = process.argv.slice(2);
if (!savePath || !tabName || !outPath) {
  console.error('Использование: node scripts/preview.mjs <сейв.json> <вкладка> <скриншот.png> [ширина]');
  process.exit(2);
}
const save = JSON.parse(readFileSync(path.resolve(savePath), 'utf8'));
const width = Number(widthArg) || 390;
const height = width < 390 ? 740 : 844;

const { browser, page, errors } = await openGame({ save, width, height });
try {
  await page.getByRole('navigation').getByRole('tab', { name: tabName }).tap();
  await page.waitForTimeout(600);
  // длинные вкладки снимаются целиком: вьюпорт растягивается под длину страницы
  const extra = await page.evaluate(() => {
    const main = document.querySelector('main');
    return main ? Math.max(0, main.scrollHeight - main.clientHeight) : 0;
  });
  if (extra > 0) {
    await page.setViewportSize({ width, height: height + extra });
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: path.resolve(outPath) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${outPath}: ${width}×${height + extra}, вкладка «${tabName}»${overflow > 0 ? `, горизонтальное переполнение ${overflow}px` : ''}${errors.length ? `\nошибки: ${errors.slice(0, 3).join(' | ')}` : ''}`);
} finally {
  await browser.close();
}
