// views/timeline-view.component.ts
// Renderer for the horizontal-time engine — all five Timeline views (Day / Week / WorkWeek /
// Month / Year). A sticky resource gutter on the inline-start, a two-band header (major group
// over column labels), and a horizontally-scrolling body where events render as lane-packed
// bars. Resource rows come from the shell; with none, a single default row holds all events.
// Controlled: emits eventActivate / cellActivate; never mutates. Tree-shakeable.

import {
  Component, input, output, inject, effect, untracked, computed, viewChild, ElementRef,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SchedulerEvent, SchedulerViewType } from '../core/models';
import {
  layoutHorizontalTime, HorizontalTimeLayout, TimelineRowInput,
} from '../engine/horizontal-time-layout';
import { buildTimelineColumns, TimelineColumnOptions } from '../engine/timeline-columns';

const LANE_H = 24;     // px per lane (matches CSS var)
const ROW_PAD = 6;     // px vertical padding inside a row

@Component({
  selector: 'dl-timeline-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dl-tl" role="grid" [style.--dl-tl-cols]="layout().columns.length">
      <!-- Header: corner + two stacked bands (majors, then columns). -->
      <div class="dl-tl__head">
        <div class="dl-tl__corner" role="presentation">
          @if (showResourceGutter) { <span>{{ resourceTitle() }}</span> }
        </div>
        <div class="dl-tl__headcols">
          <div class="dl-tl__majors" role="row">
            @for (mg of majorGroups(); track mg.key) {
              <div class="dl-tl__major" [style.flex-grow]="mg.span" role="columnheader">{{ mg.label }}</div>
            }
          </div>
          <div class="dl-tl__cols" role="row">
            @for (col of layout().columns; track $index) {
              <div class="dl-tl__col"
                [class.dl-tl__col--today]="col.isToday"
                [class.dl-tl__col--weekend]="col.isWeekend"
                role="columnheader">{{ col.label }}</div>
            }
          </div>
        </div>
      </div>

      <!-- Body: resource gutter + scrolling rows. -->
      <div #scrollEl class="dl-tl__body">
        @if (showResourceGutter) {
          <div class="dl-tl__gutter">
            @for (row of layout().rows; track $index) {
              <div class="dl-tl__rhead" [style.block-size.px]="rowHeight(row)"
                [style.padding-inline-start.px]="(row.depth || 0) * 14 + 8">
                <span class="dl-tl__rdot" [style.background]="row.color || null" aria-hidden="true"></span>
                {{ row.label }}
              </div>
            }
          </div>
        }

        <div class="dl-tl__rows">
          @for (row of layout().rows; track $index; let ri = $index) {
            <div class="dl-tl__row" role="row" [style.block-size.px]="rowHeight(row)">
              <!-- gridline cells (also the click target for empty-slot create) -->
              @for (col of layout().columns; track $index; let ci = $index) {
                <div class="dl-tl__cell"
                  [class.dl-tl__cell--today]="col.isToday"
                  [class.dl-tl__cell--weekend]="col.isWeekend"
                  role="gridcell"
                  tabindex="0"
                  [attr.aria-label]="cellLabel(col, row)"
                  (click)="onCellClick(col, row)"
                  (keydown.enter)="onCellClick(col, row)"
                  (keydown.space)="onCellClick(col, row); $event.preventDefault()">
                  @if (row.moreCounts[ci]) {
                    <span class="dl-more dl-tl__more">+{{ row.moreCounts[ci] }}</span>
                  }
                </div>
              }
              <!-- positioned event bars -->
              @for (bar of row.bars; track bar.event.id) {
                <div class="dl-tl__bar"
                  [class.dl-tl__bar--before]="bar.continuesBefore"
                  [class.dl-tl__bar--after]="bar.continuesAfter"
                  role="button" tabindex="0"
                  [style.inset-inline-start.%]="bar.left"
                  [style.inline-size.%]="bar.width"
                  [style.top.px]="ROW_PAD + bar.lane * LANE_H"
                  [style.--dl-event-accent]="bar.event.color || row.color || null"
                  [attr.aria-label]="ariaFor(bar.event)"
                  (click)="eventActivate.emit(bar.event)">
                  <span class="dl-tl__bartext">{{ bar.event.subject }}</span>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class TimelineViewComponent {
  readonly viewType = input<SchedulerViewType>('timelineWeek');
  readonly viewDate = input<unknown>();
  readonly events = input<ReadonlyArray<SchedulerEvent<unknown>>>([]);
  /** Resource rows from the shell; empty → a single default row holds all events. */
  readonly rows = input<TimelineRowInput[]>([]);
  readonly resourceTitle = input('');
  readonly firstDayOfWeek = input(0);
  readonly workDays = input<number[]>();
  readonly startHour = input(0);
  readonly endHour = input(24);
  readonly slotCount = input(1);
  readonly interval = input(1);
  /** Max lanes per row before "+N more"; 0 = auto-grow row height (rowAutoHeight). */
  readonly maxLanes = input(0);
  /** Auto-scroll horizontally to the first event on load / period change. */
  readonly autoScroll = input(true);

  readonly eventActivate = output<SchedulerEvent<unknown>>();
  readonly cellActivate = output<{ date: unknown; resourceId?: string | number }>();

  protected readonly LANE_H = LANE_H;
  protected readonly ROW_PAD = ROW_PAD;

  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');

  protected readonly adapter = inject<DateAdapter>(SCHEDULER_DATE_ADAPTER);

  constructor() {
    // Auto-scroll only on first render or when the period/view changes — not on event churn.
    effect(() => {
      if (!this.autoScroll()) return;
      this.viewType();                           // track period signals
      this.viewDate();
      const el = this.scrollEl()?.nativeElement; // track the view query
      if (!el) return;
      untracked(() => this.scrollToFirst(el));
    });
  }

  /** Scroll the body horizontally so the earliest event bar is near the inline-start. */
  private scrollToFirst(el: HTMLElement): void {
    const lefts = this.layout().rows.flatMap((r) => r.bars.map((b) => b.left));
    if (!lefts.length) return;
    const minLeft = Math.min(...lefts);
    requestAnimationFrame(() => {
      // bars are positioned over the rows track (full scrollWidth minus the sticky gutter).
      const gutter = this.showResourceGutter ? this.gutterWidth(el) : 0;
      const track = el.scrollWidth - gutter;
      const target = (minLeft / 100) * track - this.colWidthPx(el);
      el.scrollTo({ left: Math.max(0, target) });
    });
  }

  private gutterWidth(body: HTMLElement): number {
    const g = body.querySelector('.dl-tl__gutter') as HTMLElement | null;
    return g?.offsetWidth ?? 0;
  }
  private colWidthPx(body: HTMLElement): number {
    const c = body.querySelector('.dl-tl__cell') as HTMLElement | null;
    return c?.offsetWidth ?? 64;
  }

  get showResourceGutter(): boolean {
    return this.rows().length > 0;
  }

  private get columnOpts(): TimelineColumnOptions {
    return {
      firstDayOfWeek: this.firstDayOfWeek(),
      workDays: this.workDays(),
      startHour: this.startHour(),
      endHour: this.endHour(),
      slotCount: this.slotCount(),
      interval: this.interval(),
    };
  }

  readonly layout = computed<HorizontalTimeLayout>(() => {
    const columns = buildTimelineColumns(
      this.viewType(), this.viewDate() ?? this.adapter.today(), this.adapter, this.columnOpts,
    );
    return layoutHorizontalTime(columns, this.rows(), this.events(), this.adapter, {
      maxLanes: this.maxLanes(),
    });
  });

  /** Contiguous runs of equal `major` for the upper header band. */
  readonly majorGroups = computed<Array<{ key: string; label: string; span: number }>>(() => {
    const groups: Array<{ key: string; label: string; span: number }> = [];
    this.layout().columns.forEach((c, i) => {
      const key = c.major ?? '';
      const last = groups[groups.length - 1];
      if (last && last.label === key) last.span++;
      else groups.push({ key: key + ':' + i, label: key, span: 1 });
    });
    return groups;
  });

  rowHeight(row: { laneCount: number }): number {
    return ROW_PAD * 2 + Math.max(1, row.laneCount) * LANE_H;
  }
  ariaFor(e: SchedulerEvent<unknown>): string {
    const t = e.isAllDay ? 'all day' : this.adapter.format(e.start, 'hm');
    return `${e.subject}, ${t}`;
  }
  onCellClick(col: { start: unknown }, row: TimelineRowInput): void {
    this.cellActivate.emit({ date: col.start, resourceId: row.resourceId });
  }
  cellLabel(col: { start: unknown }, row: TimelineRowInput): string {
    const when = this.adapter.format(col.start, 'EEE, MMM d');
    return row.label ? `${when}, ${row.label}` : when;
  }
}
