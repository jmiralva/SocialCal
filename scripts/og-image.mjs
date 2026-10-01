// Renders scripts/og-image.html to public/og.png (1200x630). Needs a network connection for Google Fonts.
import { chromium } from '@playwright/test';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const template = new URL('./og-image.html', import.meta.url);
const out = fileURLToPath(new URL('../public/og.png', import.meta.url));
const MAX_BYTES = 300 * 1024; // WhatsApp may skip larger preview images

const browser = await chromium.launch();
// favicon.svg follows prefers-color-scheme, so pin the light theme.
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: 'light' });
await page.goto(template.href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.locator('img').evaluate((img) => img.decode());
await page.locator('.frame').screenshot({ path: out });
await browser.close();

const size = statSync(out).size;
if (size >= MAX_BYTES) {
  console.error(`public/og.png is ${size} bytes; keep it under ${MAX_BYTES}.`);
  process.exit(1);
}
console.log(`Wrote public/og.png (${size} bytes)`);
