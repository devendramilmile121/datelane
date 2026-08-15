// testing/axe.ts — a11y assertion helper for component specs (DESIGN-SYSTEM §5, ux-rules).
// Runs axe-core against a rendered fixture and returns human-readable violation strings so a
// failing test names the exact rule + element. NOT part of the published surface — excluded from
// the library build (tsconfig.lib.json) and never re-exported from public-api.
//
// jsdom can't compute layout or paint, so rules needing geometry/color are disabled here
// (color-contrast is enforced separately by the token-contrast test + the a11y-auditor subagent).

import axe from 'axe-core';

const HEADLESS_DISABLED_RULES = ['color-contrast'] as const;

/** Run axe-core on `root`; resolve to one readable string per violation (empty array = clean). */
export async function findAxeViolations(root: Element): Promise<string[]> {
  const results = await axe.run(root as HTMLElement, {
    resultTypes: ['violations'],
    rules: Object.fromEntries(HEADLESS_DISABLED_RULES.map((id) => [id, { enabled: false }])),
  });
  return results.violations.map((v) => {
    const targets = v.nodes.map((n) => n.target.join(' ')).join(', ');
    return `${v.id} (${v.impact}): ${v.help} — [${targets}]`;
  });
}
