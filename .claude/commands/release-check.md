---
description: Pre-publish gate — deps, partial-Ivy, types, tests, bundle, cross-version, publint.
allowed-tools: Read, Grep, Glob, Bash
---

Run the pre-publish gate for `@datelane/core` and report a clear PASS/FAIL per item. Do **not**
publish or push — this is verification only.

1. **Lint / types / tests**: `npm run lint`, `npm run typecheck`, `npm test`. All must pass.
2. **Build**: `npm run build`. Then confirm the lib is **partial-Ivy** — the FESM must contain
   `ɵɵngDeclareComponent` and **not** `ɵɵdefineComponent`:
   `grep -oE "ɵɵngDeclareComponent|ɵɵdefineComponent" dist/datelane/fesm2022/datelane-core.mjs | sort | uniq -c`
3. **minVersion floor**: declaration `minVersion` must be **≤ 17** (no 18+ gates):
   `grep -oE 'minVersion:\s*"[0-9.]+"' dist/datelane/fesm2022/datelane-core.mjs | sort | uniq -c`
4. **No hard runtime deps in core**: `dependencies` in `projects/datelane/package.json` must be empty
   (tslib is added by ng-packagr in dist — that's fine); luxon/moment must be optional peers only.
5. **Peer range sanity**: `@angular/*` range matches the verified matrix in CI/README.
6. **publint**: `npx publint@latest dist/datelane` — no errors.
7. **Cross-version**: confirm `.github/workflows/ci.yml` matrix covers every supported major; if a
   toolchain is available, spot-run `bash scripts/verify-angular.sh <major> dist/datelane/*.tgz`.
8. **Docs**: README support matrix, CHANGELOG entry, and `package.json` version/`repository.url`
   are present and consistent.

Finish with a single PASS/FAIL summary and the exact blocking items (if any).
