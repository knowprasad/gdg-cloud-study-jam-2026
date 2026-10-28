// Optional local browser smoke check. Set PREVIEW_PLAYWRIGHT to an installed
// Playwright index.mjs and PREVIEW_CHROMIUM to a local Chromium executable.
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PREVIEW_PLAYWRIGHT ? pathToFileURL(process.env.PREVIEW_PLAYWRIGHT).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.PREVIEW_CHROMIUM ? { executablePath: process.env.PREVIEW_CHROMIUM } : {}) });
const results = [];
const previewOrigin = process.env.PREVIEW_ORIGIN || 'http://localhost:5173';
try {
  for (const design of ['clubhouse', 'canvas', 'builders']) {
    for (const [width, height, label] of [[1440, 1000, 'desktop'], [390, 844, 'mobile']]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${previewOrigin}/?design=${design}`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: `design-previews/${design}-${label}.png`, fullPage: true, timeout: 15000 });
      results.push({ design, label, route: 'board', ...await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).length, rows: document.querySelectorAll('.person-row').length })), errors });
      await page.locator('#board-search').fill('zzzz-not-a-name');
      if (await page.locator('.empty-state').count() !== 1) throw Error('Missing empty state');
      await page.locator('#reset-search').click();
      await page.locator('#guild-filter').selectOption('Solo');
      if (!(await page.locator('#rows').innerText()).includes('Nandini Patel')) throw Error('Singleton guild filtering failed');
      await page.locator('#guild-filter').selectOption('All guilds');
      await page.locator('[data-find]').click();
      await page.locator('#find-query').fill('DEMO005');
      await page.locator('[data-person="demo-5"]').click();
      await page.waitForURL('**#home');
      await page.screenshot({ path: `design-previews/${design}-${label}-home.png`, fullPage: true, timeout: 15000 });
      results.push({ design, label, route: 'home', ...await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).length, collection: document.querySelectorAll('.collection-item').length, earned: document.querySelectorAll('.collection-item.earned').length })), errors });
      await page.goto(`${previewOrigin}/?design=${design}#leaderboard`);
      await page.locator('[data-find]').click();
      await page.locator('#find-query').fill('DEMO500');
      await page.locator('[data-person="demo-500"]').click();
      await page.waitForURL('**#home');
      if (await page.locator('.collection-item.earned').count() !== 0) throw Error('Zero-point profile completion mismatch');
      await page.goto(`${previewOrigin}/?design=${design}#leaderboard`);
      if (design === 'clubhouse' && !(await page.locator('.member-ticket').innerText()).includes('Nandini Patel')) throw Error('Member pass selection mismatch');
      if (design === 'canvas' && !(await page.locator('.collector-owner').innerText()).includes('Nandini Patel')) throw Error('Collector selection mismatch');
      if (design === 'builders' && !(await page.locator('.rivalry-person.current').innerText()).includes('Nandini Patel')) throw Error('Nearby learner selection mismatch');
      await page.locator('[data-find]').click();
      await page.locator('#find-query').fill('DEMO005');
      await page.locator('[data-person="demo-5"]').click();
      await page.waitForURL('**#home');
      await page.locator('#theme').click();
      if (await page.locator('html').getAttribute('data-theme') !== 'dark') throw Error('Theme switch failed');
      const canvas = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
      if (canvas !== ({clubhouse:'rgb(23, 33, 28)',canvas:'rgb(25, 28, 33)',builders:'rgb(19, 31, 45)'})[design]) throw Error('Dark canvas token failed');
      if (label === 'mobile') await page.screenshot({ path: `design-previews/${design}-mobile-dark.png`, fullPage: true, timeout: 15000 });
      await page.reload({ waitUntil: 'networkidle' });
      if (await page.locator('html').getAttribute('data-theme') !== 'dark') throw Error('Theme persistence failed');
      await page.goto(`${previewOrigin}/?design=${design}#badges`);
      await page.locator('#unfinished').check();
      if (await page.locator('.course-tile:visible').count() !== 3) throw Error('Badge filter failed');
      await context.close();
    }
  }
  await fs.writeFile('design-previews/verification.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.overflow || result.brokenImages || result.errors.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
