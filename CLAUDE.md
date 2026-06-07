# CLAUDE.md — `@datelane/core`

Project memory for Claude Code. Auto-loaded every session. Keep it short, factual, and current.

## What this is
An open-source, **lightweight, customizable Angular scheduler/calendar** component published as an
npm package. It re-derives the feature set of mature schedulers (Syncfusion EJ2 used only as a
*feature checklist*, never copied) with an original architecture and API.

- Full feature spec & roadmap: @scheduler-plan.md
- Design system & UX rules: @DESIGN-SYSTEM.md
- Path-scoped rules: @.claude/rules/library-rules.md and @.claude/rules/ux-rules.md

## Non-negotiables (read before writing any code)
1. **Core has zero hard runtime dependencies.** Only `@angular/*` peer deps. `luxon`/`moment` are
   *optional* peer deps consumed via secondary entry points. Never `import 'luxon'` from core.
2. **Date logic only via `DateAdapter`.** No `new Date()`, no direct date math in views/engine/store.
   If you need a date operation, add it to the adapter interface and implement it in all adapters.
3. **Tree-shakeable.** `sideEffects:false`. Views are factory functions (`dayView()`, `weekView()`…)
   so unused views are dropped by the bundler. Don't create barrel imports that pull in every view.
4. **Standalone-only, signal-first (Angular 18+ floor).** Public components are `standalone: true`
   (kept explicit — default only in v19). No `NgModule` compatibility surface. Use signal APIs in
   components: `input()`/`output()`/`model()`, `computed()`, `effect()`, `inject()`. Partial-Ivy
   publish stays valid (declaration `minVersion` ~17.1 ≤ the 18 floor). The published peerDep window
   is `>=18.0.0 <23.0.0`.
5. **Not a clone.** Original class names (`.dl-*`), original API names (see plan §4 mapping),
   original markup and docs. Never paste reference docs/markup.
6. **Accessibility is a feature, not a polish step.** Every interactive element ships with roles,
   keyboard support, and focus management from its first PR. See ux-rules.

## Architecture (one-liner per layer)
- `core/` — models, DI tokens, `provideScheduler(...)`, `FieldMap`, `ViewDescriptor`.
- `date-adapter/` — abstract `DateAdapter` + `NativeDateAdapter` (Intl, zero deps).
- `engine/` — three layout strategies (vertical-time, horizontal-time, calendar-grid/list) +
  recurrence + collision/overlap + `+more` overflow. All 12 views map onto these three engines.
- `views/` — view factory functions returning typed `ViewDescriptor`s.
- `scheduler/` — root `SchedulerComponent` (header, view outlet, popups) + `SchedulerStore`.
- `interaction/` — drag, resize, keyboard, a11y.
- `i18n/` — locale + message tokens, routed through the adapter.
- `styles/` — `_tokens.scss` (design tokens) → `_theme.scss` (light/dark) → `scheduler.scss`.

Secondary entry points: `/luxon-adapter`, `/moment-adapter`.

## Common commands
```bash
npm install
npm run build            # ng build datelane  (ng-packagr → dist/datelane)
npm run build:watch      # incremental library build
npm start                # serve the demo app
npm test                 # unit tests (one shot, headless)
npm run test:watch
npm run lint
npm run format           # prettier --write
npm run typecheck        # tsc --noEmit on the library
```
> Verify these match `package.json` scripts before relying on them; update this file if they drift.

## Definition of done for a feature
- Implemented behind the adapter; works in Native adapter; parity-tested in Luxon + Moment.
- Has unit tests (logic) and at least one component test (render/interaction).
- Keyboard-operable + ARIA correct; passes the a11y-auditor subagent.
- Themed only via tokens (no hard-coded colors/sizes); RTL-safe; responsive.
- The matching checkbox in `scheduler-plan.md` §2 is flipped to ☑.
- No new hard dependency added to core `package.json`.

## House style
- TypeScript strict. Explicit return types on public APIs. No `any` in public surface.
- Prefer pure functions in `engine/`; keep them framework-free and unit-testable.
- CSS: BEM-ish under `.dl-` namespace, all values from tokens. Logical properties for RTL
  (`inline-start`/`block-end`, not `left`/`top`).
- Conventional Commits (`feat:`, `fix:`, `docs:`…). One feature per PR.

## Gotchas
- Agenda & Month-Agenda require a pixel `height` — enforce/validate and document.
- DST & first-day-of-week are the top sources of date bugs — every adapter change needs DST tests.
- Recurrence: expand occurrences for the **visible range only**; apply EXDATE + per-occurrence edits.
- SSR: never touch `window`/`document` without `isPlatformBrowser` guards.

## Useful slash commands (this repo)
- `/new-view <Name>` — scaffold a new view factory + engine wiring + tests + docs + checklist update.
- `/new-adapter <lib>` — scaffold a new date adapter entry point with the parity test suite.
- `/feature-check` — audit `scheduler-plan.md` §2 vs the codebase; report missing/partial features.
- `/release-check` — pre-publish gate (deps, bundle budget, types, tests, publint).
