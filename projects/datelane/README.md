# @datelane/core

> Lightweight, customizable, dependency-free **Angular scheduler / calendar** with pluggable date adapters (Native / Luxon / Moment).

[![npm](https://img.shields.io/npm/v/@datelane/core.svg)](https://www.npmjs.com/package/@datelane/core)
[![license](https://img.shields.io/npm/l/@datelane/core.svg)](https://github.com/devendramilmile121/datelane/blob/main/LICENSE)

## 🚀 Live demo

**[devendramilmile121.github.io/datelane](https://devendramilmile121.github.io/datelane/)**

Try all 12 views, drag/resize events, switch themes, and read the full **Developer Guide**
(install → API reference → live theme builder) right in the browser.

---

## Why

- **Zero hard runtime deps** — only `@angular/*` peers. `luxon` / `moment` are *optional*.
- **All 12 views** — Day, Week, Work Week, Month, Year, Agenda, Month-Agenda, and 5 Timeline views.
- **Tree-shakeable** — views are factory functions; you only pay for what you import.
- **Pluggable date layer** — Native (default), Luxon, or Moment via secondary entry points.
- **Controlled component** — never mutates your data; emits proposed changes, you apply them.
- **Themeable** — entire surface is `--dl-*` CSS custom properties. Dark mode + RTL built in.
- **Accessible** — roles, keyboard model, focus management, AA contrast from the first render.
- **Standalone-only, signal-first** — Angular 18–22.

## Install

```bash
npm install @datelane/core
```

Import the stylesheet once (e.g. `styles.scss` or `angular.json`):

```scss
@import '@datelane/core/styles/scheduler.css';
```

## Quick start

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideScheduler } from '@datelane/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideScheduler()], // Native adapter by default
});
```

```ts
import { Component } from '@angular/core';
import {
  SchedulerComponent, dayView, weekView, monthView,
  type FieldMap, type SchedulerViewType,
} from '@datelane/core';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [SchedulerComponent],
  template: `
    <dl-scheduler
      [(activeView)]="view"
      [views]="views"
      [events]="events"
      [fieldMap]="fieldMap"
      height="600px"
      (eventClick)="onClick($event)">
    </dl-scheduler>
  `,
})
export class AppComponent {
  view: SchedulerViewType = 'week';
  views = [dayView(), weekView({ isDefault: true }), monthView()];
  fieldMap: FieldMap = { id: 'id', subject: 'title', start: 'from', end: 'to' };
  events = [{ id: 1, title: 'Standup', from: new Date(), to: new Date() }];
  onClick(c: any) { console.log('clicked', c.event.subject); }
}
```

That's a complete working scheduler — the built-in header gives prev/next/today, a date-range
label, and a view switcher driven by `[views]`.

## Date adapters

Core ships the zero-dep `NativeDateAdapter`. Opt into Luxon or Moment via secondary entry points:

```ts
import { provideScheduler } from '@datelane/core';
import { provideLuxonDateAdapter } from '@datelane/core/luxon-adapter';

provideScheduler(provideLuxonDateAdapter({ locale: 'en-US' }));
```

## Theming

Override any `--dl-*` token — no `::ng-deep`, no fork. A single `--dl-accent` recolors selection,
today, focus ring, and default events. Build your palette interactively in the
[live theme builder](https://devendramilmile121.github.io/datelane/).

```css
.dl-scheduler {
  --dl-accent: #2563eb;
  --dl-radius-md: 10px;
  --dl-slot-h: 48px;
}
```

## Documentation

Full input/output reference, every view option, templates, i18n, and the complete export index live
in the **[Developer Guide](https://devendramilmile121.github.io/datelane/)** (Developer Guide tab).

## Angular support

Standalone-only, signal-first. Peer range: `@angular/core` & `@angular/common` `>=18.0.0 <23.0.0`.

## License

MIT © [Devendra Milmile](https://github.com/devendramilmile121)
