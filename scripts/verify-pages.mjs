import http from 'node:http';
import fs from 'node:fs';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { product } from '../src/product.js';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(path.resolve(path.dirname(process.execPath), '../node_modules/playwright')); }
const remote = process.env.SITE_URL;
let server, browser;
const results = [];
const root = path.resolve('dist');
const prefix = '/vt-assistant/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.7z': 'application/x-7z-compressed' };
try {
  let url = remote;
  if (!url) {
    server = http.createServer(async (req, res) => {
      try {
        const route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (route === prefix.slice(0, -1)) { res.writeHead(301, { Location: prefix }); res.end(); return; }
        if (!route.startsWith(prefix)) throw new Error('Outside project path');
        const file = path.resolve(root, route.slice(prefix.length) || 'index.html');
        if (!file.startsWith(root + path.sep)) throw new Error('Outside build');
        const info = await stat(file);
        if (!info.isFile()) throw new Error('Not a file');
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': info.size });
        fs.createReadStream(file).pipe(res);
      } catch { res.writeHead(404); res.end('Not found'); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}${prefix}`;
  }
  browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-unsafe-swiftshader', '--no-first-run'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().startsWith(url) && r.status() >= 400) failed.push({ url: r.url(), status: r.status() }); });
  // Antivirus/browser integrations may keep long-poll requests open indefinitely.
  // Verify the actual application readiness instead of waiting for global network idle.
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.equal(response.status(), 200);
  assert.ok(await page.locator('h1').isVisible());
  results.push('Public/project URL returns 200 and renders the homepage');
  await page.locator('.chip-scene[data-ready="true"], .chip-scene[data-fallback="true"]').waitFor({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
  results.push('CSS, fonts, images and dynamic 3D module load under the project path');
  await mkdir('reports/deployment', { recursive: true });
  const label = remote ? 'public' : 'project';
  await page.screenshot({ path: `reports/deployment/${label}-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `reports/deployment/${label}-mobile.png` });
  await page.getByRole('button', { name: '打开导航菜单' }).click();
  await page.locator('#mobile-menu a[href="#download"]').click();
  assert.equal(await page.locator('#mobile-menu').count(), 0);
  assert.ok(await page.locator('.download-button').isVisible());
  results.push('Mobile layout and download navigation work');
  const pending = page.waitForEvent('download', { timeout: 120000 });
  await page.locator('.download-button').click();
  const downloaded = await pending;
  assert.equal(downloaded.suggestedFilename(), product.download.filename);
  const bytes = await readFile(await downloaded.path());
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(bytes.length, product.download.bytes);
  assert.equal(hash, product.download.sha256);
  results.push('Actual browser download matches the original file size and SHA-256');
  assert.deepEqual(errors, []); assert.deepEqual(failed, []);
  const report = { checkedAt: new Date().toISOString(), url, result: 'PASS', checks: results, download: { filename: downloaded.suggestedFilename(), bytes: bytes.length, sha256: hash }, pageErrors: errors, failedResponses: failed };
  await writeFile(`reports/deployment/${label}-verification.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
