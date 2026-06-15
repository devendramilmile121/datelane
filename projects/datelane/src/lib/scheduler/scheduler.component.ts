// scheduler/scheduler.component.ts — root component shell (standalone).
// Routes the active view onto one of the four renderers (vertical-time, month/calendar, list,
// year, timeline) and owns the default quick-view popover. The component is CONTROLLED: it never
// mutates event data. Activating an event always emits (eventClick); unless suppressed/overridden
// it also opens the built-in quick-view, whose Edit/Delete forward to the host as outputs so the
// host can drive its OWN form. See scheduler-plan.md §§2,7.

import {
  Component, input, output, model, inject, contentChild, computed,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import {
  ViewDescriptor, SchedulerViewType, FieldMap, ResourceDefinition,
  GroupingConfig, SchedulerChange, NavigateEvent, SchedulerEvent,
} from '../core/models';
import { VerticalTimeViewComponent } from '../views/vertical-time-view.component';
import { MonthViewComponent } from '../views/month-view.component';
import { AgendaViewComponent } from '../views/agenda-view.component';
import { YearViewComponent } from '../views/year-view.component';
import { MonthAgendaViewComponent } from '../views/month-agenda-view.component';
import { TimelineViewComponent } from '../views/timeline-view.component';
import { QuickViewComponent } from '../editor/quick-view.component';
import { QuickViewTemplateDirective } from '../templates/scheduler-templates';
import { normalizeEvents } from '../engine/normalize-events';
import { parseHour } from '../engine/vertical-time-layout';
import { buildTimelineRows } from '../resources/timeline-rows';
import { SCHEDULER_MESSAGES } from '../i18n/messages';

const VERTICAL_VIEWS: SchedulerViewType[] = ['day', 'week', 'workWeek'];
const TIMELINE_VIEWS: SchedulerViewType[] = [
  'timelineDay', 'timelineWeek', 'timelineWorkWeek', 'timelineMonth', 'timelineYear',
];
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

/** Default human labels for the view-switcher (overridable per view via `displayName`). */
const VIEW_LABELS: Record<SchedulerViewType, string> = {
  day: 'Day', week: 'Week', workWeek: 'Work Week', month: 'Month', year: 'Year',
  agenda: 'Agenda', monthAgenda: 'Month Agenda',
  timelineDay: 'Timeline Day', timelineWeek: 'Timeline Week',
  timelineWorkWeek: 'Timeline Work Week', timelineMonth: 'Timeline Month',
  timelineYear: 'Timeline Year',
};

/** Views whose prev/next step is a whole week (7 days). */
const WEEK_STEP_VIEWS: SchedulerViewType[] = ['week', 'workWeek', 'timelineWeek', 'timelineWorkWeek'];

@Component({
  selector: 'dl-scheduler',
  standalone: true,
  imports: [
    VerticalTimeViewComponent, MonthViewComponent, AgendaViewComponent,
    YearViewComponent, MonthAgendaViewComponent, TimelineViewComponent, QuickViewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None, // styles are token-scoped under .dl-scheduler
  host: {
    class: 'dl-scheduler',
    '[attr.dir]': 'dir()',
    '[style.block-size]': 'height()',
    '[style.inline-size]': 'width()',
    '(pointerdown)': 'onPointerDown($event)',
  },
  templateUrl: './scheduler.component.html',
})
export class SchedulerComponent {
  /** Active view (two-way: activeViewChange). */
  readonly activeView = model<SchedulerViewType>('week');

  /** Navigated/selected date (two-way: viewDateChange). Adapter date type. */
  readonly viewDate = model<unknown>();

  readonly events = input<ReadonlyArray<Record<string, unknown>>>([]);
  readonly fieldMap = input<FieldMap>();
  readonly views = input<ViewDescriptor[]>([]);
  readonly resources = input<ResourceDefinition[]>([]);
  readonly grouping = input<GroupingConfig>();

  readonly readonly = input(false);
  readonly rowAutoHeight = input(false);
  readonly agendaDaysCount = input(7);
  readonly hideEmptyAgendaDays = input(false);
  /** Show the built-in quick-view popover on event activation. */
  readonly showQuickView = input(true);
  /** Auto-scroll scrolling views (Day/Week/WorkWeek, Timeline, Agenda, Year) to the first event. */
  readonly autoScroll = input(true);
  /** Time-grid views: scroll to this hour instead of the first event (e.g. 8 for 8 AM). */
  readonly scrollHour = input<number>();
  readonly height = input('600px');
  readonly width = input('100%');
  readonly dir = input<'ltr' | 'rtl'>('ltr');

  readonly eventCreate = output<SchedulerChange>();
  readonly eventChange = output<SchedulerChange>();
  readonly eventDelete = output<SchedulerChange>();
  /** Host should open its own edit form for this event. */
  readonly eventEdit = output<SchedulerChange>();
  readonly navigate = output<NavigateEvent>();
  readonly viewChange = output<SchedulerViewType>();
  readonly cellClick = output<{ date: unknown; resourceId?: string | number }>();
  readonly eventClick = output<SchedulerChange>();

  readonly quickViewTpl = contentChild(QuickViewTemplateDirective);

  /** Quick-view popover state. */
  quickEvent: SchedulerEvent<unknown> | null = null;
  quickX = 0;
  quickY = 0;
  private lastX = 0;
  private lastY = 0;

  protected readonly adapter = inject<DateAdapter>(SCHEDULER_DATE_ADAPTER);
  protected readonly msgs = inject(SCHEDULER_MESSAGES);

  /** Track the pointer so the quick-view can anchor at the click point. */
  onPointerDown(ev: PointerEvent): void {
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;
  }

  get rangeLabel(): string {
    const view = this.activeView();
    const d = this.viewDate() ?? this.adapter.today();
    const pattern = view === 'month' || view === 'monthAgenda' || view === 'timelineMonth'
      ? 'MMMM yyyy'
      : view === 'year' || view === 'timelineYear'
        ? 'yyyy'
        : 'dd-MMM-yyyy';
    return this.adapter.format(d, pattern);
  }

  get isVerticalView(): boolean { return VERTICAL_VIEWS.includes(this.activeView()); }
  get isTimelineView(): boolean { return TIMELINE_VIEWS.includes(this.activeView()); }

  // ---- Header navigation (prev / next / today / view switch) ----------------

  /** Configured views as `{ type, label }` for the switcher (empty → no switcher). */
  get switcherViews(): Array<{ type: SchedulerViewType; label: string }> {
    return this.views().map((v) => ({ type: v.type, label: v.displayName ?? VIEW_LABELS[v.type] }));
  }

  /** Step the visible period one unit back. Unit depends on the active view. */
  prev(): void { this.shiftPeriod(-1, 'prev'); }
  /** Step the visible period one unit forward. */
  next(): void { this.shiftPeriod(1, 'next'); }

  /** Jump the view back to the current date, keeping the active view. */
  today(): void {
    const date = this.adapter.today();
    this.viewDate.set(date);
    this.navigate.emit({ date, view: this.activeView(), action: 'today' });
  }

  /** Switch the active view (no-op if already active). */
  setActiveView(view: SchedulerViewType): void {
    if (view === this.activeView()) return;
    this.activeView.set(view);
    this.viewChange.emit(view);
  }

  /** Advance `viewDate` by `dir` periods, sized to the active view, and announce it. */
  private shiftPeriod(dir: 1 | -1, action: 'prev' | 'next'): void {
    const base = this.viewDate() ?? this.adapter.today();
    const date = this.stepDate(base, dir);
    this.viewDate.set(date);
    this.navigate.emit({ date, view: this.activeView(), action });
  }

  /** One navigation step for the active view: day(s), week, month, year, or agenda range. */
  private stepDate(date: unknown, dir: number): unknown {
    const view = this.activeView();
    const interval = Math.max(1, this.activeDescriptor?.interval ?? 1);
    if (WEEK_STEP_VIEWS.includes(view)) return this.adapter.addDays(date, dir * 7);
    if (view === 'month' || view === 'monthAgenda') return this.adapter.addMonths(date, dir);
    if (view === 'timelineMonth') return this.adapter.addMonths(date, dir * interval);
    if (view === 'year' || view === 'timelineYear') return this.adapter.addYears(date, dir);
    if (view === 'agenda') return this.adapter.addDays(date, dir * this.agendaDaysCount());
    // day, timelineDay (and any fallback): step by the configured day interval.
    return this.adapter.addDays(date, dir * interval);
  }

  get monthFirstDayOfWeek(): number { return this.activeDescriptor?.firstDayOfWeek ?? 0; }
  get monthShowWeekend(): boolean { return this.activeDescriptor?.showWeekend ?? true; }

  /** Descriptor for the active view, if the consumer configured one. */
  get activeDescriptor(): ViewDescriptor | undefined {
    return this.views().find((v) => v.type === this.activeView());
  }

  get startHour(): number { return parseHour(this.activeDescriptor?.startHour, 7); }
  get endHour(): number { return parseHour(this.activeDescriptor?.endHour, 21); }
  get timelineSlotCount(): number { return this.activeDescriptor?.timeScale?.slotCount ?? 1; }

  // The next three are memoized with computed() so their array/object references stay stable
  // across change detection. Plain getters returned a fresh array every CD, which made every
  // OnPush child re-run its layout each tick and (worse) re-triggered the views' auto-scroll
  // effects on every CD — fighting the user's manual scroll. The getters are kept as the public
  // surface (templates/tests are unchanged); they just delegate to the memo.

  private readonly _timelineRows = computed(() => buildTimelineRows(this.resources(), this.grouping()));
  /** Timeline resource rows + gutter title (empty → single default row). */
  get timelineRows() { return this._timelineRows().rows; }
  get timelineTitle() { return this._timelineRows().title; }

  /** Visible day dates for the active vertical view, in display order. */
  private readonly _visibleDays = computed<unknown[]>(() => {
    const base = this.viewDate() ?? this.adapter.today();
    const fdow = this.activeDescriptor?.firstDayOfWeek ?? 0;
    if (this.activeView() === 'day') return [base];

    const weekStart = this.adapter.startOfWeek(base, fdow);
    const week = Array.from({ length: 7 }, (_, i) => this.adapter.addDays(weekStart, i));
    if (this.activeView() === 'workWeek') {
      const workDays = this.activeDescriptor?.workDays ?? DEFAULT_WORK_DAYS;
      return week.filter((d) => workDays.includes(this.adapter.getDayOfWeek(d)));
    }
    return week;
  });
  get visibleDays(): unknown[] { return this._visibleDays(); }

  /** Raw records → canonical events via the FieldMap (empty until a FieldMap is supplied). */
  private readonly _normalizedEvents = computed<SchedulerEvent<unknown>[]>(() => {
    const fieldMap = this.fieldMap();
    if (!fieldMap) return [];
    return normalizeEvents(this.events(), fieldMap, this.adapter);
  });
  get normalizedEvents(): SchedulerEvent<unknown>[] { return this._normalizedEvents(); }

  // ---- View → shell event handlers -----------------------------------------

  onViewEventChange(updated: SchedulerEvent<unknown>): void {
    this.eventChange.emit({ event: updated });
  }

  /** Month/Year/MonthAgenda day-cell click → drill into the Day view. */
  onDayNavigate(date: unknown): void {
    this.viewDate.set(date);
    this.activeView.set('day');
    this.navigate.emit({ date, view: 'day', action: 'date' });
    this.viewChange.emit('day');
  }

  /** Any event activation: always emit eventClick; open quick-view unless suppressed. */
  onEventActivate(ev: SchedulerEvent<unknown>): void {
    this.eventClick.emit({ event: ev });
    if (this.showQuickView()) {
      this.quickEvent = ev;
      this.quickX = this.lastX;
      this.quickY = this.lastY;
    }
  }

  onCellActivate(payload: { date: unknown; resourceId?: string | number }): void {
    this.cellClick.emit(payload);
  }

  // ---- Quick-view actions (forwarded to host) ------------------------------

  closeQuickView(): void { this.quickEvent = null; }
  onQuickEdit(): void {
    if (this.quickEvent) this.eventEdit.emit({ event: this.quickEvent });
    this.closeQuickView();
  }
  onQuickDelete(): void {
    if (this.quickEvent) this.eventDelete.emit({ event: this.quickEvent });
    this.closeQuickView();
  }
}
