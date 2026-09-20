import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { product } from '../src/product.js';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(path.resolve(path.dirname(process.execPath), '../node_modules/playwright')); }
const browser = await playwright.chromium.launch({
  executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true, args: ['--enable-unsafe-swiftshader', '--no-first-run'],
});
const results = [];
const base = process.env.SITE_URL || 'http://127.0.0.1:4173/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const test = async (name, fn) => {
  try { const detail = await fn(); results.push({ name, passed: true, detail }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
};
await fs.mkdir('reports', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [], resourceErrors = [], externalRequests = [], environmentInjectedOrigins = new Set();
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) resourceErrors.push({ url: r.url(), status: r.status() }); });
  page.on('request', r => {
    if (r.url().startsWith(base) || r.url().startsWith('blob:') || r.url().startsWith('data:')) return;
    const url = new URL(r.url());
    // Local antivirus injects its script into HTTP documents. It is absent from the built site.
    if (url.hostname.endsWith('.kaspersky-labs.com')) environmentInjectedOrigins.add(url.origin);
    else externalRequests.push(url.origin + url.pathname);
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await test('页面正常加载且无外部网络依赖', async () => {
    assert.match(await page.title(), /VT助手/);
    await page.locator('.chip-scene[data-ready="true"]').waitFor();
    assert.equal(await page.locator('h1').count(), 1);
    assert.deepEqual(pageErrors, []); assert.deepEqual(resourceErrors, []); assert.deepEqual(externalRequests, []);
    const images = await page.locator('img').evaluateAll(items => items.filter(i => !i.complete || !i.naturalWidth).map(i => i.src));
    assert.deepEqual(images, []);
    assert.doesNotMatch(await fs.readFile('dist/index.html', 'utf8'), /kaspersky-labs\.com/);
    return { applicationExternalRequests: externalRequests, environmentInjectedOrigins: [...environmentInjectedOrigins] };
  });
  await test('主视觉存在实际动画', async () => {
    const one = await page.locator('.chip-scene canvas').screenshot();
    await page.waitForTimeout(600);
    const two = await page.locator('.chip-scene canvas').screenshot();
    assert.notEqual(hash(one), hash(two));
  });
  await test('各视口无横向溢出且首屏可见下载入口', async () => {
    const dimensions = [];
    for (const [width, height] of [[320, 740], [360, 800], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(100);
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, button: document.querySelector('.hero-actions .button').getBoundingClientRect().bottom }));
      assert.ok(layout.scroll <= width, JSON.stringify(layout)); assert.ok(layout.button < height, JSON.stringify(layout)); dimensions.push(layout);
    }
    return dimensions;
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await test('所有站内锚点均有效', async () => {
    const missing = await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.getAttribute('href').slice(1)).filter(id => !document.getElementById(id)));
    assert.deepEqual(missing, []);
    await page.locator('.desktop-nav a[href="#technology"]').click();
    await page.waitForTimeout(700);
    assert.ok(await page.locator('#technology').evaluate(el => Math.abs(el.getBoundingClientRect().top - 100) < 10));
  });
  await test('VT 指引弹窗与 Escape、焦点恢复', async () => {
    const opener = page.getByRole('button', { name: '我的电脑是否支持 VT？' });
    await opener.click();
    assert.ok(await page.locator('dialog').evaluate(el => el.open));
    assert.ok(await page.getByRole('heading', { name: '开始前，确认 VT 状态。' }).isVisible());
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').evaluate(el => el.open), false);
    assert.equal(await opener.evaluate(el => el === document.activeElement), true);
  });
  await test('场景切换支持点击和方向键', async () => {
    await page.getByRole('tab', { name: '沉浸探索' }).click();
    assert.match(await page.locator('#experience-panel').innerText(), /走进世界/);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: '日常开黑' }).getAttribute('aria-selected'), 'true');
    assert.match(await page.locator('#experience-panel').innerText(), /和队友一起/);
    await page.keyboard.press('Home');
    assert.equal(await page.getByRole('tab', { name: '竞技时刻' }).getAttribute('aria-selected'), 'true');
  });
  await test('FAQ 展开收起', async () => {
    const summary = page.locator('.faq-list summary').first(); await summary.click();
    assert.equal(await page.locator('.faq-list details').first().evaluate(el => el.open), true);
    await summary.click(); assert.equal(await page.locator('.faq-list details').first().evaluate(el => el.open), false);
  });
  await test('真实下载成功且逐字节校验原包', async () => {
    const pending = page.waitForEvent('download');
    await page.locator('.download-button').click();
    const downloaded = await pending;
    const file = await downloaded.path();
    assert.equal(downloaded.suggestedFilename(), 'VT助手.7z');
    const data = await fs.readFile(file);
    assert.equal(data.length, product.download.bytes); assert.equal(hash(data), product.download.sha256);
    const original = await fs.readFile('public/downloads/VT-Assistant-Mode2-Test.7z');
    assert.equal(hash(data), hash(original));
    return { bytes: data.length, sha256: hash(data), filename: downloaded.suggestedFilename() };
  });
  await test('损坏文件被拦截并支持重试', async () => {
    let downloadTriggered = false; const listener = () => { downloadTriggered = true; }; page.on('download', listener);
    await page.route('**/downloads/*.7z', route => route.fulfill({ status: 200, contentType: 'application/x-7z-compressed', body: 'not a valid archive' }));
    await page.locator('.download-button').click();
    await page.locator('.download-error').waitFor();
    assert.match(await page.locator('.download-feedback').innerText(), /下载未完成/);
    assert.equal(downloadTriggered, false);
    assert.equal(await page.locator('.download-button').isEnabled(), true);
    await page.unroute('**/downloads/*.7z'); page.off('download', listener);
    const pending = page.waitForEvent('download'); await page.locator('.download-button').click(); await pending;
  });
  await test('网络失败反馈', async () => {
    await page.route('**/downloads/*.7z', route => route.abort('failed'));
    await page.locator('.download-button').click(); await page.locator('.download-error').waitFor();
    assert.equal(await page.locator('.download-button').innerText(), '下载软件');
    await page.unroute('**/downloads/*.7z');
  });
  await test('页面不展示测试版或架构名称', async () => {
    assert.doesNotMatch(await page.locator('body').innerText(), /模式2|测试版|全新架构测试/);
    assert.doesNotMatch(await page.locator('body').innerText(), /[—–]/);
  });
  await test('浅色主题和偏好持久化', async () => {
    await page.getByRole('button', { name: '切换到浅色模式' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.screenshot({ path: 'reports/desktop-light.png' });
    await page.getByRole('button', { name: '切换到深色模式' }).click();
  });
  await test('移动导航点击关闭与 Escape', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: '打开导航菜单' }).click();
    assert.equal(await page.locator('#mobile-menu').isVisible(), true);
    await page.locator('#mobile-menu a[href="#download"]').click();
    assert.equal(await page.locator('#mobile-menu').count(), 0);
    await page.getByRole('button', { name: '打开导航菜单' }).click(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mobile-menu').count(), 0);
  });
  await test('减少动画偏好下保持静态', async () => {
    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await reduced.goto(base, { waitUntil: 'networkidle' });
    const one = await reduced.locator('.chip-scene canvas').screenshot(); await reduced.waitForTimeout(450);
    const two = await reduced.locator('.chip-scene canvas').screenshot(); assert.equal(hash(one), hash(two));
    assert.equal(await reduced.locator('html').evaluate(el => getComputedStyle(el).scrollBehavior), 'auto');
    await reduced.close();
  });
  await test('WebGL 不可用时提供静态芯片图', async () => {
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/.test(type) ? null : original.call(this, type, ...args); }; });
    await fallback.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await fallback.locator('.chip-scene').getAttribute('data-fallback'), 'true');
    assert.equal(await fallback.locator('.chip-fallback').isVisible(), true);
    assert.ok(await fallback.locator('.chip-fallback').evaluate(el => el.naturalWidth > 0));
    await fallback.close();
  });
  await test('直接打开交付 HTML 可显示且下载路径存在', async () => {
    const offline = await browser.newPage(); const offlineErrors = []; offline.on('pageerror', e => offlineErrors.push(e.message));
    await offline.goto(pathToFileURL(path.resolve('offline/index.html')).href, { waitUntil: 'networkidle' });
    assert.match(await offline.locator('h1').innerText(), /尽情释放/);
    assert.deepEqual(offlineErrors, []);
    assert.ok((await fs.stat(path.join('offline', product.download.url))).size === product.download.bytes);
    const pending = offline.waitForEvent('download');
    await offline.locator('.download-button').click();
    const downloaded = await pending;
    assert.equal(hash(await fs.readFile(await downloaded.path())), product.download.sha256);
    await offline.screenshot({ path: 'reports/offline.png' });
    await offline.close();
  });
  await test('最终浏览器无未捕获异常', async () => { assert.deepEqual(pageErrors, []); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const item of await page.locator('[data-reveal]').all()) { await item.scrollIntoViewIfNeeded(); await page.waitForTimeout(60); }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(750); await page.screenshot({ path: 'reports/desktop.png' }); await page.screenshot({ path: 'reports/desktop-full.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  await page.screenshot({ path: 'reports/mobile.png' }); await page.screenshot({ path: 'reports/mobile-full.png', fullPage: true });
  await context.close();
} finally {
  await browser.close();
  const report = { date: new Date().toISOString(), url: base, total: results.length, passed: results.filter(r => r.passed).length, results };
  await fs.writeFile('reports/verification.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ total: report.total, passed: report.passed }));
  if (report.total !== report.passed) process.exitCode = 1;
}
