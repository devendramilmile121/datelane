// scheduler/scheduler.component.ts — root component shell (standalone). Skeleton public API surface.
// Full rendering wires in the engines incrementally (see plan §9, phases 2–4).

import {
  Component, Input, Output, EventEmitter, Inject, ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import {
  ViewDescriptor, SchedulerViewType, FieldMap, ResourceDefinition,
  GroupingConfig, SchedulerChange, NavigateEvent, SchedulerEvent,
} from '../core/models';
import { VerticalTimeViewComponent } from '../views/vertical-time-view.component';
import { MonthViewComponent } from '../views/month-view.component';
import { normalizeEvents } from '../engine/normalize-events';
import { parseHour } from '../engine/vertical-time-layout';

const VERTICAL_VIEWS: SchedulerViewType[] = ['day', 'week', 'workWeek'];
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

@Component({
  selector: 'dl-scheduler',
  standalone: true,
  imports: [CommonModule, VerticalTimeViewComponent, MonthViewComponent],
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
      <!-- prev/today/next, date-range label (opens calendar popup), view switcher -->
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
          (eventChange)="onViewEventChange($event)">
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
      } @else {
        <div class="dl-empty" role="status">
          <p class="dl-empty__title">No renderer for “{{ activeView }}” yet</p>
          <p class="dl-empty__hint">Day / Week / Work Week / Month are implemented. Other engines land in later phases.</p>
        </div>
      }
    </div>
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
  @Input() height = '600px';
  @Input() width = '100%';
  @Input() dir: 'ltr' | 'rtl' = 'ltr';

  @Output() eventCreate = new EventEmitter<SchedulerChange>();
  @Output() eventChange = new EventEmitter<SchedulerChange>();
  @Output() eventDelete = new EventEmitter<SchedulerChange>();
  @Output() navigate = new EventEmitter<NavigateEvent>();
  @Output() viewChange = new EventEmitter<SchedulerViewType>();
  @Output() cellClick = new EventEmitter<{ date: unknown; resourceId?: string | number }>();
  @Output() eventClick = new EventEmitter<SchedulerChange>();

  constructor(@Inject(SCHEDULER_DATE_ADAPTER) protected adapter: DateAdapter) {
    if (!this.viewDate) this.viewDate = this.adapter.today();
  }

  /** Default header date label (shell placeholder until the nav bar lands). */
  get rangeLabel(): string {
    const d = this.viewDate ?? this.adapter.today();
    const pattern = this.activeView === 'month' || this.activeView === 'monthAgenda'
      ? 'MMMM yyyy'
      : 'dd-MMM-yyyy';
    return this.adapter.format(d, pattern);
  }

  get isVerticalView(): boolean {
    return VERTICAL_VIEWS.includes(this.activeView);
  }

  get monthFirstDayOfWeek(): number {
    return this.activeDescriptor?.firstDayOfWeek ?? 0;
  }
  get monthShowWeekend(): boolean {
    return this.activeDescriptor?.showWeekend ?? true;
  }

  /** Descriptor for the active view, if the consumer configured one. */
  private get activeDescriptor(): ViewDescriptor | undefined {
    return this.views.find((v) => v.type === this.activeView);
  }

  get startHour(): number {
    return parseHour(this.activeDescriptor?.startHour, 7);
  }
  get endHour(): number {
    return parseHour(this.activeDescriptor?.endHour, 21);
  }

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

  /** Forward a drag-drop result to the public output. Host owns the data update. */
  onViewEventChange(updated: SchedulerEvent<unknown>): void {
    this.eventChange.emit({ event: updated });
  }

  /** Month day-cell click → drill into the Day view for that date (plan §2.4). */
  onDayNavigate(date: unknown): void {
    this.viewDate = date;
    this.viewDateChange.emit(date);
    this.activeView = 'day';
    this.activeViewChange.emit('day');
    this.navigate.emit({ date, view: 'day', action: 'date' });
    this.viewChange.emit('day');
  }

  onEventActivate(ev: SchedulerEvent<unknown>): void {
    this.eventClick.emit({ event: ev });
  }
}
