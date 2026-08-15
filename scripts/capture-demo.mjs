// scripts/capture-demo.mjs
// Capture the README hero image (docs/hero.png) from the running demo.
//
// Prereq (dev-only, not a package dependency):  npm i -D playwright && npx playwright install chromium
//
// Usage:
//   node scripts/capture-demo.mjs                       # captures the live GitHub Pages demo
//   node scripts/capture-demo.mjs http://localhost:4200 # capture a local `npm start`
//
// Then commit docs/hero.png and uncomment the hero block in README.md.

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const url = process.argv[2] || 'https://devendramilmile121.github.io/datelane/';
const out = 'docs/hero.png';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'Playwright not installed. Run:\n  npm i -D playwright && npx playwright install chromium',
  );
  process.exit(1);
}

mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });

// The demo opens on the Developer Guide tab — switch to the Playground so the hero shows the
// actual scheduler, not docs. Tolerate a demo that has no tabs (renders the scheduler directly).
const playgroundTab = page.getByRole('tab', { name: /playground/i });
if (await playgroundTab.count()) {
  await playgroundTab.first().click();
}

// Wait for the scheduler to mount + lay out (events, auto-scroll).
const scheduler = page.locator('dl-scheduler').first();
await scheduler.waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(1200);

// Clip to the scheduler for a clean product shot rather than the whole page.
await scheduler.screenshot({ path: out });
await browser.close();

console.log(`✓ wrote ${out} from ${url} (playground scheduler)`);
