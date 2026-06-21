import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  SchedulerComponent,
  QuickViewTemplateDirective,
  dayView,
  weekView,
  workWeekView,
  monthView,
  yearView,
  agendaView,
  monthAgendaView,
  timelineDayView,
  timelineWeekView,
  timelineMonthView,
  timelineYearView,
  type FieldMap,
  type SchedulerChange,
  type SchedulerViewType,
  type ResourceDefinition,
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
  selector: 'app-playground',
  imports: [SchedulerComponent, QuickViewTemplateDirective, NgClass],
  styles: [`
    /* Theme showcase — each class just overrides @datelane/core CSS custom properties.
       Accent drives selection, today, focus ring and default event colors via color-mix,
       so a single --dl-accent recolours most of the UI; a few surface tokens add flavour. */
    .t-ocean {
      --dl-accent: #0891b2; --dl-bg: #f0fbfe; --dl-bg-subtle: #e3f4fa;
      --dl-surface: #ffffff; --dl-border: #cdeaf2; --dl-weekend: #eaf7fb;
    }
    .t-sunset {
      --dl-accent: #f97316; --dl-bg: #fff7f0; --dl-bg-subtle: #ffeede;
      --dl-surface: #fffaf5; --dl-border: #ffe0c2; --dl-weekend: #fff2e6;
    }
    .t-forest {
      --dl-accent: #16a34a; --dl-bg: #f3faf4; --dl-bg-subtle: #e6f4e9;
      --dl-surface: #ffffff; --dl-border: #cfe9d6; --dl-weekend: #eef7f0;
    }
    /* Dark variants: library dark mapping (data-dl-theme="dark") + a tinted accent. */
    .t-grape { --dl-accent: #a855f7; --dl-now-line: #f0abfc; }
    .t-rose  { --dl-accent: #fb7185; --dl-now-line: #fda4af; }

    .theme-picker {
      display: inline-flex; align-items: center; gap: 8px;
      font: 13px system-ui; color: #5b6470; margin-bottom: 12px;
    }
    .theme-picker select {
      font: 500 13px system-ui; padding: 5px 10px;
      border: 1px solid #cdd2d9; border-radius: 6px; background: #fff; cursor: pointer;
    }
  `],
  template: `
    <p style="font:13px system-ui; color:#5b6470; margin:0 0 12px">
      Day/Week: drag to move + grip-resize. Month: drag bars, click day to drill. Year/MonthAgenda:
      dots + day drill. Agenda: list. Timeline: resource rows (grouped by owner) — click a column
      header to drill in. Click the header <strong>date label</strong> for a calendar to jump dates.
      The recurring <strong>Yoga</strong> event (Mon/Wed/Fri) is expanded automatically — one Wed is
      skipped via EXDATE. Click any event for the built-in quick-view — its Edit button emits
      <code>(eventEdit)</code> so YOU open your form.
      Last: <strong>{{ lastChange || '—' }}</strong>
    </p>
    <label class="theme-picker">
      Theme
      <select (change)="theme = $any($event.target).value">
        @for (t of themes; track t.id) {
          <option [value]="t.id" [selected]="t.id === theme">{{ t.label }}</option>
        }
      </select>
    </label>

    <!-- The scheduler's built-in header provides the view switcher (driven by [views]). -->
    <dl-scheduler
      [ngClass]="'t-' + theme"
      [attr.data-dl-theme]="isDark ? 'dark' : null"
      [(activeView)]="view"
      [views]="views"
      [events]="events"
      [fieldMap]="fieldMap"
      [resources]="resources"
      [grouping]="{ resources: ['owners'] }"
      [rowAutoHeight]="true"
      height="680px"
      (eventChange)="onChange($event)"
      (eventClick)="onClick($event)"
      (eventEdit)="onEdit($event)"
      (eventDelete)="onDelete($event)"
      (cellClick)="onCell($event)"
      (viewChange)="lastChange = 'switched to ' + $event">
      <!-- Host-supplied quick-view override (only used on the Agenda view to show it's pluggable). -->
      @if (view === 'agenda') {
        <ng-template ngsQuickViewTemplate let-event let-close="close" let-edit="edit">
          <div style="padding:4px 2px">
            <strong style="font:600 14px system-ui">{{ event.subject }}</strong>
            <p style="font:12px system-ui; color:#5b6470; margin:4px 0 8px">Custom host popover</p>
            <button type="button" (click)="edit()"
              style="font:500 12px system-ui; padding:4px 10px; border:1px solid #2563eb; border-radius:6px; background:#e8effe; color:#2563eb; cursor:pointer">
              Open my form
            </button>
            <button type="button" (click)="close()"
              style="font:500 12px system-ui; padding:4px 10px; margin-inline-start:6px; border:1px solid #cdd2d9; border-radius:6px; background:#fff; cursor:pointer">
              Close
            </button>
          </div>
        </ng-template>
      }
    </dl-scheduler>
  `,
})
export class PlaygroundComponent {
  view: SchedulerViewType = 'week';

  // Theme showcase: light, library dark, and a few token-override palettes.
  readonly themes = [
    { id: 'light', label: 'Light', dark: false },
    { id: 'dark', label: 'Dark', dark: true },
    { id: 'ocean', label: 'Ocean', dark: false },
    { id: 'sunset', label: 'Sunset', dark: false },
    { id: 'forest', label: 'Forest', dark: false },
    { id: 'grape', label: 'Grape (dark)', dark: true },
    { id: 'rose', label: 'Rosé (dark)', dark: true },
  ];
  theme = 'light';
  get isDark(): boolean { return this.themes.find((t) => t.id === this.theme)?.dark ?? false; }

