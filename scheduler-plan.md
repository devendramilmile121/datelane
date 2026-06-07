# Open-Source Angular Scheduler — Development Plan & Architecture

> Package name: **`@datelane/core`** (scope `@datelane`, secondary entry points `/luxon-adapter`, `/moment-adapter`).

This document is a build-ready blueprint. It (1) inventories **every** feature from the
reference Syncfusion EJ2 docs so nothing is missed, (2) defines an original architecture and
public API that is *not* a copy of EJ2, (3) lays out the npm packaging strategy, and (4) gives a
phased, step-by-step implementation roadmap.

---

## 1. Goals & Guiding Principles

| Goal | What it means in practice |
|------|---------------------------|
| **Lightweight** | Core bundle small; each view ships as a separately importable, tree-shakeable provider. You only pay for the views you import. |
| **Pluggable date layer** | Abstract `DateAdapter`; ship `Native`, `Luxon`, and `Moment` adapters as optional secondary entry points. No date library baked into core. |
| **Wide Angular support** | One codebase, sane peer-dependency range (see §5). Standalone-first, with an `NgModule` compatibility surface for older apps. |
| **Customizable** | Templates everywhere (cell, event, header, resource, tooltip, editor), CSS-variable theming, configurable everything. |
| **Intuitive UX** | Smooth navigation, drag/resize, keyboard + a11y, responsive/mobile layout, clean default theme. |
| **Low dependency footprint** | Zero hard runtime deps in core except Angular peer deps. Recurrence engine is internal or an optional adapter. |

**Non-goal:** cloning EJ2 line-for-line. We re-derive the feature set with our own API names,
architecture, and rendering model (see §4 mapping and §7 API).

---

## 2. Complete Feature Inventory (from the reference doc)

Everything below is a feature we must cover. Status column is for you to track.

### 2.1 View modes (12 total)

| View | Notes | Status |
|------|-------|:------:|
| Day | single day; extendable via `interval` | ☑ |
| Week | 7 days Sun–Sat; `firstDayOfWeek` configurable | ☑ |
| Work Week | working days only (default Mon–Fri, 5); `workDays` configurable | ☑ |
| Month | full month grid; `+ more` indicator; click day → Day view | ☑ |
| Year | all months of a year; Horizontal/Vertical `orientation`; calendar-style with event dots | ☑ |
| Agenda | list of upcoming N days; `agendaDaysCount`, `hideEmptyAgendaDays`, virtual scroll | ☑ (virtual scroll pending) |
| Month Agenda | month calendar + selected-day appointment list; dots on event days | ☑ |
| Timeline Day | horizontal time slots, single day | ☑ |
| Timeline Week | horizontal, 7 days | ☑ |
| Timeline Work Week | horizontal, working days | ☑ |
| Timeline Month | horizontal, month days | ☑ |
| Timeline Year | resource rows (H) / resource columns (V); hierarchical resource grouping; `rowAutoHeight` | ☑ (single-level grouping) |

### 2.2 Component-level configuration

| Feature | Source property (EJ2) | Status |
|---------|----------------------|:------:|
| Active/default view | `currentView` (default = Week) | ☐ |
| Configure which views appear + per-view config | `views` array | ☐ |
| Selected/navigated date | `selectedDate` | ☐ |
| Event data + mappings | `eventSettings` / `dataSource` | ☐ |
| Width / Height (Agenda & Month-Agenda require px height) | `width`, `height` | ☐ |
| Agenda day count | `agendaDaysCount` | ☐ |
| Hide empty agenda days | `hideEmptyAgendaDays` | ☐ |
| Auto row height (Timeline Year) | `rowAutoHeight` | ☐ |
| Resources + resource grouping | `resources`, `group` | ☐ |

### 2.3 Per-view configuration (the `views`/`e-view` options)

