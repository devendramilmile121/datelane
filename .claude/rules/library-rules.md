---
description: Path-scoped engineering rules for the publishable library (projects/datelane/**).
globs:
  - projects/datelane/**
alwaysApply: true
---

# Library rules — `projects/datelane/**`

These apply to every file under the publishable library. The demo app
(`projects/demo/**`) is exempt (it may use `new Date()`, hard deps, etc.).

## Hard constraints (never violate)

1. **Zero hard runtime deps in core.** Only `@angular/*` peer deps. `luxon`/`moment` are
   *optional* peers consumed **only** from their secondary entry points
   (`luxon-adapter/`, `moment-adapter/`). Never `import 'luxon'`/`import 'moment'` from `src/lib/**`.
2. **All date logic goes through `DateAdapter`.** No `new Date()`, no `Date.*`, no direct date math
   in `engine/`, `views/`, `scheduler/`, `interaction/`. Need an operation? Add it to the abstract
   `DateAdapter`, implement it in Native + Luxon + Moment, and add a parity test.
3. **Tree-shakeable.** `sideEffects: false`. Views are factory functions (`dayView()`, …). No barrel
   that pulls every view/renderer into one import.
4. **Standalone-first, NgModule-compatible.** Public components are `standalone: true`; keep the
   `SchedulerModule` surface working. No signals in the public API (compat). Signals only behind
   internal, version-guarded wrappers.
5. **Partial-Ivy publish.** Production lib build stays `compilationMode: "partial"`
   (`tsconfig.lib.prod.json`). Do not introduce template features that raise the declaration
   `minVersion` above **17** (no `@let`, `@defer`, signal `input()/output()/model()`), or the
   Angular 18 floor breaks. Verify with `scripts/verify-angular.sh`.
6. **Original work only.** Original `.dl-*` class names, original API names, original markup/docs.
   Syncfusion EJ2 is a *feature checklist* only — never copy its text, markup, or class names.
7. **SSR-safe.** No `window`/`document`/`navigator` without an `isPlatformBrowser` guard.
   (Known debt: month-view gesture uses `document` directly — fix when touched.)

## House style

- TypeScript strict. Explicit return types on public APIs. No `any` in the public surface.
- Pure, framework-free functions in `engine/` — unit-testable without Angular.
- CSS: BEM-ish under `.dl-`, **tokens only** (no literal colors/sizes). Logical properties for RTL
  (`inset-inline-start`/`block-end`, never `left`/`top`).
- Conventional Commits. One feature per PR.

## Definition of done (a feature)

- Implemented behind the adapter; works in Native; parity-tested in Luxon + Moment.
- Unit tests for logic + at least one component/render test.
- Keyboard-operable + ARIA correct (see `ux-rules.md`).
- Themed via tokens only; RTL-safe; responsive.
- The matching checkbox in `scheduler-plan.md` §2 flipped to ☑.
- No new hard dependency in core `package.json`. `minVersion` floor still 17.

## Before you finish

Run the gate: `npm run lint && npm run typecheck && npm test && npm run build`.
For anything touching dates: add/extend DST + first-day-of-week tests.
