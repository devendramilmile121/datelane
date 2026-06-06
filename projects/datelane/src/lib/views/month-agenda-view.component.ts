// views/month-agenda-view.component.ts
// Renderer for Month Agenda: a single mini month-calendar with event dots, plus a list of
// the selected day's events beneath/beside it. Selecting a day updates the list and emits
// daySelect; the day number drill-through emits dayNavigate. Controlled. Tree-shakeable.

import {
  Component, Input, Output, EventEmitter, Inject, OnChanges,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';
import { countEventsOn } from '../engine/year-layout';
import { layoutList } from '../engine/list-layout';

interface MiniDay { date: unknown; inMonth: boolean; isToday: boolean; isWeekend: boolean; count: number; }

@Component({
  selector: 'dl-month-agenda-view',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dl-ma">
      <div class="dl-ma__cal" role="grid">
        <div class="dl-ma__dow" role="row">
          @for (i of weekdayCols; track i) {
            <span class="dl-ma__dowcell" role="columnheader">{{ weekdayLabel(i) }}</span>
          }
        </div>
        @for (week of weeks; track $index) {
          <div class="dl-ma__week" role="row">
            @for (day of week; track trackByTime(day.date)) {
              <button type="button" class="dl-ma__day" role="gridcell"
                [class.dl-ma__day--out]="!day.inMonth"
                [class.dl-ma__day--today]="day.isToday"
                [class.dl-ma__day--weekend]="day.isWeekend"
                [class.dl-ma__day--sel]="isSelected(day.date)"
                [attr.aria-pressed]="isSelected(day.date)"
                [attr.aria-label]="dayLabel(day.date, day.count)"
                (click)="select(day.date)"
                (dblclick)="dayNavigate.emit(day.date)">
                <span class="dl-ma__dnum">{{ adapter.getDate(day.date) }}</span>
                @if (day.count > 0) { <span class="dl-ma__dot" aria-hidden="true"></span> }
              </button>
            }
          </div>
        }
      </div>

      <div class="dl-ma__list" role="list" [attr.aria-label]="selectedLabel">
        <header class="dl-ma__lhead">{{ selectedLabel }}</header>
        @if (!selectedEvents.length) {
          <p class="dl-ma__none">No events</p>
        }
        @for (ev of selectedEvents; track ev.id) {
          <button type="button" class="dl-ma__event" role="listitem"
            [style.--dl-event-accent]="ev.color || null"
            [attr.aria-label]="ariaFor(ev)"
            (click)="eventActivate.emit(ev)">
            <span class="dl-ma__bar" aria-hidden="true"></span>
            <span class="dl-ma__time">{{ timeLabel(ev) }}</span>
            <span class="dl-ma__subject">{{ ev.subject }}</span>
          </button>
        }
      </div>
    </div>
  `,
})
export class MonthAgendaViewComponent implements OnChanges {
  @Input() viewDate: unknown;
  @Input() events: ReadonlyArray<SchedulerEvent<unknown>> = [];
  @Input() firstDayOfWeek = 0;

  @Output() dayNavigate = new EventEmitter<unknown>();
  @Output() daySelect = new EventEmitter<unknown>();
  @Output() eventActivate = new EventEmitter<SchedulerEvent<unknown>>();

  private selected: unknown;

  constructor(@Inject(SCHEDULER_DATE_ADAPTER) public adapter: DateAdapter) {}

  ngOnChanges(): void {
    // Keep selection within the visible month; default to viewDate (or today).
    const base = this.viewDate ?? this.adapter.today();
    if (!this.selected || this.adapter.getMonth(this.selected) !== this.adapter.getMonth(base)) {
      this.selected = this.adapter.startOfDay(base);
    }
  }

  get weeks(): MiniDay[][] {
    const base = this.viewDate ?? this.adapter.today();
    const month = this.adapter.getMonth(base);
    const today = this.adapter.today();
    const monthStart = this.adapter.startOfMonth(base);
    let weekStart = this.adapter.startOfWeek(monthStart, this.firstDayOfWeek);
    const out: MiniDay[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: MiniDay[] = [];
      for (let i = 0; i < 7; i++) {
        const date = this.adapter.addDays(weekStart, i);
        const dow = this.adapter.getDayOfWeek(date);
        row.push({
          date,
          inMonth: this.adapter.getMonth(date) === month,
          isToday: this.adapter.isSameDay(date, today),
          isWeekend: dow === 0 || dow === 6,
          count: countEventsOn(date, this.events, this.adapter),
        });
      }
      out.push(row);
      weekStart = this.adapter.addDays(weekStart, 7);
    }
    return out;
  }

  get selectedEvents(): SchedulerEvent<unknown>[] {
    const day = this.selected ?? this.adapter.today();
    return layoutList(day, this.events, this.adapter, { dayCount: 1 }).days[0]?.events ?? [];
  }
  get selectedLabel(): string {
    return this.adapter.format(this.selected ?? this.adapter.today(), 'EEEE, dd MMMM yyyy');
  }

  get weekdayCols(): number[] { return [0, 1, 2, 3, 4, 5, 6]; }
  weekdayLabel(i: number): string {
    return this.adapter.getDayNames('narrow')[(this.firstDayOfWeek + i) % 7];
  }
  isSelected(d: unknown): boolean {
    return !!this.selected && this.adapter.isSameDay(d, this.selected);
  }
  select(d: unknown): void {
    this.selected = this.adapter.startOfDay(d);
    this.daySelect.emit(this.selected);
  }
  dayLabel(date: unknown, count: number): string {
    const base = this.adapter.format(date, 'dd-MMM-yyyy');
    return count ? `${base}, ${count} event${count === 1 ? '' : 's'}` : base;
  }
  timeLabel(ev: SchedulerEvent<unknown>): string {
    if (ev.isAllDay) return 'All day';
    return `${this.adapter.format(ev.start, 'hm')} – ${this.adapter.format(ev.end, 'hm')}`;
  }
  ariaFor(ev: SchedulerEvent<unknown>): string {
    return `${ev.subject}, ${this.timeLabel(ev)}`;
  }
  trackByTime(d: unknown): number {
    return this.adapter.toNative(d).getTime();
  }
}
