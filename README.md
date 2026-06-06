# @datelane/core

A lightweight, fully customizable **Angular scheduler / calendar** — all 12 view modes
(Day, Week, Work Week, Month, Year, Agenda, Month Agenda, and the five Timeline views) — with
**zero hard runtime dependencies** and a **pluggable date layer** (Native, Luxon, or Moment).

> Status: `0.1.0` pre-release. The 12 views, drag/resize, a host-driven quick-view, resources,
> and auto-scroll are implemented. Recurrence, a full editor window, and keyboard grid navigation
> are on the roadmap (see [Limitations](#limitations)).

## Highlights

- **Lightweight** — core has no runtime deps; each view is a tree-shakeable factory; you ship only
  the views you import.
- **Bring your own date library** — Native (built in, `Intl`-based), Luxon, or Moment via separate
  entry points. No date library baked into core.
- **Controlled & unopinionated editing** — the library ships **no form**. It emits click events and
  shows an optional quick-view popover you can fully replace; your app owns create/edit/delete.
- **Customizable** — every color/size/motion value is a CSS custom property; the quick-view is
  template-overridable.
- **Wide Angular support** — published in partial-Ivy mode, verified by real AOT builds on
  **Angular 18–22**. RTL-safe, dark-mode-ready.

## Install

```bash
npm i @datelane/core
# optional — only if you choose that date adapter:
npm i luxon      # or: npm i moment
```

Peer deps: `@angular/core` and `@angular/common` `>=18.0.0 <23.0.0`. `luxon`/`moment` are
**optional** peers.

## Quick start (standalone, Native dates)

Register the scheduler providers once at bootstrap:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideScheduler } from '@datelane/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideScheduler()], // Native date adapter by default
});
```

Use the component and pick the views you want:

```ts
import { Component } from '@angular/core';
import {
  SchedulerComponent, weekView, monthView, timelineWeekView,
  type FieldMap, type ViewDescriptor, type SchedulerViewType, type SchedulerChange,
} from '@datelane/core';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [SchedulerComponent],
  template: `
    <dl-scheduler
      [(activeView)]="view"
      [(viewDate)]="date"
      [events]="events"
      [fieldMap]="fieldMap"
      [views]="views"
      height="640px"
      (eventClick)="onEventClick($event)"
      (eventEdit)="openMyForm($event)"
      (eventDelete)="onDelete($event)"
      (eventChange)="onDragResize($event)"
      (cellClick)="onEmptySlot($event)">
    </dl-scheduler>`,
})
export class AppComponent {
  view: SchedulerViewType = 'week';
  date = new Date();

  views: ViewDescriptor[] = [
    weekView({ isDefault: true, startHour: '08:00', endHour: '20:00' }),
    monthView(),
    timelineWeekView(),
  ];

  fieldMap: FieldMap = { id: 'id', subject: 'subject', start: 'start', end: 'end' };

  events = [
    { id: 1, subject: 'Standup', start: new Date(), end: new Date(Date.now() + 30 * 60_000) },
  ];

  onEventClick(c: SchedulerChange) { /* always fires on activation */ }
  openMyForm(c: SchedulerChange) { /* quick-view "Edit" → open YOUR dialog */ }
  onDelete(c: SchedulerChange) { this.events = this.events.filter(e => e.id !== c.event.id); }
  onDragResize(c: SchedulerChange) { /* apply c.event.start/end back into your data */ }
  onEmptySlot(p: { date: unknown; resourceId?: string | number }) { /* open create form */ }
}
```

## Styling

The package ships **SCSS** (tokens + theme + component styles); there is no pre-compiled CSS yet.
Import it once. Either add it to `angular.json`:

```jsonc
// angular.json → projects.<app>.architect.build.options.styles
"styles": [
  "src/styles.scss",
  "node_modules/@datelane/core/styles/scheduler.scss"
]
```

…or `@use` it from your global stylesheet:

```scss
/* src/styles.scss */
@use '@datelane/core/styles/scheduler';
```

## Views

All 12 views are tree-shakeable factory functions returning a typed `ViewDescriptor`. Import only
the ones you use.

| Factory | View | Engine |
|---------|------|--------|
| `dayView()` | Day | vertical-time |
| `weekView()` | Week | vertical-time |
| `workWeekView()` | Work Week | vertical-time |
| `monthView()` | Month | calendar-grid |
| `yearView()` | Year | year-grid |
| `agendaView()` | Agenda | list |
| `monthAgendaView()` | Month Agenda | mini-calendar + list |
| `timelineDayView()` | Timeline Day | horizontal-time |
| `timelineWeekView()` | Timeline Week | horizontal-time |
| `timelineWorkWeekView()` | Timeline Work Week | horizontal-time |
| `timelineMonthView()` | Timeline Month | horizontal-time |
| `timelineYearView()` | Timeline Year | horizontal-time |

Each factory takes a partial `ViewDescriptor` to configure that view:

```ts
import { dayView, weekView, monthView, timelineYearView } from '@datelane/core';

