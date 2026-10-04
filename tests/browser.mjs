import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { serve } from '../tools/serve.mjs';
import { whatsappLinks } from '../script.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const agents = {
  iosTikTok: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 musical_ly_2023501030 Safari/604.1',
  androidTikTok: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36 TikTok',
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36',
  unknown: 'UnknownBrowser'
};
const server = serve(0);
await new Promise(resolve => server.on('listening', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}), headless: true });
const results = [];
await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
try {
  for (const [name, userAgent] of Object.entries(agents)) {
    for (const [width, height] of [[320,568],[360,800],[375,667],[390,844],[393,852],[412,915],[430,932],[1440,900]]) {
      const context = await browser.newContext({ userAgent, viewport: { width, height }, reducedMotion: 'reduce' });
      const page = await context.newPage(); const errors = [], redirects = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
      await context.route('https://wa.me/**', route => { redirects.push(route.request().url()); return route.fulfill({ status: 200, body: '<h1>WhatsApp test destination</h1>' }); });
      await page.goto(origin + '/?utm_source=tiktok&utm_campaign=bio');
      const mobile = name === 'safari' || name === 'android';
      if (mobile) {
        await page.waitForURL('https://wa.me/**');
        assert.equal(redirects.length, 1); assert.equal(redirects[0], whatsappLinks().web);
        await page.goBack(); await page.waitForTimeout(800);
        assert.equal(redirects.length, 1);
        await page.reload(); await page.waitForTimeout(800); assert.equal(redirects.length, 1);
      } else {
        await page.waitForTimeout(750); assert.equal(redirects.length, 0);
      }
      const guide = name.includes('TikTok');
      assert.equal(await page.locator('#guide').isVisible(), guide);
      assert.equal(await page.locator('#arrow').isVisible(), guide);
      if (guide) {
        const visibleText = await page.locator('body').innerText();
        for (const forbidden of ['Morris', 'Community gratuita', 'Continua su WhatsApp', 'APRI WHATSAPP', 'UN MESSAGGIO']) assert.ok(!visibleText.includes(forbidden), forbidden);
        assert.ok(visibleText.includes('APRI NEL BROWSER'));
        assert.ok(visibleText.includes('Premi i 3 puntini'));
        const arrow = await page.locator('#arrow').boundingBox();
        assert.ok(arrow.width >= 180 && arrow.height >= 170);
        assert.ok(arrow.x + arrow.width >= width - 20 && arrow.y <= 20);
      }
      assert.equal(await page.locator('#debug').isVisible(), false);
      assert.equal(await page.locator('#cta').isVisible(), !guide);
      assert.equal(await page.locator('#cta').getAttribute('href'), whatsappLinks().web);
      const layout = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, minFont: Math.min(...[...document.querySelectorAll('h1,p,li,footer,a')].filter(e=>e.getBoundingClientRect().height).map(e=>parseFloat(getComputedStyle(e).fontSize))), arrow: getComputedStyle(document.querySelector('#arrow')).animationName }));
      assert.ok(layout.width <= layout.viewport, `${name} ${width}: overflow`);
      assert.ok(layout.minFont >= 16); assert.equal(layout.arrow, 'none');
      if (!guide) assert.ok((await page.locator('#cta').boundingBox()).height >= 44);
      assert.deepEqual(errors, []);
      if (width === 390 || width === 320 || (name === 'desktop' && width === 1440)) await page.screenshot({ path: new URL(`../test-results/${name}-${width}.png`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true });
      results.push(`${name} ${width}x${height}: PASS`);
      await context.close();
    }
  }
  const debugContext = await browser.newContext({ userAgent: agents.iosTikTok, viewport: { width: 390, height: 844 } });
  const debugPage = await debugContext.newPage();
  await debugPage.goto(origin + '/?debug=1');
  assert.ok(await debugPage.locator('#debug').isVisible());
  assert.match(await debugPage.locator('#debug').innerText(), /TikTok browser: true/);
  assert.notEqual(await debugPage.locator('#arrow').evaluate(e => getComputedStyle(e).animationName), 'none');
  await debugPage.screenshot({ path: new URL('../test-results/tiktok-debug.png', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true });
  await debugContext.close();
  results.push('Debug opt-in and arrow animation: PASS');
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage(); await page.goto(origin);
  assert.equal(await page.locator('#cta').getAttribute('href'), whatsappLinks().web);
  assert.ok(await page.locator('#cta').isVisible()); await context.close();
  results.push('JavaScript disabled: PASS');
  await writeFile(new URL('../test-results/browser-results.txt', import.meta.url), results.join('\n'));
  console.log(results.join('\n'));
} finally { await browser.close(); server.close(); }

