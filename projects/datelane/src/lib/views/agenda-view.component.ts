// views/agenda-view.component.ts
// Renderer for the list engine (Agenda): a scrollable, day-grouped list of upcoming events.
// Each row is one day with its events; multi-day events appear under each day they cover.
// Controlled: emits eventActivate on click; never mutates. Tree-shakeable.

import {
  Component, Input, Output, EventEmitter, Inject, ElementRef,
  AfterViewInit, OnChanges, ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';
import { layoutList, ListLayout } from '../engine/list-layout';

@Component({
  selector: 'dl-agenda-view',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dl-ag" role="list">
      @if (!layout.days.length) {
        <div class="dl-empty" role="status">
          <p class="dl-empty__title">No events</p>
          <p class="dl-empty__hint">Nothing scheduled in the next {{ agendaDaysCount }} days.</p>
        </div>
      }
      @for (day of layout.days; track trackByTime(day.date)) {
        <div class="dl-ag__day" role="listitem" [class.dl-ag__day--today]="day.isToday"
             [class.dl-ag__day--weekend]="day.isWeekend">
          <div class="dl-ag__date">
            <span class="dl-ag__dow">{{ adapter.format(day.date, 'EEE') }}</span>
            <span class="dl-ag__dom">{{ adapter.getDate(day.date) }}</span>
            <span class="dl-ag__mon">{{ adapter.format(day.date, 'MMM') }}</span>
          </div>
          <div class="dl-ag__events">
            @if (!day.events.length) {
              <span class="dl-ag__none">—</span>
            }
            @for (ev of day.events; track ev.id) {
              <button type="button" class="dl-ag__event"
                [style.--dl-event-accent]="ev.color || null"
                [attr.aria-label]="ariaFor(ev)"
                (click)="eventActivate.emit(ev)">
                <span class="dl-ag__bar" aria-hidden="true"></span>
                <span class="dl-ag__time">{{ timeLabel(ev) }}</span>
                <span class="dl-ag__subject">{{ ev.subject }}</span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class AgendaViewComponent implements AfterViewInit, OnChanges {
  @Input() viewDate: unknown;
  @Input() events: ReadonlyArray<SchedulerEvent<unknown>> = [];
  @Input() agendaDaysCount = 7;
  @Input() hideEmptyAgendaDays = false;
  /** Auto-scroll the first event into view on load / data change. */
  @Input() autoScroll = true;

  @Output() eventActivate = new EventEmitter<SchedulerEvent<unknown>>();

  constructor(
    @Inject(SCHEDULER_DATE_ADAPTER) public adapter: DateAdapter,
    private host: ElementRef<HTMLElement>,
  ) {}

  private lastScrollKey = '';

  ngAfterViewInit(): void { this.maybeScroll(true); }
  ngOnChanges(): void { this.maybeScroll(false); }

  /** Scroll only on first render or when the start date changes — not on event churn. */
  private maybeScroll(init: boolean): void {
    if (!this.autoScroll) return;
    const base = this.viewDate ?? this.adapter.today();
    const key = `${this.adapter.toNative(base).getTime()}:${this.agendaDaysCount}`;
    if (!init && key === this.lastScrollKey) return;
    this.lastScrollKey = key;
    requestAnimationFrame(() => {
      const first = this.host.nativeElement.querySelector('.dl-ag__event');
      first?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  get layout(): ListLayout {
    return layoutList(this.viewDate ?? this.adapter.today(), this.events, this.adapter, {
      dayCount: this.agendaDaysCount,
      hideEmptyDays: this.hideEmptyAgendaDays,
    });
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
