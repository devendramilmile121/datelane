# Changelog

All notable changes to `@datelane/core` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-06-21

Adds recurrence expansion plus navigation and scrolling features. Backward compatible — no breaking
API changes. Still zero hard runtime dependencies.

### Added

- **Recurrence** — recurring records expand into per-occurrence events for the visible range via a
  built-in RFC 5545 RRULE subset (`FREQ` DAILY/WEEKLY/MONTHLY/YEARLY, `INTERVAL`, `COUNT`, `UNTIL`,
  `BYDAY`, `BYMONTHDAY`) with `EXDATE` exceptions. No `rrule` dependency. New `FieldMap`
  `recurrenceExceptions` mapping; occurrences carry `seriesId` + `recurrenceId`, and CRUD on an
  occurrence emits `scope: 'occurrence'`.
- **Calendar popover** — clicking the header date label opens a keyboard-navigable mini-calendar
  (arrows / Home / End / PageUp / PageDown / Enter / Esc) to jump `viewDate` while keeping the view.
- **Drill-down navigation** — Timeline Day/Week/WorkWeek headers drill into Agenda; Timeline
  Month/Year headers drill into Timeline Day (complements the existing day-cell → Day drill).
- **Virtual scrolling** — `allowVirtualScrolling` on Agenda / Timeline views skips off-screen rows
  via CSS `content-visibility` (zero-dependency, SSR-safe).
- `DateAdapter.fromParts(...)` primitive (implemented across Native / Luxon / Moment) for building
  absolute dates from calendar parts.

### Fixed

- Timeline rows now use a composite track key so a recurring series renders multiple bars in one row
  without duplicate-key collisions.
- Long-running open-ended DAILY/WEEKLY series viewed far from their start now fast-forward to the
  visible window instead of exhausting the iteration cap and rendering nothing.

## [0.1.0] - 2026-06-07

First public pre-release. All 12 view modes render; the core ships with zero hard runtime
dependencies and a pluggable date layer (Native / Luxon / Moment).

### Added

#### Views (12/12 render)

- Vertical-time engine: **Day**, **Week**, **Work Week** — time grid, overlap/collision columns,
  now-line, `startHour`/`endHour`, drag-to-move + edge resize, and an **all-day band** with
  multi-day spanning bars, lane stacking, and collapse/expand (`+N more`, `[allDayMaxLanes]`).
- Calendar-grid engine: **Month** — multi-day spanning bars, lane packing, `+N more` popover,
  day drill-through, drag/resize with live multi-week reflow.
- List engine: **Agenda** (`agendaDaysCount`, `hideEmptyAgendaDays`) and **Month Agenda**
  (mini-calendar + selected-day list, event dots).
- **Year** — twelve mini-calendars, horizontal/vertical orientation, event dots, day drill-through.
- Horizontal-time engine: **Timeline Day / Week / Work Week / Month / Year** — resource rows,
  two-band header, time-proportional bars in column space, per-column `+N more`, `rowAutoHeight`.

#### Date layer

- Abstract `DateAdapter` + zero-dependency `NativeDateAdapter` (Intl-based).
- Optional secondary entry points: `@datelane/core/luxon-adapter`, `@datelane/core/moment-adapter`.

#### Interaction & API

- Drag-to-move and edge-resize on Day/Week/Work Week and Month (mouse + touch via pointer events).
- Controlled component: emits `eventClick`, `eventChange`, `eventEdit`, `eventDelete`, `cellClick`,
  `navigate`, `viewChange`; two-way `activeView` / `viewDate`.
- **Header navigation** — period-aware **prev / next / today** (steps by the active view's unit:
  day, week, month, year, or agenda range) plus a **view switcher** (active view highlighted),
  driven by the configured `[views]`.
- Built-in **quick-view popover** on event activation, fully replaceable via the
  `ngsQuickViewTemplate` directive — the host always opens its own create/edit form. Centers
  itself on small screens.
- **Auto-scroll to the first event** — fires once on first render and on period change only
  (never on event edits / drag reflow), configurable via `[autoScroll]` / `[scrollHour]`.
- **i18n message token** — `provideSchedulerI18n({ … })` / `SCHEDULER_MESSAGES` override every
  fixed UI string (nav labels, quick-view actions, `+N more`, …) without forking templates.
- Pure, framework-free **gesture math** (`interaction/`) shared by the drag/resize views and
  unit-tested in isolation.
- **Responsive header** — wraps and scrolls the view switcher on narrow widths (container-query).
- Single-level resource grouping for Timeline views.
- Tree-shakeable view factories (`dayView()`, `weekView()`, …) and `provideScheduler(...)`.
- **Standalone-only, signal-first** public API (no `NgModule` surface); components use
  `input()`/`output()`/`model()`, `computed()`, `effect()`, `inject()`.

#### Theming

- Token-based design system (`_tokens.scss` → `_theme.scss` → `scheduler.scss`), light/dark,
  RTL-safe logical properties.

#### Tooling

- Unit tests run on Angular's **Vitest** unit-test builder (`@angular/build:unit-test`, jsdom),
  with pure-logic specs plus TestBed DOM/component specs (engine, views, shell, i18n, gestures).

#### Angular compatibility

- Published in **partial-Ivy** compilation mode (`compilationMode: "partial"`), so the library is
  linked by the consuming app's compiler instead of being locked to one runtime.
- Declaration `minVersion` floor is **17** (control-flow `@if`/`@for`); peer range
  `@angular/core`/`@angular/common` = `>=18.0.0 <23.0.0`. Verified by real production AOT
  builds on **Angular 18, 19, 20, 21, and 22**.
- `scripts/verify-angular.sh` + a GitHub Actions matrix scaffold a throwaway app per major,
  install the packed tarball, and run a production AOT build as the compatibility proof.
- Removed `@let` (Angular 18.1+) from the Month view to keep the floor at 17.

### Known limitations

- Recurrence (RRULE/EXDATE), full editor window, and keyboard grid navigation are not yet implemented.
- Timeline resource grouping is single-level (no hierarchy yet).
- Agenda does not yet virtualize long ranges.
- Luxon/Moment adapters lack the shared parity test suite; Moment format-token parity is unverified.
- RTL horizontal scroll for Timeline is not specially handled.

[0.1.0]: https://github.com/devendramilmile121/datelane/releases/tag/v0.1.0