views = [
  dayView({ interval: 3, displayName: '3 Days', startHour: '08:00', endHour: '20:00' }),
  weekView({ isDefault: true, firstDayOfWeek: 1, showWeekNumber: true }),
  monthView({ showWeekend: false }),
  timelineYearView({ orientation: 'vertical' }),
];
```

`ViewDescriptor` fields: `type`, `displayName`, `isDefault`, `interval`, `dateFormat`, `readonly`,
`showWeekend`, `showWeekNumber`, `workDays`, `firstDayOfWeek`, `startHour`, `endHour`,
`timeScale: { enabled, slotCount }`, `orientation`, `headerRows`, `allowVirtualScrolling`,
`grouping`. Only options that apply to a given view type are honored.

## Data & `FieldMap`

You pass raw records via `[events]` and a `[fieldMap]` that maps your field names onto the canonical
event shape — no need to reshape your data.

```ts
fieldMap: FieldMap = {
  id: 'Id',
  subject: 'Subject',
  start: 'StartTime',
  end: 'EndTime',
  isAllDay: 'IsAllDay',          // optional
  recurrenceRule: 'RecurrenceRule', // optional (reserved; engine pending)
  resource: 'OwnerId',           // optional — string or string[]
  color: 'Color',                // optional — overrides resource color
  location: 'Location',          // optional — shown in the quick-view
  description: 'Description',     // optional — shown in the quick-view
};
```

Dates may be `Date`, ISO string, or epoch number — the active date adapter parses them.

## Inputs

| Input | Type | Default | Notes |
|-------|------|---------|-------|
| `activeView` | `SchedulerViewType` | `'week'` | two-way (`activeViewChange`) |
| `viewDate` | adapter date | today | two-way (`viewDateChange`) |
| `events` | `Record<string, unknown>[]` | `[]` | raw records |
| `fieldMap` | `FieldMap` | — | required to render events |
| `views` | `ViewDescriptor[]` | `[]` | from the view factories |
| `resources` | `ResourceDefinition[]` | `[]` | Timeline rows |
| `grouping` | `GroupingConfig` | — | `{ resources: ['name'] }` |
| `readonly` | `boolean` | `false` | disables drag/resize + quick-view actions |
| `rowAutoHeight` | `boolean` | `false` | Timeline: grow rows vs `+N more` |
| `agendaDaysCount` | `number` | `7` | Agenda span |
| `hideEmptyAgendaDays` | `boolean` | `false` | Agenda |
| `showQuickView` | `boolean` | `true` | built-in popover on activation |
| `autoScroll` | `boolean` | `true` | scroll to first event (see below) |
| `scrollHour` | `number` | — | time grids: scroll to this hour instead |
| `height` | `string` | `'600px'` | required px height for Agenda / Month Agenda |
| `width` | `string` | `'100%'` | |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | RTL mirrors the layout |

## Outputs

| Output | Payload | When |
|--------|---------|------|
| `eventClick` | `SchedulerChange` | any event activation (always) |
| `eventEdit` | `SchedulerChange` | quick-view **Edit** → open your form |
| `eventDelete` | `SchedulerChange` | quick-view **Delete** |
| `eventChange` | `SchedulerChange` | after a drag-move or resize |
| `eventCreate` | `SchedulerChange` | reserved for the editor (pending) |
| `cellClick` | `{ date, resourceId? }` | empty slot/cell — open your create form |
| `navigate` | `NavigateEvent` | date navigation / drill-through |
| `viewChange` | `SchedulerViewType` | active view changed |

`SchedulerChange` = `{ event: SchedulerEvent; scope?: 'occurrence' | 'following' | 'series' }`.
The component never mutates your data — apply changes yourself and pass them back via `[events]`.

## Editing model (bring your own form)

The library intentionally ships **no editor**. On event activation it:

1. always emits `(eventClick)`, and
2. (unless `[showQuickView]="false"`) opens a small built-in **quick-view** popover.

The quick-view's **Edit** / **Delete** buttons forward to `(eventEdit)` / `(eventDelete)` so your
app opens its own dialog. Replace the popover entirely with the `ngsQuickViewTemplate` directive:

```html
<dl-scheduler …>
  <ng-template ngsQuickViewTemplate let-event let-close="close" let-edit="edit" let-delete="delete">
    <h4>{{ event.subject }}</h4>
    <button (click)="edit()">Open my form</button>
    <button (click)="delete()">Delete</button>
    <button (click)="close()">Close</button>
  </ng-template>
