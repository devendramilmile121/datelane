// views/month-view.component.ts
// Renderer for the calendar-grid engine (Month): week rows × day columns with multi-day
// spanning event bars (lanes), “+N more” popover, click-to-navigate, and day-granular
// drag-to-move + resize. During a gesture the layout LIVE-REFLOWS (a preview event is fed
// through layoutMonth), so multi-week moves/resizes preview correctly. Weekend columns can
// be hidden. Controlled: emits, never mutates. Tree-shakeable.

import {
  Component, input, output, inject, ChangeDetectorRef,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';
import { layoutMonth, MonthLayout, MonthSegment, MonthWeek, MonthDay } from '../engine/month-layout';
import {
  GestureMode, clamp, crossedDragThreshold, cellIndexFromOffset,
} from '../interaction/gesture';
import { SCHEDULER_MESSAGES } from '../i18n/messages';

const NUMBER_H = 26; // px reserved at cell top for the day number (matches CSS var)
const LANE_H = 20;   // px per lane (matches CSS var)

interface Gesture {
  mode: GestureMode;
  id: string | number;
  weekIndex: number;
  startCol: number;
  event: SchedulerEvent<unknown>;
  origStart: unknown;
  origEnd: unknown;
  origStartIndex: number;   // grid day index of event start
  origEndIndex: number;     // grid day index of event last-covered day
  anchorIndex: number;      // grabbed day index (for move)
  gridLeft: number;
  gridTop: number;
  cellW: number;
  rowH: number;
  rows: number;
  startX: number;
  startY: number;
  active: boolean;
  targetIndex: number;
  newStart: unknown;
  newEnd: unknown;
}

interface Popover {
  date: unknown;
  events: SchedulerEvent<unknown>[];
  x: number;
  y: number;
}

@Component({
  selector: 'dl-month-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '(document:click)': 'onDocClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
  templateUrl: './month-view.component.html',
})
export class MonthViewComponent {
  readonly viewDate = input<unknown>();
  readonly events = input<ReadonlyArray<SchedulerEvent<unknown>>>([]);
  readonly firstDayOfWeek = input(0);
  readonly showWeekend = input(true);
  readonly maxLanes = input(3);
  readonly draggable = input(true);
  readonly resizable = input(true);

  readonly dayNavigate = output<unknown>();
  readonly eventActivate = output<SchedulerEvent<unknown>>();
  /** Proposed move/resize result (clone with new start/end). Host applies it. */
  readonly eventChange = output<SchedulerEvent<unknown>>();

  gesture: Gesture | null = null;
  popover: Popover | null = null;
  /** True right after a drag so the trailing click doesn't also select the event. */
  private justDragged = false;

  protected readonly adapter = inject<DateAdapter>(SCHEDULER_DATE_ADAPTER);
  protected readonly msgs = inject(SCHEDULER_MESSAGES);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Visible week-column indexes (0–6 from firstDayOfWeek), weekends dropped when hidden. */
  get columns(): number[] {
    const all = [0, 1, 2, 3, 4, 5, 6];
    if (this.showWeekend()) return all;
    const fdow = this.firstDayOfWeek();
    return all.filter((i) => {
      const dow = (fdow + i) % 7;
      return dow !== 0 && dow !== 6;
    });
  }

  /** Equal grid tracks so bar percentages align exactly with day cells. */
  get gridCols(): string {
    return `repeat(${this.columns.length}, 1fr)`;
  }

  /** A week's day cells in the visible column order (weekends dropped when hidden). */
  visibleDays(week: MonthWeek): MonthDay[] {
    return this.columns.map((i) => week.days[i]);
  }

  /** Layout — live-reflows with the previewed event while a gesture is active. */
  get layout(): MonthLayout {
    const g = this.gesture;
    const source = this.events();
    const events = g?.active
      ? source.map((e) => (e.id === g.id ? { ...e, start: g.newStart, end: g.newEnd } : e))
      : source;
    return layoutMonth(this.viewDate() ?? this.adapter.today(), events, this.adapter, {
      firstDayOfWeek: this.firstDayOfWeek(),
      maxLanes: this.maxLanes(),
    });
  }

  weekdayLabel(i: number): string {
    return this.adapter.getDayNames('short')[(this.firstDayOfWeek() + i) % 7];
  }
  cellLabel(date: unknown): string {
    return this.adapter.format(date, 'dd-MMM-yyyy');
  }
  barLabel(ev: SchedulerEvent<unknown>): string {
    return ev.isAllDay ? `${ev.subject}, all day`
      : `${ev.subject}, ${this.adapter.format(ev.start, 'hm')}`;
  }
  popTime(ev: SchedulerEvent<unknown>): string {
    return ev.isAllDay ? 'all day' : this.adapter.format(ev.start, 'hm');
  }

  // ---- Bar geometry (rendered-column space, weekend-aware) ------------------

  isActive(seg: MonthSegment): boolean {
    return !!this.gesture?.active && this.gesture.id === seg.event.id;
  }
  barTop(seg: MonthSegment): number {
    return NUMBER_H + seg.lane * LANE_H;
  }
  /** Map a segment's week-column span onto the visible columns; null if fully hidden. */
  segGeom(seg: MonthSegment): { left: string; width: string } | null {
    const cols = this.columns;
    const last = seg.startCol + seg.span - 1;
    const positions = cols
      .map((wc, idx) => ({ wc, idx }))
      .filter((p) => p.wc >= seg.startCol && p.wc <= last)
      .map((p) => p.idx);
    if (!positions.length) return null;
    const left = positions[0];
    const width = positions[positions.length - 1] - left + 1;
    const n = cols.length;
    return {
      left: `calc(${(left / n) * 100}% + 2px)`,
      width: `calc(${(width / n) * 100}% - 4px)`,
    };
  }

  // ---- Pointer gesture (move + resize) -------------------------------------

  onGestureStart(
    ev: PointerEvent, mode: GestureMode, seg: MonthSegment, wi: number, gridEl: HTMLElement,
  ): void {
    if (ev.button !== 0) return;
    if (mode === 'move' && !this.draggable()) return;
    if (mode !== 'move' && !this.resizable()) return;
    ev.stopPropagation();
    this.justDragged = false;
    document.addEventListener('pointermove', this.onDocMove);
    document.addEventListener('pointerup', this.onDocUp);

    const rect = gridEl.getBoundingClientRect();
    const layout = this.layout;
    const rows = layout.weeks.length;
    const gridStart = layout.weeks[0].days[0].date;
    const e = seg.event;
    this.gesture = {
      mode,
      id: e.id,
      weekIndex: wi,
      startCol: seg.startCol,
      event: e,
      origStart: e.start,
      origEnd: e.end,
      origStartIndex: this.adapter.diffDays(gridStart, this.adapter.startOfDay(e.start)),
      origEndIndex: this.adapter.diffDays(gridStart, this.adapter.startOfDay(e.end)),
      anchorIndex: wi * 7 + seg.startCol,
      gridLeft: rect.left,
      gridTop: rect.top,
      cellW: rect.width / this.columns.length,
      rowH: rect.height / rows,
      rows,
      startX: ev.clientX,
      startY: ev.clientY,
      active: false,
      targetIndex: wi * 7 + seg.startCol,
      newStart: e.start,
      newEnd: e.end,
    };
  }

  onGestureMove(ev: PointerEvent): void {
    const g = this.gesture;
    if (!g) return;
    if (!g.active) {
      if (!crossedDragThreshold(ev.clientX - g.startX, ev.clientY - g.startY)) return;
      g.active = true;
    }
    // Pointer → visible column → actual week-column → grid day index.
    const renderedCol = cellIndexFromOffset(ev.clientX - g.gridLeft, g.cellW, this.columns.length);
    const weekCol = this.columns[renderedCol];
    const row = cellIndexFromOffset(ev.clientY - g.gridTop, g.rowH, g.rows);
    g.targetIndex = row * 7 + weekCol;
    this.applyResult(g);
    ev.preventDefault();
  }

  // Move/up are tracked on the document (bound only during a gesture) so the drag survives
  // the live-reflow that recreates the dragged bar's DOM mid-drag — which would void a
  // pointer capture. Manual listeners avoid an idle change-detection storm; we markForCheck.
  private readonly onDocMove = (ev: PointerEvent): void => {
    if (!this.gesture) return;
    this.onGestureMove(ev);
    this.cdr.markForCheck();
  };

  private readonly onDocUp = (): void => {
    const g = this.gesture;
    this.endGesture();
    if (!g || !g.active) return;
    this.justDragged = true;
    this.eventChange.emit({ ...g.event, start: g.newStart, end: g.newEnd });
  };

  private endGesture(): void {
    this.gesture = null;
    document.removeEventListener('pointermove', this.onDocMove);
    document.removeEventListener('pointerup', this.onDocUp);
    this.cdr.markForCheck();
  }

  /** Compute the previewed start/end from the current target (used live + on drop). */
  private applyResult(g: Gesture): void {
    if (g.mode === 'move') {
      const delta = g.targetIndex - g.anchorIndex;
      g.newStart = this.adapter.addDays(g.origStart, delta);
      g.newEnd = this.adapter.addDays(g.origEnd, delta);
    } else if (g.mode === 'resize-end') {
      const idx = clamp(g.targetIndex, g.origStartIndex, g.rows * 7 - 1);
      g.newStart = g.origStart;
      g.newEnd = this.adapter.addDays(g.origEnd, idx - g.origEndIndex);
    } else {
      const idx = clamp(g.targetIndex, 0, g.origEndIndex);
      g.newStart = this.adapter.addDays(g.origStart, idx - g.origStartIndex);
      g.newEnd = g.origEnd;
    }
  }

  onBarClick(domEvent: Event, ev: SchedulerEvent<unknown>): void {
    domEvent.stopPropagation();
    if (this.justDragged) { this.justDragged = false; return; }
    this.eventActivate.emit(ev);
  }

  // ---- “+N more” popover ---------------------------------------------------

  openMore(domEvent: Event, date: unknown): void {
    domEvent.stopPropagation();
    const rect = (domEvent.currentTarget as HTMLElement).getBoundingClientRect();
    const dayStart = this.adapter.startOfDay(date);
    const dayEnd = this.adapter.addDays(dayStart, 1);
    const events = this.events()
      .filter((e) => this.adapter.compare(e.start, dayEnd) < 0 && this.adapter.compare(e.end, dayStart) > 0)
      .slice()
      .sort((a, b) => (a.isAllDay === b.isAllDay
        ? this.adapter.compare(a.start, b.start) : a.isAllDay ? -1 : 1));
    this.popover = { date, events, x: rect.left, y: rect.bottom + 4 };
  }
  onPopItem(ev: SchedulerEvent<unknown>): void {
    this.popover = null;
    this.eventActivate.emit(ev);
  }

  onDocClick(ev: Event): void {
    if (!this.popover) return;
    const t = ev.target as HTMLElement;
    if (t.closest('.dl-mv__pop') || t.closest('.dl-more')) return;
    this.popover = null;
  }

  onEscape(): void {
    if (this.gesture) this.endGesture();
    this.popover = null;
  }
}
