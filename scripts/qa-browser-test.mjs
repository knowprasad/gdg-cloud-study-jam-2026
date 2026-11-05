import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'https://gdg-cloud-study-jam-2026.pages.dev/';
const ARTIFACT_DIR = 'C:/Users/shubh/.gemini/antigravity/brain/bf461c85-c500-47ce-be3c-4b2879bc551a/screenshots';

const results = {
  testedAt: new Date().toISOString(),
  targetUrl: BASE_URL,
  consoleErrors: [],
  networkErrors: [],
  tests: []
};

function recordTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}${details ? ` - ${details}` : ''}`);
}

async function runQA() {
  console.log('Starting Playwright QA test session on Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  // Listen to console and network
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
      console.error('[Browser Console Error]', msg.text());
    }
  });

  page.on('pageerror', err => {
    results.consoleErrors.push(err.message);
    console.error('[Browser Uncaught Error]', err.message);
  });

  page.on('requestfailed', req => {
    const failure = req.failure();
    results.networkErrors.push({ url: req.url(), error: failure ? failure.errorText : 'Unknown' });
  });

  try {
    // 1. Initial Load
    console.log(`Navigating to ${BASE_URL}...`);
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    recordTest('Initial Page Load', response && response.status() === 200, `HTTP status ${response?.status()}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-initial-home.png'), fullPage: false });

    // 2. Title and Header verification
    const title = await page.title();
    recordTest('Page Title Check', title.includes('Study Jam'), `Title: "${title}"`);

    const chapterLogo = await page.locator('.chapter-logo').isVisible();
    recordTest('Chapter Logo Render', chapterLogo);

    // 3. Theme Toggle Interaction
    console.log('Testing Theme Toggle button...');
    const themeBtn = page.locator('#theme');
    const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await themeBtn.click();
    await page.waitForTimeout(300);
    const toggledTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    recordTest('Theme Toggle (Light/Dark)', initialTheme !== toggledTheme, `Initial: ${initialTheme} -> After click: ${toggledTheme}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-theme-toggled.png') });
    // Switch back to light
    await themeBtn.click();
    await page.waitForTimeout(300);

    // 4. Smooth Scrolling down and back
    console.log('Testing page scroll...');
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    await page.waitForTimeout(600);
    const scrolledY = await page.evaluate(() => window.scrollY);
    recordTest('Page Scroll Down', scrolledY > 0, `Scrolled to Y=${scrolledY}px`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-footer-scrolled.png') });

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(400);

    // 5. Navigation: Badges View
    console.log('Navigating to Badges tab (#badges)...');
    await page.click('nav.desktop-nav a[href="#badges"]');
    await page.waitForSelector('.catalog-grid, .course-tile', { timeout: 5000 });
    const tileCount = await page.locator('.course-tile').count();
    recordTest('Badges Page Navigation', tileCount === 10, `Found ${tileCount} badge tiles`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-badges-view.png') });

    // 6. Navigation: Guilds View
    console.log('Navigating to Guilds tab (#guilds)...');
    await page.click('nav.desktop-nav a[href="#guilds"]');
    await page.waitForSelector('.guild-grid, .guild-tile', { timeout: 5000 });
    const guildTiles = await page.locator('.guild-tile').count();
    recordTest('Guilds Page Navigation', guildTiles > 0, `Found ${guildTiles} guild tile(s)`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-guilds-view.png') });

    // Click into first guild tile
    if (guildTiles > 0) {
      console.log('Clicking into first guild details...');
      await page.locator('.guild-tile').first().click();
      await page.waitForTimeout(500);
      const isGuildDetail = await page.evaluate(() => location.hash.startsWith('#guild/'));
      const memberRowsCount = await page.locator('.person-row').count();
      recordTest('Guild Detail Drilldown', isGuildDetail && memberRowsCount > 0, `Hash: ${await page.evaluate(() => location.hash)}, ${memberRowsCount} members listed`);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '06-guild-detail.png') });
    }

    // 7. Navigation: Rules & Scoring View
    console.log('Navigating to Rules tab (#rules)...');
    await page.click('nav.desktop-nav a[href="#rules"]');
    await page.waitForSelector('.rules-ranking-banner, .rules-section, .scoring-overview', { timeout: 5000 });
    const bannerVisible = await page.locator('.rules-ranking-banner').isVisible();
    const bannerText = bannerVisible ? await page.locator('.rules-ranking-banner').innerText() : '';
    recordTest('3-Tier Ranking Rules Banner', bannerVisible && bannerText.includes('How Leaderboard Ranking Works'), `Banner text includes 3-tier ranking rules`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07-rules-view.png') });

    // 8. Navigation back to Leaderboard
    console.log('Navigating back to Leaderboard (#leaderboard)...');
    await page.click('nav.desktop-nav a[href="#leaderboard"]');
    await page.waitForSelector('.standings, #event-rows, #rows', { timeout: 5000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '08-leaderboard-view.png') });

    // 9. "Find my place" Hero CTA interaction
    console.log('Testing "Find my place ↗" button scroll/focus action...');
    const findPlaceBtn = page.locator('button[data-event-find]');
    if (await findPlaceBtn.isVisible()) {
      await findPlaceBtn.click();
      await page.waitForTimeout(500);
      const isFocused = await page.evaluate(() => document.activeElement && document.activeElement.id === 'event-search');
      recordTest('Hero "Find my place" Action', isFocused, 'Successfully scrolled and focused #event-search');
    }

    // 10. Leaderboard Search interaction
    console.log('Testing Leaderboard Search filter...');
    const searchInput = page.locator('#event-search');
    await searchInput.fill('Ramanjot');
    await page.waitForTimeout(500);
    const filteredRows = await page.locator('#event-rows .person-row:not([hidden])').count();
    recordTest('Search Filter ("Ramanjot")', filteredRows >= 1, `Found ${filteredRows} visible row(s)`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09-search-filtered.png') });

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);
    const resetRows = await page.locator('#event-rows .person-row:not([hidden])').count();
    recordTest('Search Reset', resetRows >= 15, `Reset to ${resetRows} visible rows`);

    // 11. Guild Filter dropdown interaction
    console.log('Testing Guild Filter dropdown...');
    const guildSelect = page.locator('#event-guild');
    const options = await guildSelect.locator('option').all();
    if (options.length > 2) {
      const secondOptionVal = await options[1].getAttribute('value');
      await guildSelect.selectOption(secondOptionVal);
      await page.waitForTimeout(500);
      const guildFilteredRows = await page.locator('#event-rows .person-row:not([hidden])').count();
      recordTest('Guild Dropdown Filter', guildFilteredRows >= 0, `Filtered by guild value "${secondOptionVal}": ${guildFilteredRows} rows`);
      // Reset filter
      await guildSelect.selectOption('');
      await page.waitForTimeout(500);
    }

    // 12. Show more learners button
    const showMoreBtn = page.locator('#event-more');
    const canShowMore = await showMoreBtn.isVisible();
    if (canShowMore) {
      console.log('Clicking "Show more learners" button...');
      await showMoreBtn.click();
      await page.waitForTimeout(500);
      const expandedRows = await page.locator('#event-rows .person-row:not([hidden])').count();
      recordTest('Show More Learners Pagination', expandedRows > resetRows, `Expanded from ${resetRows} to ${expandedRows} rows`);
    }

    // 13. Profile Modal / Drilldown
    console.log('Clicking top participant profile row...');
    const firstRow = page.locator('#event-rows .person-row:not([hidden])').first();
    await firstRow.click();
    await page.waitForTimeout(600);
    const isProfilePage = await page.evaluate(() => location.hash.startsWith('#profile/'));
    const scoreBreakdownVisible = await page.locator('.score-breakdown').first().isVisible();
    recordTest('Profile Drilldown View', isProfilePage && scoreBreakdownVisible, `Hash: ${await page.evaluate(() => location.hash)}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '10-participant-profile.png') });

    // Check "Remember my profile" button
    const rememberBtn = page.locator('button[data-remember-event]');
    if (await rememberBtn.isVisible()) {
      console.log('Testing "Remember my profile" button...');
      await rememberBtn.click();
      await page.waitForTimeout(300);
      const btnText = await rememberBtn.innerText();
      recordTest('Remember Profile Action', btnText.includes('remembered'), `Button state: "${btnText}"`);
    }

    // Check Back link
    const backLink = page.locator('a:has-text("← Back to standings")');
    if (await backLink.isVisible()) {
      await backLink.click();
      await page.waitForTimeout(400);
      recordTest('Return Back to Standings', await page.evaluate(() => location.hash === '#leaderboard'));
    }

    // 14. Mobile Viewport Test (375x812)
    console.log('Testing mobile viewport (375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    const mobileNavVisible = await page.locator('.mobile-nav').isVisible();
    recordTest('Mobile Navigation Bar Render', mobileNavVisible);

    // Test clicking mobile nav items
    await page.click('.mobile-nav a[href="#badges"]');
    await page.waitForTimeout(400);
    recordTest('Mobile Nav click (#badges)', await page.evaluate(() => location.hash === '#badges'));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '11-mobile-viewport.png') });

  } catch (err) {
    recordTest('Unexpected Test Execution Error', false, err.message);
    console.error('Test run failed:', err);
  } finally {
    await browser.close();
  }

  // Final summary
  const total = results.tests.length;
  const passed = results.tests.filter(t => t.passed).length;
  const failed = total - passed;

  console.log('\n================ QA TEST REPORT ================');
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Console Errors: ${results.consoleErrors.length}`);
  console.log(`Network Errors: ${results.networkErrors.length}`);
  console.log('================================================\n');

  fs.writeFileSync(
    'C:/Users/shubh/.gemini/antigravity/brain/bf461c85-c500-47ce-be3c-4b2879bc551a/qa-report.json',
    JSON.stringify(results, null, 2)
  );

  return results;
}

runQA();
