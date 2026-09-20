import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { product } from '../src/product.js';

const root = path.resolve('dist');
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
assert.match(html, /<html lang="zh-CN"/);
assert.doesNotMatch(html, /(?:src|href)=["']\/(?!\/)/, 'Root-relative URLs break project Pages');
for (const match of html.matchAll(/(?:src|href)=["'](\.\/[^"']+)["']/g)) {
  await fs.access(path.resolve(root, match[1]));
}
await fs.access(path.join(root, '.nojekyll'));
const bytes = await fs.readFile(path.resolve(root, product.download.url));
assert.equal(bytes.length, product.download.bytes, 'Download file size must match the website');
assert.equal(createHash('sha256').update(bytes).digest('hex'), product.download.sha256, 'Download checksum must match the website');
let total = 0, count = 0;
const inspect = async directory => {
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) await inspect(file);
    else {
      const size = (await fs.stat(file)).size;
      assert.ok(size < 100 * 1024 * 1024, `File exceeds GitHub Git file limit: ${item.name}`);
      assert.ok(!/(?:任务记录|verification|lighthouse|\.env)/i.test(item.name), `Local-only file in deployment: ${item.name}`);
      if (['.html', '.js', '.css', '.txt'].includes(path.extname(file))) {
        assert.doesNotMatch(await fs.readFile(file, 'utf8'), /[A-Z]:[\\/]Users[\\/]/i, `Personal filesystem path in ${item.name}`);
      }
      total += size; count++;
    }
  }
};
await inspect(root);
assert.ok(total < 1024 ** 3, 'Published site exceeds GitHub Pages size limit');
console.log(JSON.stringify({ result: 'PASS', files: count, totalBytes: total, relativePaths: true, downloadBytes: bytes.length, downloadHash: product.download.sha256 }));
