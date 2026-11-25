// Общий для скриптов проекта запуск браузера: установленный Google Chrome (channel "chrome");
// путь к другому Chromium задаётся в SMOKE_EXECUTABLE.
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SAVE_KEY = 'neuro-lab-tycoon-save';

/**
 * Запуск системного Chrome иногда зависает (процесс поднят, ответа нет), и таймаут Playwright
 * при этом не срабатывает. Поэтому гоняем запуск с собственным таймером и повторяем попытку;
 * поздно поднявшийся браузер закрываем, чтобы не оставлять сирот.
 */
export async function launchBrowser(attempts = 3) {
  const executablePath = process.env.SMOKE_EXECUTABLE || undefined;
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

/**
 * Открывает собранную игру в мобильном контексте. С сейвом — сразу продолжением партии
 * (иначе меню); errors собирает ошибки страницы. Браузер принадлежит вызывающему — закрыть.
 */
export async function openGame({ save = null, width = 390, height = 844 } = {}) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const contextOptions = { viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'ru-RU' };
  const { browser, page } = await launchPage(contextOptions);
  try {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(pathToFileURL(path.join(root, 'dist', 'index.html')).href);
    if (save) {
      await page.evaluate(([key, game]) => localStorage.setItem(key, JSON.stringify({ state: { game }, version: 1 })), [SAVE_KEY, save.game]);
      await page.reload();
      await page.getByRole('button', { name: 'Продолжить' }).tap();
      await page.waitForTimeout(300);
    }
    return { browser, page, errors };
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

/**
 * Браузер с готовой страницей. Зависнуть может не только запуск, но и открытие вкладки —
 * браузер поднят, а рендерера нет; поэтому вся подготовка тоже идёт под таймером и с повторами.
 */
export async function launchPage(contextOptions) {
  for (let attempt = 1; ; attempt++) {
    const browser = await launchBrowser();
    try {
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`страница не открылась за 45 с (попытка ${attempt})`)), 45000);
        browser
          .newContext(contextOptions)
          .then((context) => context.newPage().then((page) => ({ browser, context, page })))
          .then(
            (ready) => {
              clearTimeout(timer);
              resolve(ready);
            },
            (err) => {
              clearTimeout(timer);
              reject(err);
            },
          );
      });
    } catch (err) {
      await browser.close().catch(() => {});
      if (attempt >= 3) throw err;
      console.log(`  … ${err.message}; пробую ещё раз`);
    }
  }
}