  resources: ResourceDefinition[] = [
    {
      field: 'ownerId', name: 'owners', title: 'Owner',
      idField: 'id', textField: 'text', colorField: 'color',
      dataSource: [
        { id: 1, text: 'Alex', color: '#2563eb' },
        { id: 2, text: 'Priya', color: '#16a34a' },
        { id: 3, text: 'Sam', color: '#d97706' },
      ],
    },
  ];

  get views() {
    const hours = { startHour: '00:00', endHour: '24:00' }; // full day, scrolls
    return [
      dayView(hours),
      weekView({ isDefault: true, ...hours }),
      workWeekView(hours),
      monthView(),
      yearView(),
      agendaView(),
      monthAgendaView(),
      timelineDayView({ ...hours, timeScale: { enabled: true, slotCount: 1 } }),
      timelineWeekView(),
      timelineMonthView(),
      timelineYearView(),
    ];
  }

  fieldMap: FieldMap = {
    id: 'id',
    subject: 'subject',
    start: 'start',
    end: 'end',
    color: 'color',
    isAllDay: 'allDay',
    resource: 'ownerId',
    location: 'location',
    recurrenceRule: 'rrule',
    recurrenceExceptions: 'exdates',
  };

  events = [
    { id: 1, subject: 'Standup', start: at(0, 9, 0), end: at(0, 9, 30), color: '#2563eb', ownerId: 1, location: 'Zoom' },
    { id: 2, subject: 'Design review', start: at(1, 11, 0), end: at(1, 12, 30), color: '#16a34a', ownerId: 2 },
    { id: 3, subject: 'Lunch w/ Priya', start: at(2, 12, 30), end: at(2, 13, 30), color: '#d97706', ownerId: 3 },
    { id: 4, subject: 'Sprint planning', start: at(3, 10, 0), end: at(3, 11, 30), color: '#7c3aed', ownerId: 1 },
    // Overlapping pair on Wednesday → side-by-side columns.
    { id: 5, subject: 'Client call', start: at(3, 11, 0), end: at(3, 12, 0), color: '#dc2626', ownerId: 2 },
    { id: 6, subject: '1:1 with manager', start: at(4, 15, 0), end: at(4, 16, 0), color: '#0891b2', ownerId: 3 },
    // Recurring event: MWF at 08:00, expanded automatically into occurrences (skips next Wed).
    {
      id: 14, subject: 'Yoga', start: at(0, 8, 0), end: at(0, 8, 45), color: '#16a34a', ownerId: 1,
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12', exdates: fmtExdate(at(2, 8, 0)),
    },
    // A multi-day all-day event → renders as one spanning bar in Month.
    { id: 13, subject: 'Offsite', start: dom(9), end: dom(11, 23, 59), color: '#0891b2', allDay: true, ownerId: 1 },
    // Spread across the month so the Month view shows chips + a “+N more”.
    { id: 7, subject: 'Payroll', start: dom(12, 9, 0), end: dom(12, 10, 0), color: '#16a34a', ownerId: 2 },
    { id: 8, subject: 'Board mtg', start: dom(18, 14, 0), end: dom(18, 15, 30), color: '#7c3aed', ownerId: 1 },
    { id: 9, subject: 'Release', start: dom(24, 16, 0), end: dom(24, 17, 0), color: '#dc2626', ownerId: 3 },
    { id: 10, subject: 'Retro', start: dom(24, 17, 0), end: dom(24, 18, 0), color: '#0891b2', ownerId: 2 },
    { id: 11, subject: 'Demo day', start: dom(24, 18, 0), end: dom(24, 19, 0), color: '#d97706', ownerId: 1 },
    { id: 12, subject: 'Town hall', start: dom(24, 19, 0), end: dom(24, 20, 0), color: '#2563eb', ownerId: 3 },
  ];

  lastChange = '';

  /** Controlled update: apply the dropped event's new start/end back into our data. */
  onChange(change: SchedulerChange): void {
    const start = change.event.start as Date;
    const end = change.event.end as Date;
    if (change.scope === 'occurrence') {
      // A recurring occurrence moved — a real app would split the series here (add an EXDATE +
      // a standalone event). We just report it so the series isn't silently shifted as a whole.
      this.lastChange = `occurrence of "${change.event.subject}" → ${fmt(start)} (host splits series)`;
      return;
    }
    this.events = this.events.map((e) =>
      e.id === change.event.id ? { ...e, start, end } : e,
    );
    this.lastChange = `${change.event.subject} → ${fmt(start)}–${fmt(end)}`;
  }

  onClick(change: SchedulerChange): void {
    this.lastChange = `clicked ${change.event.subject}`;
  }
  /** Host opens its OWN form here — the library never ships an editor. */
  onEdit(change: SchedulerChange): void {
    this.lastChange = `EDIT ${change.event.subject} (host opens its form)`;
  }
  onDelete(change: SchedulerChange): void {
    this.events = this.events.filter((e) => e.id !== change.event.id);
    this.lastChange = `deleted ${change.event.subject}`;
  }
  onCell(payload: { date: unknown; resourceId?: string | number }): void {
    const d = payload.date as Date;
    this.lastChange = `empty cell ${fmt(d)}${payload.resourceId ? ' · owner ' + payload.resourceId : ''}`;
  }
}

function fmt(d: Date): string {
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

/** YYYYMMDD EXDATE literal for a given date. */
function fmtExdate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function startOfThisWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d;
}
