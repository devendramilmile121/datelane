// scheduler/scheduler.component.ts — root component shell (standalone).
// Routes the active view onto one of the four renderers (vertical-time, month/calendar, list,
// year, timeline) and owns the default quick-view popover. The component is CONTROLLED: it never
// mutates event data. Activating an event always emits (eventClick); unless suppressed/overridden
// it also opens the built-in quick-view, whose Edit/Delete forward to the host as outputs so the
// host can drive its OWN form. See scheduler-plan.md §§2,7.

import {
  Component, Input, Output, EventEmitter, Inject, ContentChild, HostListener,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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

const VERTICAL_VIEWS: SchedulerViewType[] = ['day', 'week', 'workWeek'];
const TIMELINE_VIEWS: SchedulerViewType[] = [
  'timelineDay', 'timelineWeek', 'timelineWorkWeek', 'timelineMonth', 'timelineYear',
];
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

@Component({
  selector: 'dl-scheduler',
  standalone: true,
  imports: [
    CommonModule, VerticalTimeViewComponent, MonthViewComponent, AgendaViewComponent,
    YearViewComponent, MonthAgendaViewComponent, TimelineViewComponent, QuickViewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None, // styles are token-scoped under .dl-scheduler
  host: {
    class: 'dl-scheduler',
    '[attr.dir]': 'dir',
    '[style.block-size]': 'height',
    '[style.inline-size]': 'width',
  },
  template: `
    <div class="dl-header" role="toolbar" aria-label="Scheduler navigation">
      <span class="dl-header__title">{{ rangeLabel }}</span>
      <span class="dl-header__view">{{ activeView }}</span>
      <ng-content select="[ngsHeader]"></ng-content>
    </div>
    <div class="dl-viewport" role="region" [attr.aria-label]="activeView + ' view'">
      @if (isVerticalView) {
        <dl-vertical-time-view
          [days]="visibleDays"
          [events]="normalizedEvents"
          [startHour]="startHour"
          [endHour]="endHour"
          [draggable]="!readonly"
          [resizable]="!readonly"
          [autoScroll]="autoScroll"
          [scrollHour]="scrollHour"
          (eventChange)="onViewEventChange($event)"
          (eventActivate)="onEventActivate($event)">
        </dl-vertical-time-view>
      } @else if (activeView === 'month') {
        <dl-month-view
          [viewDate]="viewDate"
          [events]="normalizedEvents"
          [firstDayOfWeek]="monthFirstDayOfWeek"
          [showWeekend]="monthShowWeekend"
          [draggable]="!readonly"
          [resizable]="!readonly"
          (dayNavigate)="onDayNavigate($event)"
          (eventActivate)="onEventActivate($event)"
          (eventChange)="onViewEventChange($event)">
        </dl-month-view>
      } @else if (activeView === 'year') {
        <dl-year-view
          [viewDate]="viewDate"
          [events]="normalizedEvents"
          [firstDayOfWeek]="monthFirstDayOfWeek"
          [orientation]="activeDescriptor?.orientation || 'horizontal'"
          [autoScroll]="autoScroll"
          (dayNavigate)="onDayNavigate($event)">
        </dl-year-view>
      } @else if (activeView === 'agenda') {
        <dl-agenda-view
          [viewDate]="viewDate"
          [events]="normalizedEvents"
          [agendaDaysCount]="agendaDaysCount"
          [hideEmptyAgendaDays]="hideEmptyAgendaDays"
          [autoScroll]="autoScroll"
          (eventActivate)="onEventActivate($event)">
        </dl-agenda-view>
      } @else if (activeView === 'monthAgenda') {
        <dl-month-agenda-view
          [viewDate]="viewDate"
          [events]="normalizedEvents"
          [firstDayOfWeek]="monthFirstDayOfWeek"
          (dayNavigate)="onDayNavigate($event)"
          (eventActivate)="onEventActivate($event)">
        </dl-month-agenda-view>
      } @else if (isTimelineView) {
        <dl-timeline-view
          [viewType]="activeView"
          [viewDate]="viewDate"
          [events]="normalizedEvents"
          [rows]="timelineRows"
          [resourceTitle]="timelineTitle"
          [firstDayOfWeek]="monthFirstDayOfWeek"
          [workDays]="activeDescriptor?.workDays"
          [startHour]="startHour"
          [endHour]="endHour"
          [slotCount]="timelineSlotCount"
          [interval]="activeDescriptor?.interval || 1"
          [maxLanes]="rowAutoHeight ? 0 : 3"
          [autoScroll]="autoScroll"
          (eventActivate)="onEventActivate($event)"
          (cellActivate)="onCellActivate($event)">
        </dl-timeline-view>
      } @else {
        <div class="dl-empty" role="status">
          <p class="dl-empty__title">No renderer for “{{ activeView }}” yet</p>
        </div>
      }
    </div>

    @if (quickEvent) {
      <dl-quick-view
        [event]="quickEvent"
        [x]="quickX"
        [y]="quickY"
        [readonly]="readonly"
        [template]="quickViewTpl?.template || null"
        (dismiss)="closeQuickView()"
        (edit)="onQuickEdit()"
        (delete)="onQuickDelete()">
      </dl-quick-view>
    }
  `,
})
export class SchedulerComponent {
  /** Active view (two-way: activeViewChange). */
  @Input() activeView: SchedulerViewType = 'week';
  @Output() activeViewChange = new EventEmitter<SchedulerViewType>();

  /** Navigated/selected date (two-way: viewDateChange). Adapter date type. */
  @Input() viewDate: unknown;
  @Output() viewDateChange = new EventEmitter<unknown>();

  @Input() events: ReadonlyArray<Record<string, unknown>> = [];
  @Input() fieldMap?: FieldMap;
  @Input() views: ViewDescriptor[] = [];
  @Input() resources: ResourceDefinition[] = [];
  @Input() grouping?: GroupingConfig;

  @Input() readonly = false;
  @Input() rowAutoHeight = false;
  @Input() agendaDaysCount = 7;
  @Input() hideEmptyAgendaDays = false;
  /** Show the built-in quick-view popover on event activation. */
  @Input() showQuickView = true;
  /** Auto-scroll scrolling views (Day/Week/WorkWeek, Timeline, Agenda, Year) to the first event. */
  @Input() autoScroll = true;
  /** Time-grid views: scroll to this hour instead of the first event (e.g. 8 for 8 AM). */
  @Input() scrollHour?: number;
  @Input() height = '600px';
  @Input() width = '100%';
  @Input() dir: 'ltr' | 'rtl' = 'ltr';

  @Output() eventCreate = new EventEmitter<SchedulerChange>();
  @Output() eventChange = new EventEmitter<SchedulerChange>();
  @Output() eventDelete = new EventEmitter<SchedulerChange>();
  /** Host should open its own edit form for this event. */
  @Output() eventEdit = new EventEmitter<SchedulerChange>();
  @Output() navigate = new EventEmitter<NavigateEvent>();
  @Output() viewChange = new EventEmitter<SchedulerViewType>();
  @Output() cellClick = new EventEmitter<{ date: unknown; resourceId?: string | number }>();
  @Output() eventClick = new EventEmitter<SchedulerChange>();

  @ContentChild(QuickViewTemplateDirective) quickViewTpl?: QuickViewTemplateDirective;

  /** Quick-view popover state. */
  quickEvent: SchedulerEvent<unknown> | null = null;
  quickX = 0;
  quickY = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(@Inject(SCHEDULER_DATE_ADAPTER) protected adapter: DateAdapter) {
    if (!this.viewDate) this.viewDate = this.adapter.today();
  }

  /** Track the pointer so the quick-view can anchor at the click point. */
  @HostListener('pointerdown', ['$event'])
  onPointerDown(ev: PointerEvent): void {
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;
  }

  get rangeLabel(): string {
    const d = this.viewDate ?? this.adapter.today();
    const pattern = this.activeView === 'month' || this.activeView === 'monthAgenda'
        || this.activeView === 'timelineMonth'
      ? 'MMMM yyyy'
      : this.activeView === 'year' || this.activeView === 'timelineYear'
        ? 'yyyy'
        : 'dd-MMM-yyyy';
    return this.adapter.format(d, pattern);
  }

  get isVerticalView(): boolean { return VERTICAL_VIEWS.includes(this.activeView); }
  get isTimelineView(): boolean { return TIMELINE_VIEWS.includes(this.activeView); }

  get monthFirstDayOfWeek(): number { return this.activeDescriptor?.firstDayOfWeek ?? 0; }
  get monthShowWeekend(): boolean { return this.activeDescriptor?.showWeekend ?? true; }

  /** Descriptor for the active view, if the consumer configured one. */
  get activeDescriptor(): ViewDescriptor | undefined {
    return this.views.find((v) => v.type === this.activeView);
  }

  get startHour(): number { return parseHour(this.activeDescriptor?.startHour, 7); }
  get endHour(): number { return parseHour(this.activeDescriptor?.endHour, 21); }
  get timelineSlotCount(): number { return this.activeDescriptor?.timeScale?.slotCount ?? 1; }

  /** Timeline resource rows + gutter title (empty → single default row). */
  get timelineRows() { return buildTimelineRows(this.resources, this.grouping).rows; }
  get timelineTitle() { return buildTimelineRows(this.resources, this.grouping).title; }

  /** Visible day dates for the active vertical view, in display order. */
  get visibleDays(): unknown[] {
    const base = this.viewDate ?? this.adapter.today();
    const fdow = this.activeDescriptor?.firstDayOfWeek ?? 0;
    if (this.activeView === 'day') return [base];

    const weekStart = this.adapter.startOfWeek(base, fdow);
    const week = Array.from({ length: 7 }, (_, i) => this.adapter.addDays(weekStart, i));
    if (this.activeView === 'workWeek') {
      const workDays = this.activeDescriptor?.workDays ?? DEFAULT_WORK_DAYS;
      return week.filter((d) => workDays.includes(this.adapter.getDayOfWeek(d)));
    }
    return week;
  }

  /** Raw records → canonical events via the FieldMap (empty until a FieldMap is supplied). */
  get normalizedEvents(): SchedulerEvent<unknown>[] {
    if (!this.fieldMap) return [];
    return normalizeEvents(this.events, this.fieldMap, this.adapter);
  }

  // ---- View → shell event handlers -----------------------------------------

  onViewEventChange(updated: SchedulerEvent<unknown>): void {
    this.eventChange.emit({ event: updated });
  }

  /** Month/Year/MonthAgenda day-cell click → drill into the Day view. */
  onDayNavigate(date: unknown): void {
    this.viewDate = date;
    this.viewDateChange.emit(date);
    this.activeView = 'day';
    this.activeViewChange.emit('day');
    this.navigate.emit({ date, view: 'day', action: 'date' });
    this.viewChange.emit('day');
  }

  /** Any event activation: always emit eventClick; open quick-view unless suppressed. */
  onEventActivate(ev: SchedulerEvent<unknown>): void {
    this.eventClick.emit({ event: ev });
    if (this.showQuickView) {
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
