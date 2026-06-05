import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import {
  provideScheduler,
  SchedulerComponent,
  dayView,
  weekView,
  workWeekView,
  monthView,
  timelineWeekView,
  type FieldMap,
  type SchedulerChange,
  type SchedulerViewType,
} from '@datelane/core';

// Demo app may use native Date freely — the no-`new Date()` rule is for the library only.
const monday = startOfThisWeek();
const at = (dayOffset: number, h: number, m: number) => {
  const d = new Date(monday);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};
// A date at day-of-month of the CURRENT month (for the Month view demo).
const dom = (day: number, h = 0, m = 0) => {
  const d = new Date();
  d.setDate(day);
  d.setHours(h, m, 0, 0);
  return d;
};

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [SchedulerComponent],
  template: `
    <h1 style="font:600 18px system-ui; margin:0 0 4px">@datelane/core — Week &amp; Month demo</h1>
    <p style="font:13px system-ui; color:#5b6470; margin:0 0 12px">
      In Week/Day: drag to move, drag the top/bottom grip to resize. In Month: click a day to drill
      into it, click a chip to select an event. The scheduler is controlled — it emits
      <code>(eventChange)</code>/<code>(eventClick)</code>/<code>(viewChange)</code>. Last change:
      <strong>{{ lastChange || '—' }}</strong>
    </p>
    <div style="display:flex; gap:6px; margin-bottom:12px">
      @for (v of switchable; track v) {
        <button
          type="button"
          (click)="view = v"
          [style.font]="'500 13px system-ui'"
          [style.padding]="'6px 12px'"
          [style.border]="'1px solid ' + (view === v ? '#2563eb' : '#cdd2d9')"
          [style.borderRadius]="'6px'"
          [style.background]="view === v ? '#e8effe' : '#fff'"
          [style.color]="view === v ? '#2563eb' : '#1c2024'"
          [style.cursor]="'pointer'">
          {{ v }}
        </button>
      }
      @if (view === 'month') {
        <label style="display:flex; align-items:center; gap:6px; font:13px system-ui; margin-inline-start:8px">
          <input type="checkbox" [checked]="hideWeekends" (change)="hideWeekends = !hideWeekends" />
          Hide weekends
        </label>
      }
    </div>
    <dl-scheduler
      [(activeView)]="view"
      [views]="views"
      [events]="events"
      [fieldMap]="fieldMap"
      height="680px"
      (eventChange)="onChange($event)"
      (eventClick)="onClick($event)"
      (viewChange)="lastChange = 'switched to ' + $event">
    </dl-scheduler>
  `,
})
export class AppComponent {
  view: SchedulerViewType = 'week';
  switchable: SchedulerViewType[] = ['day', 'week', 'workWeek', 'month'];
  hideWeekends = false;

  get views() {
    const hours = { startHour: '00:00', endHour: '24:00' }; // full day, scrolls
    return [
      dayView(hours),
      weekView({ isDefault: true, ...hours }),
      workWeekView(hours),
      monthView({ showWeekend: !this.hideWeekends }),
      timelineWeekView(),
    ];
  }

  fieldMap: FieldMap = {
    id: 'id',
    subject: 'subject',
    start: 'start',
    end: 'end',
    color: 'color',
    isAllDay: 'allDay',
  };

  events = [
    { id: 1, subject: 'Standup', start: at(0, 9, 0), end: at(0, 9, 30), color: '#2563eb' },
    { id: 2, subject: 'Design review', start: at(1, 11, 0), end: at(1, 12, 30), color: '#16a34a' },
    { id: 3, subject: 'Lunch w/ Priya', start: at(2, 12, 30), end: at(2, 13, 30), color: '#d97706' },
    { id: 4, subject: 'Sprint planning', start: at(3, 10, 0), end: at(3, 11, 30), color: '#7c3aed' },
    // Overlapping pair on Wednesday → side-by-side columns.
    { id: 5, subject: 'Client call', start: at(3, 11, 0), end: at(3, 12, 0), color: '#dc2626' },
    { id: 6, subject: '1:1 with manager', start: at(4, 15, 0), end: at(4, 16, 0), color: '#0891b2' },
    // A multi-day all-day event → renders as one spanning bar in Month.
    { id: 13, subject: 'Offsite', start: dom(9), end: dom(11, 23, 59), color: '#0891b2', allDay: true },
    // Spread across the month so the Month view shows chips + a “+N more”.
    { id: 7, subject: 'Payroll', start: dom(12, 9, 0), end: dom(12, 10, 0), color: '#16a34a' },
    { id: 8, subject: 'Board mtg', start: dom(18, 14, 0), end: dom(18, 15, 30), color: '#7c3aed' },
    { id: 9, subject: 'Release', start: dom(24, 16, 0), end: dom(24, 17, 0), color: '#dc2626' },
    { id: 10, subject: 'Retro', start: dom(24, 17, 0), end: dom(24, 18, 0), color: '#0891b2' },
    { id: 11, subject: 'Demo day', start: dom(24, 18, 0), end: dom(24, 19, 0), color: '#d97706' },
    { id: 12, subject: 'Town hall', start: dom(24, 19, 0), end: dom(24, 20, 0), color: '#2563eb' },
  ];

  lastChange = '';

  /** Controlled update: apply the dropped event's new start/end back into our data. */
  onChange(change: SchedulerChange): void {
    const start = change.event.start as Date;
    const end = change.event.end as Date;
    this.events = this.events.map((e) =>
      e.id === change.event.id ? { ...e, start, end } : e,
    );
    this.lastChange = `${change.event.subject} → ${fmt(start)}–${fmt(end)}`;
  }

  onClick(change: SchedulerChange): void {
    this.lastChange = `clicked ${change.event.subject}`;
  }
}

function fmt(d: Date): string {
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

function startOfThisWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d;
}

bootstrapApplication(AppComponent, { providers: [provideScheduler()] });
