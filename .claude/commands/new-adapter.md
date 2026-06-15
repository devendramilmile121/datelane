---
description: Scaffold a new date adapter as a secondary entry point with the parity test suite.
argument-hint: <library-name> (e.g. dayjs)
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(npm run *)
---

Scaffold a new `DateAdapter` for **$1** as a secondary entry point of `@datelane/core`.

Read first:
- `projects/datelane/src/lib/date-adapter/date-adapter.ts` (the abstract contract — implement ALL of it)
- `projects/datelane/luxon-adapter/src/luxon-date-adapter.ts` (the closest template)
- `projects/datelane/src/lib/date-adapter/native-date-adapter.spec.ts` (`runAdapterParitySuite`)
- `.claude/rules/library-rules.md`

Then:
1. Create `projects/datelane/$1-adapter/` with `ng-package.json`, `src/public-api.ts`, and
   `src/$1-date-adapter.ts` implementing every abstract method of `DateAdapter<NativeType>`.
2. Export a `provide$1DateAdapter({ locale })` provider mirroring `provideLuxonDateAdapter`.
3. Declare `$1` as an **optional** peer in `projects/datelane/package.json`
   (`peerDependencies` + `peerDependenciesMeta.$1.optional = true`). Never a hard dep.
4. Add the secondary entry point to the build (`angular.json` / `ng-package.json` as the existing
   adapters do) and to the README adapter section.
5. Add `src/$1-date-adapter.spec.ts` that calls `runAdapterParitySuite(() => new $1DateAdapter('en-US'), '$1')`.
   Pay attention to **format-token parity** (the spec exercises patterns like `dd-MMM-yyyy`, `hm`,
   `EEE`) and **DST / first-day-of-week**.
6. Run `npm run typecheck && npm test && npm run build`. Report results, especially any parity gaps.

Keep it framework-light and zero-impact on core's dependency footprint.