| Option | Type | Applicable views | Status |
|--------|------|------------------|:------:|
| `option` (the view name) | View | all | ☐ |
| `isSelected` (acts like currentView) | boolean | all | ☐ |
| `dateFormat` | string | all | ☐ |
| `readonly` (blocks CRUD on that view) | boolean | all | ☐ |
| `resourceHeaderTemplate` | template | all | ☐ |
| `dateHeaderTemplate` | template | all | ☐ |
| `eventTemplate` | template | all | ☐ |
| `showWeekend` (hide weekends) | boolean | all | ☐ |
| `group` (resource grouping) | GroupModel | all | ☐ |
| `cellTemplate` | template | all except Agenda | ☐ |
| `workDays` | number[] | all except Agenda | ☐ |
| `displayName` (custom header label) | string | all except Agenda & MonthAgenda | ☐ |
| `interval` (extend day/week/month count) | number | all except Agenda & MonthAgenda | ☐ |
| `startHour` | short time string | Day, Week, WorkWeek, TL Day/Week/WorkWeek | ☐ |
| `endHour` | short time string | Day, Week, WorkWeek, TL Day/Week/WorkWeek | ☐ |
| `timeScale` (enable, slotCount) | TimeScaleModel | Day, Week, WorkWeek, TL Day/Week/WorkWeek | ☐ |
| `showWeekNumber` | boolean | Day, Week, WorkWeek, Month | ☐ |
| `allowVirtualScrolling` | boolean | Agenda, Timeline views | ☐ |
| `headerRows` (year/month/week/date/hour rows) | HeaderRowsModel | Timeline views only | ☐ |
| `firstDayOfWeek` | number (0=Sun) | Week (and week-based) | ☐ |
| `orientation` (Horizontal/Vertical) | string | Year, Timeline Year | ☐ |

### 2.4 Behavioral / UX features (implied by the doc)

| Feature | Status |
|---------|:------:|
| Header bar: prev/next nav, view switcher (active view highlighted), date-range label, date label → **calendar popup** | ☐ |
| Click a day cell (Month/Year/MonthAgenda) → navigate to Day view | ☐ |
| Click date header in Timeline Day/Week/WorkWeek → Agenda view | ☐ |
| Click date header in Timeline Month → Timeline Day | ☐ |
| All-day row with expand/collapse (Day/Week/WorkWeek) | ☐ |
| `+ more` overflow indicator (Month, Timeline views, Timeline Year w/o auto height) | ☐ |
| Default editor window for create/edit, with **All-day** toggle | ☐ |
| New event in Month defaults to all-day; toggling off → 9:00–9:30 default | ☐ |
| Event popup (Year / Month Agenda) listing events for a clicked day | ☐ |
| Event dots under dates (Year, Month Agenda) | ☐ |
| Internationalization / culture-based date formatting | ☐ |
| Resource grouping with multi-level hierarchy & multiple resource fields | ☐ |
| Resource fields: `field, title, name, dataSource, allowMultiple, textField, idField, colorField` | ☐ |

### 2.5 Features we ADD (so we're a real alternative, not a clone)

These aren't spelled out in the reference doc but are expected of a modern scheduler and make us
distinct & better:

- Drag-to-move and resize events (mouse + touch).
- Recurrence (RFC 5545 RRULE) create/edit/exception handling.
- Tooltip on hover (templated).
- Keyboard navigation + full ARIA / screen-reader support.
- Responsive/mobile layout (auto-collapse views, swipe nav).
- Dark mode + token-based theming out of the box.
- Time-zone aware rendering (delegated to the date adapter).
- RTL support.
- Reactive data binding (works with observables / signals).
- Export hooks (ICS, print) as optional add-ons.

> Track these separately so MVP completeness (the reference set) is never blocked by extras.

---

## 3. How we stay legally & technically distinct from EJ2

- **Different public API names** (see §7 mapping table) — e.g. `viewDate` not `selectedDate`,
  `[events]` not `eventSettings.dataSource`, view config via typed objects, not `<e-view>` tags.
- **Different rendering model**: a single configurable grid engine driven by a "view descriptor",
  rather than per-view component classes injected as services.
- **Original CSS class namespace** (`.dl-*`), original theme tokens, original markup.
- Write all code, docs, and examples from scratch. Use the reference only as a *feature checklist*,
  never as source text or markup to copy.

---

## 4. EJ2 → our API mapping (so reviewers see it's re-derived, not copied)

| EJ2 concept | Our equivalent |
|-------------|----------------|
| `currentView` | `[(activeView)]` (two-way) |
| `selectedDate` | `[(viewDate)]` |
| `eventSettings.dataSource` | `[events]` + `[fieldMap]` |
| `<e-views><e-view option=...>` | `[views]="[{ type: 'week', ... }]"` (typed descriptors) |
| service injection (`DayService`, …) | `provideSchedulerViews(dayView(), weekView(), …)` |
| `e-resource` | `[resources]="[{ field, ... }]"` |
| `group` / GroupModel | `[grouping]="{ resources: [...] }"` |
| `timeScale` | `timeScale: { enabled, slotCount }` inside view descriptor |
| `headerRows` | `headerRows: [{ unit: 'year' }, …]` |

