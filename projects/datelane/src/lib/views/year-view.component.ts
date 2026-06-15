// views/year-view.component.ts
// Renderer for the Year view: twelve mini month-calendars laid out in a responsive grid,
// horizontal or vertical orientation. Days carry event dots; clicking a day drills into it.
// Controlled: emits dayNavigate; never mutates. Tree-shakeable.

import {
  Component, input, output, inject, effect, untracked, computed, ElementRef,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';
import { layoutYear, YearLayout } from '../engine/year-layout';

@Component({
  selector: 'dl-year-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dl-yr" [class.dl-yr--vertical]="orientation() === 'vertical'" role="grid">
      @for (mo of layout().months; track mo.month) {
        <section class="dl-yr__month" role="group" [attr.aria-label]="monthName(mo.month)">
          <header class="dl-yr__mhead">{{ monthName(mo.month) }}</header>
          <div class="dl-yr__dow">
            @for (i of weekdayCols; track i) {
              <span class="dl-yr__dowcell">{{ weekdayLabel(i) }}</span>
            }
          </div>
          @for (week of mo.weeks; track $index) {
            <div class="dl-yr__week" role="row">
              @for (day of week; track trackByTime(day.date)) {
                <button type="button" class="dl-yr__day" role="gridcell"
                  [class.dl-yr__day--out]="!day.inMonth"
                  [class.dl-yr__day--today]="day.isToday"
                  [class.dl-yr__day--weekend]="day.isWeekend"
                  [class.dl-yr__day--has]="day.eventCount > 0"
                  [attr.aria-label]="dayLabel(day.date, day.eventCount)"
                  (click)="dayNavigate.emit(day.date)">
                  <span class="dl-yr__dnum">{{ adapter.getDate(day.date) }}</span>
                  @if (day.eventCount > 0) {
                    <span class="dl-yr__dot" aria-hidden="true"></span>
                  }
                </button>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class YearViewComponent {
  readonly viewDate = input<unknown>();
  readonly events = input<ReadonlyArray<SchedulerEvent<unknown>>>([]);
  readonly firstDayOfWeek = input(0);
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  /** Auto-scroll the first day that has events into view on load / period change. */
  readonly autoScroll = input(true);

  readonly dayNavigate = output<unknown>();

  protected readonly adapter = inject<DateAdapter>(SCHEDULER_DATE_ADAPTER);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Scroll only when the year changes (tracked) — not on event churn (untracked).
    effect(() => {
      if (!this.autoScroll()) return;
      this.viewDate(); // track: re-scroll on navigation
      untracked(() => {
        requestAnimationFrame(() => {
          const first = this.host.nativeElement.querySelector('.dl-yr__day--has');
          first?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
      });
    });
  }

  readonly layout = computed<YearLayout>(() =>
    layoutYear(this.viewDate() ?? this.adapter.today(), this.events(), this.adapter, {
      firstDayOfWeek: this.firstDayOfWeek(),
    }),
  );

  readonly weekdayCols: number[] = [0, 1, 2, 3, 4, 5, 6];
  weekdayLabel(i: number): string {
    return this.adapter.getDayNames('narrow')[(this.firstDayOfWeek() + i) % 7];
  }
  monthName(m: number): string {
    return this.adapter.getMonthNames('long')[m];
  }
  dayLabel(date: unknown, count: number): string {
    const base = this.adapter.format(date, 'dd-MMM-yyyy');
    return count ? `${base}, ${count} event${count === 1 ? '' : 's'}` : base;
  }
  trackByTime(d: unknown): number {
    return this.adapter.toNative(d).getTime();
  }
}