</dl-scheduler>
```

For empty-slot creation, handle `(cellClick)` and open your own create dialog.

## Resources & grouping (Timeline)

```ts
resources: ResourceDefinition[] = [{
  field: 'ownerId', name: 'owners', title: 'Owner',
  idField: 'id', textField: 'text', colorField: 'color',
  dataSource: [
    { id: 1, text: 'Alex',  color: '#2563eb' },
    { id: 2, text: 'Priya', color: '#16a34a' },
  ],
}];
```

```html
<dl-scheduler [resources]="resources" [grouping]="{ resources: ['owners'] }" …>
```

Events are placed on the row whose `idField` matches the event's mapped `resource`. Single-level
grouping is supported today; hierarchical grouping is on the roadmap.

## Auto-scroll

Scrolling views (Day/Week/Work Week, Timeline, Agenda, Year) scroll to the first event on first
render and when you navigate to a new period — but **not** on edits or drag, so a user's manual
scroll is preserved. Configure with `[autoScroll]` (default `true`) and, for time grids,
`[scrollHour]` to jump to a fixed hour instead of the first event.

## Date adapters

Core ships the zero-dependency `NativeDateAdapter`. Opt into Luxon or Moment via secondary entry
points (their libraries are optional peers):

```ts
import { provideScheduler } from '@datelane/core';
import { provideLuxonDateAdapter } from '@datelane/core/luxon-adapter';
// or: import { provideMomentDateAdapter } from '@datelane/core/moment-adapter';

providers: [provideScheduler(provideLuxonDateAdapter({ locale: 'fr' }))];
```

## NgModule (non-standalone apps)

Standalone-first, but an `NgModule` surface is exported for non-standalone apps:

```ts
import { SchedulerModule } from '@datelane/core';

@NgModule({ imports: [SchedulerModule.forRoot(/* optional adapter providers */)] })
export class AppModule {}
```

## Theming

Override any token on `.dl-scheduler` (or an ancestor) — no `::ng-deep`, no fork:

```css
.dl-scheduler {
  --dl-accent: #2563eb;
  --dl-radius-md: 10px;
  --dl-slot-h: 48px;
}
.dl-scheduler[data-dl-theme="dark"] { /* built-in dark theme */ }
```

Full token list is in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

## Angular support

| Angular | Status |
|---------|--------|
| 18 | ✅ verified (AOT build) |
| 19 | ✅ verified (AOT build) |
| 20 | ✅ verified (AOT build) |
| 21 | ✅ verified (AOT build) |
| 22 | ✅ verified (AOT build) |

Published in **partial-Ivy** mode, so the consuming app's compiler links it (not locked to one
runtime); declaration `minVersion` is **17**. `scripts/verify-angular.sh <major>` scaffolds a real
app on a version, installs the packed tarball, and runs a production AOT build — CI runs it across
all five majors.

## Limitations

- Recurrence (RRULE/EXDATE), a full editor window, and keyboard grid navigation are not yet
  implemented.
- Timeline resource grouping is single-level (no hierarchy yet).
- Agenda does not yet virtualize long ranges.
- Luxon/Moment adapters lack a shared parity test suite; Moment format-token parity is unverified.
- No pre-compiled CSS is shipped yet — import the SCSS (see [Styling](#styling)).

See [scheduler-plan.md](scheduler-plan.md) for the full roadmap and [CHANGELOG.md](CHANGELOG.md) for
release notes.

## License

MIT