---

## 5. Angular version + dependency strategy (be realistic)

Supporting *literally every* Angular version (2 → latest) in one build is impractical — the build
toolchain (`ng-packagr`), Ivy, and standalone APIs differ too much. The honest, maintainable plan:

- **Primary support: Angular 14+** (standalone components, modern `ng-packagr`, signals optional).
  This realistically covers the vast majority of active apps.
- **Compatibility surface for older apps (Angular 9–13):** also export `NgModule`s
  (`SchedulerModule`, per-view modules) so non-standalone apps can consume the same code. Avoid
  signals in core; expose them only behind feature-detected wrappers.
- **Peer dependencies**, never hard deps:
  ```jsonc
  "peerDependencies": {
    "@angular/core": ">=14.0.0",
    "@angular/common": ">=14.0.0"
  },
  "peerDependenciesMeta": {
    "luxon": { "optional": true },
    "moment": { "optional": true }
  }
  ```
- **Date libraries are optional peer deps.** Core ships only the `NativeDateAdapter`. Users opt into
  Luxon/Moment via a secondary entry point.
- **Recurrence:** implement a small internal RRULE engine (≈ what you need from RFC 5545) to keep
  zero runtime deps; optionally publish an `rrule`-backed adapter for full spec coverage.

> Document the support matrix clearly in the README. "Wide support" = a documented range + a CI
> matrix that tests against several Angular versions, not a literal "all versions" claim.

---

## 6. Project Architecture

### 6.1 Repo layout (Angular CLI workspace / monorepo)

```
datelane/
├─ angular.json
├─ package.json                 # workspace (private)
├─ tsconfig.base.json
├─ projects/
│  ├─ scheduler/                # the publishable library
│  │  ├─ ng-package.json        # primary entry point
│  │  ├─ package.json           # published metadata + peerDeps
│  │  ├─ src/
│  │  │  ├─ public-api.ts
│  │  │  └─ lib/
│  │  │     ├─ scheduler/            # root component + state
│  │  │     ├─ core/                 # models, tokens, providers
│  │  │     ├─ date-adapter/         # abstract DateAdapter + Native
│  │  │     ├─ engine/               # grid/layout/recurrence engine
│  │  │     ├─ views/                # view descriptors + renderers
│  │  │     ├─ resources/            # resource + grouping logic
│  │  │     ├─ editor/               # quick + full editor, popups
│  │  │     ├─ interaction/          # drag, resize, keyboard
│  │  │     ├─ templates/            # template directives/outlets
│  │  │     ├─ i18n/                 # localization tokens
│  │  │     └─ styles/               # SCSS + theme tokens
│  │  ├─ luxon-adapter/          # secondary entry point
│  │  │  ├─ ng-package.json
│  │  │  └─ src/public-api.ts
│  │  └─ moment-adapter/         # secondary entry point
│  │     ├─ ng-package.json
│  │     └─ src/public-api.ts
│  └─ demo/                      # showcase app (not published)
└─ scripts/                      # release, version-matrix CI, etc.
```

### 6.2 Secondary entry points (key to "lightweight")

Using `ng-packagr` secondary entry points, consumers import only what they use:

```ts
import { SchedulerComponent, provideScheduler } from '@datelane/core';
import { dayView, weekView, monthView } from '@datelane/core'; // tree-shakeable view factories
import { provideLuxonDateAdapter } from '@datelane/core/luxon-adapter';
```

Each view is a factory returning a descriptor + lazy-registerable renderer, so unused views are
dropped by the bundler — this is our equivalent of EJ2's "inject only the services you need," but
done via tree-shaking instead of manual provider arrays.

### 6.3 Layered design

```
┌─────────────────────────────────────────────────────────┐
│  SchedulerComponent (host: header, view outlet, popups)   │
├─────────────────────────────────────────────────────────┤
│  SchedulerStore (state: activeView, viewDate, events,     │
│                  resources, selection)  — RxJS or signals │
├───────────────┬───────────────┬───────────────┬──────────┤
│  View Engine  │  Event Engine  │  Resource     │  Date     │
│  (cell grid,  │  (recurrence,  │  Engine       │  Adapter  │
│   layout/     │   overlap,     │  (grouping,   │  (Native/ │
│   collision)  │   all-day)     │   hierarchy)  │  Luxon/   │
│               │                │               │  Moment)  │
├───────────────┴───────────────┴───────────────┴──────────┤
│  Interaction layer (drag, resize, keyboard, a11y)         │
├───────────────────────────────────────────────────────────┤
│  Template layer (cell/event/header/resource/tooltip/editor)│
└─────────────────────────────────────────────────────────┘
```

