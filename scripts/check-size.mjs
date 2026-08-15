// scripts/check-size.mjs
// Bundle-size budget gate for the published FESM2022 bundles. Enforces the "lightweight"
// promise (scheduler-plan.md §1) by failing CI when a bundle grows past its gzip budget.
// Zero deps — Node's built-in zlib. Run AFTER `npm run build` (needs dist/datelane).
//
// Budgets are gzip bytes (what a user's network actually pays). Bump deliberately when a
// feature legitimately grows the bundle, so the diff records the cost.

import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';

const KB = 1024;

/** file → max gzip size. Headroom kept over the current size so normal churn passes. */
const BUDGETS = [
  { file: 'dist/datelane/fesm2022/datelane-core.mjs', maxGzip: 45 * KB },
  { file: 'dist/datelane/fesm2022/datelane-core-luxon-adapter.mjs', maxGzip: 3 * KB },
  { file: 'dist/datelane/fesm2022/datelane-core-moment-adapter.mjs', maxGzip: 3 * KB },
];

let failed = false;

for (const { file, maxGzip } of BUDGETS) {
  if (!existsSync(file)) {
    console.error(`::error:: missing ${file} — run 'npm run build' first.`);
    failed = true;
    continue;
  }
  const gz = gzipSync(readFileSync(file)).length;
  const ok = gz <= maxGzip;
  const pct = ((gz / maxGzip) * 100).toFixed(0);
  const mark = ok ? '🟢' : '🔴';
  console.log(
    `${mark} ${file}  ${(gz / KB).toFixed(1)} KB gz / ${(maxGzip / KB).toFixed(0)} KB budget (${pct}%)`,
  );
  if (!ok) {
    console.error(
      `::error:: ${file} exceeds its gzip budget by ${((gz - maxGzip) / KB).toFixed(1)} KB. ` +
        `Reduce size or raise the budget deliberately in scripts/check-size.mjs.`,
    );
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
