# Changelog

All notable changes to `@datelane/core` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-06

First public pre-release. All 12 view modes render; the core ships with zero hard runtime
dependencies and a pluggable date layer (Native / Luxon / Moment).

### Added

#### Views (12/12 render)

- Vertical-time engine: **Day**, **Week**, **Work Week** — time grid, overlap/collision columns,
  now-line, all-day-aware filtering, `startHour`/`endHour`, drag-to-move + edge resize.
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
- Built-in **quick-view popover** on event activation, fully replaceable via the
  `ngsQuickViewTemplate` directive — the host always opens its own create/edit form.
- **Auto-scroll to the first event** on first render and on navigation, configurable via
  `[autoScroll]` and `[scrollHour]`; preserves manual scroll within a period.
- Single-level resource grouping for Timeline views.
- Tree-shakeable view factories (`dayView()`, `weekView()`, …) and `provideScheduler(...)`.
- `NgModule` compatibility surface (`SchedulerModule`) for Angular 9–13 consumers.

#### Theming

- Token-based design system (`_tokens.scss` → `_theme.scss` → `scheduler.scss`), light/dark,
  RTL-safe logical properties.

### Known limitations

- Recurrence (RRULE/EXDATE), full editor window, and keyboard grid navigation are not yet implemented.
- Timeline resource grouping is single-level (no hierarchy yet).
- Agenda does not yet virtualize long ranges.
- Luxon/Moment adapters lack the shared parity test suite; Moment format-token parity is unverified.
- RTL horizontal scroll for Timeline is not specially handled.

[0.1.0]: https://github.com/devendramilmile121/datelane/releases/tag/v0.1.0