### 6.4 The `DateAdapter` abstraction (the heart of luxon/moment support)

Model on Angular Material's adapter pattern. Core only depends on this abstract class:

```ts
export abstract class DateAdapter<D = unknown> {
  abstract today(): D;
  abstract clone(date: D): D;
  abstract addDays(date: D, days: number): D;
  abstract addMonths(date: D, months: number): D;
  abstract startOfWeek(date: D, firstDay: number): D;
  abstract startOfMonth(date: D): D;
  abstract setTime(date: D, hours: number, minutes: number): D;
  abstract isSameDay(a: D, b: D): boolean;
  abstract compare(a: D, b: D): number;
  abstract getDayOfWeek(date: D): number;
  abstract getHours(date: D): number;
  abstract format(date: D, pattern: string, locale?: string): string;
  abstract parse(value: unknown, pattern?: string): D;
  abstract toNative(date: D): Date;
  abstract fromNative(date: Date): D;
  // …week number, diff, timezone helpers, etc.
}
```

Implementations:
- `NativeDateAdapter` (in core, default, zero deps — uses `Intl` for formatting).
- `LuxonDateAdapter` (in `/luxon-adapter`, wraps `DateTime`).
- `MomentDateAdapter` (in `/moment-adapter`, wraps `moment`).

Provided via:
```ts
provideScheduler(
  provideLuxonDateAdapter({ locale: 'en-US' }),
  ...
)
```

### 6.5 View descriptor model (replaces EJ2 `<e-view>`)

A single grid engine renders all views from a typed descriptor — original design, not per-view
service classes:

```ts
export interface ViewDescriptor {
  type: SchedulerViewType;            // 'day' | 'week' | 'month' | 'timelineYear' | …
  displayName?: string;
  isDefault?: boolean;                // ← maps to isSelected
  interval?: number;
  dateFormat?: string;
  readonly?: boolean;
  showWeekend?: boolean;
  showWeekNumber?: boolean;
  workDays?: number[];
  firstDayOfWeek?: number;
  startHour?: string;
  endHour?: string;
  timeScale?: { enabled: boolean; slotCount: number };
  orientation?: 'horizontal' | 'vertical';
  headerRows?: HeaderRow[];
  allowVirtualScrolling?: boolean;
  grouping?: GroupingConfig;
  templates?: ViewTemplates;          // cell/event/header overrides per view
}
```

Each `SchedulerViewType` maps to a **layout strategy** in the engine:
- *Vertical time grid* (Day, Week, WorkWeek) — time rows × day columns, plus all-day row.
- *Horizontal time grid* (Timeline Day/Week/WorkWeek) — day/time columns × resource rows.
- *Month grid* (Month) — week rows × 7 day columns.
- *Month list* (Timeline Month) — day columns × resource rows.
- *Year grid* (Year) — month mini-calendars; H/V orientation.
- *Year timeline* (Timeline Year) — resource rows × day columns; auto row height.
- *List* (Agenda, Month Agenda) — grouped day list with virtual scroll.

Three reusable layout engines (vertical-time, horizontal-time, calendar-grid/list) cover all 12
views — keeping the bundle small.

---

## 7. Public API design (draft)

```html
<dl-scheduler
  [(activeView)]="activeView"
  [(viewDate)]="viewDate"
  [events]="events"
  [fieldMap]="fieldMap"
  [views]="views"
  [resources]="resources"
  [grouping]="grouping"
  [readonly]="false"
  [rowAutoHeight]="true"
  [agendaDaysCount]="7"
  [hideEmptyAgendaDays]="true"
  height="600px"
  width="100%"
  (eventCreate)="onCreate($event)"
  (eventChange)="onChange($event)"
  (eventDelete)="onDelete($event)"
  (navigate)="onNavigate($event)"
  (viewChange)="onViewChange($event)"
  (cellClick)="onCellClick($event)"
  (eventClick)="onEventClick($event)">

  <!-- Optional template overrides -->
  <ng-template ngsEventTemplate let-event>…</ng-template>
  <ng-template ngsCellTemplate let-cell>…</ng-template>
  <ng-template ngsDateHeaderTemplate let-date>…</ng-template>
  <ng-template ngsResourceHeaderTemplate let-resource>…</ng-template>
  <ng-template ngsTooltipTemplate let-event>…</ng-template>
</dl-scheduler>
```

