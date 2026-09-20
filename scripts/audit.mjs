import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import net from 'node:net';
import lighthouse from 'lighthouse';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.resolve(path.dirname(process.execPath), '../node_modules/playwright')); }
const temporary = net.createServer();
await new Promise(resolve => temporary.listen(0, '127.0.0.1', resolve));
const port = temporary.address().port; await new Promise(resolve => temporary.close(resolve));
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: [`--remote-debugging-port=${port}`, '--enable-unsafe-swiftshader', '--no-first-run'] });
try {
  const result = await lighthouse(process.env.SITE_URL || 'http://127.0.0.1:4173/', { port, output: ['json', 'html'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
  await fs.writeFile('reports/lighthouse-final.json', result.report[0]);
  await fs.writeFile('reports/lighthouse-final.html', result.report[1]);
  console.log(JSON.stringify({ scores: Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, value.score * 100])), metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift'].map(key => [key, result.lhr.audits[key].displayValue])), failed: Object.entries(result.lhr.audits).filter(([,value]) => value.score !== null && value.score < 0.5).map(([key, value]) => ({ id: key, title: value.title, display: value.displayValue })) }));
} finally { await browser.close(); }
