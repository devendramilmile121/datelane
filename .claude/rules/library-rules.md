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
4. **Standalone-only, signal-first.** Public components are `standalone: true` (kept explicit —
   default only in v19). No `NgModule`/`SchedulerModule` surface. Components use signal APIs:
   `input()`/`output()`/`model()` over `@Input`/`@Output`, `computed()` for derived state,
   `effect()` over `ngOnChanges`, `inject()` over constructor DI, `host` object over
   `@HostListener`/`@HostBinding`. The `engine/` stays framework-free pure functions (no signals).
   The newable `NativeDateAdapter` keeps its constructor (parity spec does `new NativeDateAdapter()`).
5. **Partial-Ivy publish, Angular 18 floor.** Production lib build stays `compilationMode: "partial"`
   (`tsconfig.lib.prod.json`). Signal `input()/output()/model()` are allowed — they raise the
   declaration `minVersion` to ~17.1, still ≤ the **18** peerDep floor (`>=18.0.0 <23.0.0`), so the
   partial-Ivy publish stays valid. Do not adopt features that push `minVersion` above 18
   (e.g. `linkedSignal`, v19+ control-flow additions). Verify with `scripts/verify-angular.sh`.
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
- No new hard dependency in core `package.json`. `minVersion` floor still ≤ 18.

## Before you finish

Run the gate: `npm run lint && npm run typecheck && npm test && npm run build`.
For anything touching dates: add/extend DST + first-day-of-week tests.