```ts
import { dayView, weekView, monthView, timelineYearView } from '@datelane/core';

views: ViewDescriptor[] = [
  dayView({ interval: 3, displayName: '3 Days', startHour: '08:00', endHour: '20:00' }),
  weekView({ isDefault: true, firstDayOfWeek: 1, showWeekNumber: true }),
  monthView({ readonly: true }),
  timelineYearView({ orientation: 'vertical' }),
];

fieldMap: FieldMap = {
  id: 'Id', subject: 'Subject',
  start: 'StartTime', end: 'EndTime',
  isAllDay: 'IsAllDay', recurrenceRule: 'RecurrenceRule',
  resource: 'OwnerId',
};
```

Document **every** input/output mapping back to the §2 inventory so completeness is verifiable.

---

## 8. Data, event & recurrence model

- **Normalized event model**: internally convert source records via `fieldMap` into a canonical
  `SchedulerEvent` (start/end as adapter dates, allDay, resourceIds, recurrence, color).
- **Occurrence expansion**: recurrence engine expands RRULE into occurrences for the *visible range
  only* (perf), applying exception dates (EXDATE) and edited-occurrence overrides.
- **Layout/collision**: per view, compute overlapping event columns (vertical), lanes (timeline),
  and `+ more` overflow counts (month/timeline).
- **CRUD pipeline**: editor → emit `eventCreate/Change/Delete` → host updates data → store
  recomputes. Support "this occurrence / this & following / all" for recurring edits.
- **All-day handling**: separate all-day band; expand/collapse; month new-event defaults to all-day.

---

## 9. Step-by-step implementation roadmap

### Phase 0 — Foundations (week 1)
1. `ng new` workspace; `ng generate library scheduler`; add `demo` app.
2. Configure `ng-package.json`, secondary entry points (`luxon-adapter`, `moment-adapter`).
3. Set up lint, Prettier, Jest/Karma, Storybook (optional), CI skeleton.
4. Define core models & tokens (`SchedulerEvent`, `ViewDescriptor`, `FieldMap`, DI tokens).

### Phase 1 — Date adapter + state (week 1–2)
5. Implement abstract `DateAdapter` + `NativeDateAdapter` (Intl formatting, week math).
6. Implement `SchedulerStore` (activeView, viewDate, events, derived visible range).
7. Implement `provideScheduler(...)` + `provideNativeDateAdapter()`.
8. Unit-test date math thoroughly (DST, week boundaries, first-day-of-week).

### Phase 2 — Shell + navigation (week 2)
9. `SchedulerComponent` shell: header bar (prev/next/today, view switcher w/ active highlight,
   date-range label).
10. Calendar popup on date-label click → jump to date.
11. View-switch + navigate outputs; activeView/viewDate two-way binding.

### Phase 3 — Core views via the 3 layout engines (week 3–6)
12. **Vertical-time engine** → Day, Week, WorkWeek. Add: startHour/endHour, timeScale/slotCount,
    showWeekend, showWeekNumber, workDays, all-day row + expand/collapse, click-date→Day.
13. Event rendering + overlap/collision layout in vertical engine.
14. **Calendar-grid engine** → Month. Add: `+ more` indicator + day popup, click-day→Day,
    all-day default new events.
15. **List engine** → Agenda + Month Agenda. Add: agendaDaysCount, hideEmptyAgendaDays,
    virtual scrolling, event dots, day selection.
16. **Year** (calendar-grid variant): mini-calendars, H/V orientation, event dots, day popup.

### Phase 4 — Timeline family (week 6–8)
17. **Horizontal-time engine** → Timeline Day/Week/WorkWeek. Add headerRows, `+ more`,
    click-header navigation rules.
18. **Timeline Month** (horizontal calendar variant).
19. **Timeline Year**: resource rows/cols, `rowAutoHeight`, `+ more` when disabled.

### Phase 5 — Resources & grouping (week 8–9)
20. Resource model (`field/title/name/dataSource/allowMultiple/textField/idField/colorField`).
21. Grouping engine (multi-field, hierarchical/tree), `resourceHeaderTemplate`, color mapping.
22. Wire grouping into timeline + vertical engines.

