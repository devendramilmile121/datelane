# @datelane/core

A lightweight, fully customizable **Angular scheduler / calendar** — Day, Week, Work Week, Month,
Year, Agenda, Month Agenda, and all five Timeline views — with **zero hard runtime dependencies** and
a **pluggable date layer** (Native, Luxon, or Moment).

> Status: early scaffold. See `scheduler-plan.md` for the full roadmap and `DESIGN-SYSTEM.md` for the
> theming/UX contract.

## Why
- **Lightweight** — core has no runtime deps; each view is tree-shakeable; bring only what you import.
- **Bring your own date library** — Native (built in), Luxon, or Moment via separate entry points.
- **Customizable** — every color/size/motion value is a CSS token; templates for every slot.
- **Accessible & responsive** — keyboard, ARIA, RTL, dark mode, mobile out of the box.

## Install
```bash
npm i @datelane/core
# optional, only if you choose that adapter:
npm i luxon      # or: npm i moment
```

## Quick start (standalone, Native dates)
```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideScheduler } from '@datelane/core';

bootstrapApplication(AppComponent, {
  providers: [provideScheduler()], // Native adapter by default
});
```

```ts
import { Component } from '@angular/core';
import { SchedulerComponent, weekView, monthView, timelineWeekView } from '@datelane/core';

@Component({
  standalone: true,
  imports: [SchedulerComponent],
  template: `
    <dl-scheduler
      [(activeView)]="view"
      [(viewDate)]="date"
      [events]="events"
      [fieldMap]="fieldMap"
      [views]="views"
      height="640px">
    </dl-scheduler>`,
})
export class DemoComponent {
  view = 'week' as const;
  date = new Date();
  events = [{ Id: 1, Subject: 'Standup', StartTime: new Date(), EndTime: new Date() }];
  fieldMap = { id: 'Id', subject: 'Subject', start: 'StartTime', end: 'EndTime' };
  views = [weekView({ isDefault: true }), monthView(), timelineWeekView()];
}
```

```css
/* import the compiled theme once */
@import '@datelane/core/styles/scheduler.css';
```

## Using Luxon or Moment
```ts
import { provideScheduler } from '@datelane/core';
import { provideLuxonDateAdapter } from '@datelane/core/luxon-adapter';

providers: [provideScheduler(provideLuxonDateAdapter({ locale: 'fr' }))];
```

## Theming
Override any token on `.dl-scheduler` (or an ancestor):
```css
.dl-scheduler { --dl-accent: #2563eb; --dl-radius-md: 10px; }
.dl-scheduler[data-dl-theme="dark"] { /* built-in dark theme */ }
```
Full token list: `DESIGN-SYSTEM.md`.

## Angular support
Primary: **Angular 14+** (standalone). Older apps (9–13) can use the exported `SchedulerModule`.
Date libraries are optional peer deps.

## License
MIT
