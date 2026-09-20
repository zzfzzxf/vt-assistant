import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
const require = createRequire(import.meta.url);
const runtimeModules = path.resolve(path.dirname(process.execPath), '../node_modules');
const { chromium } = require(path.join(runtimeModules, 'playwright'));
const sharp = require(path.join(runtimeModules, 'sharp'));
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-unsafe-swiftshader', '--no-first-run'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.locator('.chip-scene[data-ready="true"]').waitFor();
  await page.waitForTimeout(900);
  await page.locator('.chip-scene').screenshot({ path: 'reports/chip.png' });
  await sharp('reports/chip.png').webp({ quality: 90 }).toFile('public/images/chip-fallback.webp');
  await page.screenshot({ path: 'reports/desktop-first.png' });
  await page.locator('[data-reveal]').evaluateAll(elements => elements.forEach(el => el.classList.add('is-visible')));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'reports/desktop-full.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'reports/mobile-first.png' });
  await page.screenshot({ path: 'reports/mobile-full.png', fullPage: true });
  console.log(JSON.stringify({ errors, title: await page.title(), bodyWidth: await page.evaluate(() => document.documentElement.scrollWidth) }));
} finally { await browser.close(); }