### Phase 6 — Editing & interaction (week 9–11)
23. Quick popup + full editor window; All-day toggle; field validation.
24. Recurrence engine (RRULE expand + EXDATE + occurrence overrides) and recurrence editor UI.
25. Drag-to-move + resize (mouse & touch); `readonly` per-view enforcement.
26. Keyboard navigation + ARIA roles + focus management.

### Phase 7 — Templating, theming, i18n (week 11–12)
27. Template directives: event/cell/dateHeader/resourceHeader/tooltip/editor.
28. SCSS theme tokens + CSS variables; light/dark; RTL; responsive/mobile.
29. i18n provider (locale, messages, date patterns) routed through the adapter.

### Phase 8 — Adapters, hardening, release (week 12–13)
30. `LuxonDateAdapter` + `MomentDateAdapter` entry points; tests vs Native parity.
31. Cross-version CI matrix (Angular 14/16/18/latest); SSR smoke test.
32. Accessibility audit, perf pass (virtual scroll, occurrence windowing).
33. Docs site + demo; publish `0.x` to npm; gather feedback → `1.0`.

> Keep a living copy of the §2 tables; PRs flip ☐→☑. MVP = all of §2.1–§2.4 done.

---

## 10. NPM packaging & publishing

- **Build:** `ng build scheduler` → `ng-packagr` emits FESM2022 + types + secondary entry points.
- **`projects/datelane/package.json`** (published):
  ```jsonc
  {
    "name": "@datelane/core",
    "version": "0.1.0",
    "sideEffects": false,                 // enables tree-shaking
    "peerDependencies": { "@angular/core": ">=14", "@angular/common": ">=14" },
    "peerDependenciesMeta": {
      "luxon": { "optional": true },
      "moment": { "optional": true }
    },
    "exports": {                          // ng-packagr generates these for entry points
      ".": { /* core */ },
      "./luxon-adapter": { /* … */ },
      "./moment-adapter": { /* … */ }
    }
  }
  ```
- **Styles:** ship compiled CSS + source SCSS + a `_theme.scss` for token overrides; document how
  to import (`@import '@datelane/core/styles/scheduler.css'`).
- **Publishing:** semantic-release or manual `npm publish dist/datelane --access public`. Tag
  pre-releases as `next`. Provide a CHANGELOG and an `ng-add` schematic later for one-command setup.
- **Quality gates before publish:** types resolve, no Angular hard dep, bundle-size budget check,
  `publint`/`arethetypeswrong` clean.

---

## 11. Testing strategy

- **Unit:** date adapters (all three, parity tests), recurrence expansion, collision/layout math,
  grouping.
- **Component:** each view renders correct cells/labels; navigation; CRUD outputs.
- **Interaction:** drag/resize/keyboard via Testing Library + harnesses.
- **Visual/e2e:** Playwright snapshots per view + theme; mobile viewport.
- **Version matrix CI:** install against multiple Angular majors and run the build + a smoke demo.
- **SSR:** ensure no direct `window`/`document` access without guards.

---

## 12. Docs & demo

- Demo app: live playground per view, theme switcher, code snippets, "configure your view" panel.
- Docs: getting started, date-adapter setup, every view, every config option (mirror §2 so users can
  verify completeness), templating recipes, theming guide, migration notes from common alternatives.
- Each documented option links to a runnable example — original content, written fresh.

---

## 13. Suggested milestones

| Milestone | Contents | Target |
|-----------|----------|--------|
| **M1 – Skeleton** | workspace, adapter, store, shell+nav | end wk 2 |
| **M2 – Calendar views** | Day/Week/WorkWeek/Month/Agenda/MonthAgenda/Year | end wk 6 |
| **M3 – Timeline views** | all 5 timeline views + resources/grouping | end wk 9 |
| **M4 – Editing** | editor, recurrence, drag/resize, a11y | end wk 11 |
| **M5 – Polish + 0.x release** | templates, theming, i18n, Luxon/Moment, docs | end wk 13 |
| **1.0** | feedback, stabilize API, version-matrix green | +2–3 wk |

---

### Quick "definition of done" for MVP completeness
All boxes in **§2.1, §2.2, §2.3, §2.4** are ☑, the three date adapters pass parity tests, the package
builds with zero hard runtime deps, and the demo renders every view. The §2.5 extras can land across
later minor versions.
