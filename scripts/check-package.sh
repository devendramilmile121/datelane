#!/usr/bin/env bash
# check-package.sh — publish-quality gate for the built @datelane/core package.
# Runs three checks against dist/datelane (run AFTER `npm run build`):
#   1. publint            — package.json / exports / files correctness.
#   2. arethetypeswrong   — type resolution across node10/node16/bundler.
#   3. bundle-size budget — gzip size of the FESM bundles (scripts/check-size.mjs).
#
# Uses npx (no persistent devDeps). Mirrors the /release-check gate; wired into CI.
#
# attw notes (ng-packagr partial-Ivy is ESM-only with a single .d.ts):
#   • cjs-resolves-to-esm / false-cjs — expected "Masquerading as CJS" for Angular libs;
#     the bundler + node16-esm consumers (real Angular apps) resolve correctly. Ignored.
#   • ./styles/scheduler — an SCSS entry point with no types; excluded from the type check.
set -euo pipefail

DIST="dist/datelane"
if [ ! -d "$DIST" ]; then
  echo "::error:: $DIST not found — run 'npm run build' first." >&2
  exit 1
fi

echo "▶ publint"
npx -y publint@latest "$DIST"

echo "▶ arethetypeswrong"
( cd "$DIST" && npx -y @arethetypeswrong/cli@latest --pack . \
    --ignore-rules cjs-resolves-to-esm false-cjs \
    --exclude-entrypoints ./styles/scheduler )

echo "▶ bundle-size budget"
node scripts/check-size.mjs

echo "✓ package gate passed"
